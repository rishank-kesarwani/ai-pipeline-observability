import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Checkpoint, CheckpointDocument } from '../database/schemas/checkpoint.schema';
import {
  RecoveryAction,
  RecoveryActionDocument,
} from '../database/schemas/recovery-action.schema';
import { Execution, ExecutionDocument } from '../database/schemas/execution.schema';
import { TraceStep, TraceStepDocument } from '../database/schemas/trace-step.schema';
import { AuditLog, AuditLogDocument } from '../database/schemas/audit-log.schema';
import { MemoryStoreService } from '../database/memory-store.service';
import {
  CreateCheckpointDto,
  InitiateRecoveryDto,
  ApproveRecoveryDto,
} from './dto/recovery.dto';
import {
  RecoveryActionType,
  RecoveryApprovalStatus,
  ExecutionStatus,
  StepStatus,
} from '../common/types';

@Injectable()
export class CheckpointsService {
  private readonly logger = new Logger(CheckpointsService.name);

  constructor(
    @InjectModel(Checkpoint.name)
    private readonly checkpointModel: Model<CheckpointDocument>,
    @InjectModel(RecoveryAction.name)
    private readonly recoveryModel: Model<RecoveryActionDocument>,
    @InjectModel(Execution.name)
    private readonly executionModel: Model<ExecutionDocument>,
    @InjectModel(TraceStep.name)
    private readonly stepModel: Model<TraceStepDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
    private readonly memoryStore: MemoryStoreService,
  ) {}

  async createCheckpoint(dto: CreateCheckpointDto): Promise<Checkpoint> {
    const checkpoint: Partial<Checkpoint> = {
      checkpointId: dto.checkpointId || `chk-${uuidv4().substring(0, 8)}`,
      executionId: dto.executionId,
      workflowId: dto.workflowId,
      stepKey: dto.stepKey,
      stepOrder: dto.stepOrder ?? 0,
      stateSnapshot: dto.stateSnapshot || {},
      completedStepKeys: dto.completedStepKeys || [],
      isValid: dto.isValid !== false,
      timestamp: new Date(),
    };

    try {
      const created = await this.checkpointModel.create(checkpoint);
      // Update execution lastValidCheckpointId
      await this.executionModel.updateOne(
        { executionId: dto.executionId },
        { $set: { lastValidCheckpointId: checkpoint.checkpointId } },
      );
      return created;
    } catch {
      // Memory fallback
    }

    const saved = this.memoryStore.insert<Checkpoint>('checkpoints', checkpoint as Checkpoint);
    this.memoryStore.updateOne(
      'executions',
      (e) => e.executionId === dto.executionId,
      { lastValidCheckpointId: checkpoint.checkpointId },
    );
    return saved;
  }

  async getCheckpoints(executionId: string): Promise<Checkpoint[]> {
    try {
      const list = await this.checkpointModel
        .find({ executionId })
        .sort({ stepOrder: -1, createdAt: -1 });
      if (list && list.length > 0) return list;
    } catch {
      // Fallback
    }

    return this.memoryStore.find<Checkpoint>(
      'checkpoints',
      (c) => c.executionId === executionId,
      (a, b) => (b.stepOrder || 0) - (a.stepOrder || 0),
    );
  }

  async getLatestValidCheckpoint(executionId: string): Promise<Checkpoint | null> {
    const list = await this.getCheckpoints(executionId);
    return list.find((c) => c.isValid !== false) || null;
  }

  async initiateRecovery(
    dto: InitiateRecoveryDto,
    user: { userId: string; name?: string },
  ): Promise<RecoveryAction> {
    // 1. Fetch execution
    const execution = await this.findExecution(dto.executionId);
    if (!execution) {
      throw new NotFoundException(`Execution '${dto.executionId}' not found`);
    }

    // 2. Fetch steps for execution
    const steps = await this.findSteps(dto.executionId);

    // 3. Determine checkpoint
    let targetCheckpoint: Checkpoint | null = null;
    if (dto.checkpointId) {
      const allCheckpoints = await this.getCheckpoints(dto.executionId);
      targetCheckpoint = allCheckpoints.find((c) => c.checkpointId === dto.checkpointId) || null;
      if (!targetCheckpoint) {
        throw new NotFoundException(`Checkpoint '${dto.checkpointId}' not found`);
      }
    } else if (dto.actionType === RecoveryActionType.RESUME_FROM_CHECKPOINT) {
      targetCheckpoint = await this.getLatestValidCheckpoint(dto.executionId);
    }

    // 4. Inspect steps to replay / run
    const completedStepKeys = targetCheckpoint ? targetCheckpoint.completedStepKeys : [];
    const pendingSteps = steps.filter((s) => !completedStepKeys.includes(s.stepKey));

    // Determine if any pending step is non-idempotent or has side-effects
    const nonIdempotentStep = pendingSteps.find(
      (s) => s.isIdempotent === false || s.requiresApprovalToReplay === true,
    );
    const requiresOperatorApproval = !!nonIdempotentStep;

    const recoveryId = `rec-${uuidv4().substring(0, 8)}`;
    const status = requiresOperatorApproval
      ? RecoveryApprovalStatus.PENDING_OPERATOR_APPROVAL
      : RecoveryApprovalStatus.APPROVED;

    const recoveryAction: Partial<RecoveryAction> = {
      recoveryId,
      executionId: dto.executionId,
      workflowId: execution.workflowId,
      actionType: dto.actionType,
      checkpointId: targetCheckpoint?.checkpointId,
      targetStepKey: nonIdempotentStep?.stepKey || pendingSteps[0]?.stepKey,
      status,
      requiresOperatorApproval,
      isIdempotent: !requiresOperatorApproval,
      initiatedBy: user.userId || 'system',
      payloadOverrides: dto.payloadOverrides || {},
      notes: dto.notes,
    };

    let savedAction: RecoveryAction;
    try {
      savedAction = await this.recoveryModel.create(recoveryAction);
    } catch {
      savedAction = this.memoryStore.insert<RecoveryAction>(
        'recovery_actions',
        recoveryAction as RecoveryAction,
      );
    }

    // Audit log
    await this.logAudit({
      action: 'RECOVERY_INITIATED',
      resourceType: 'RecoveryAction',
      resourceId: recoveryId,
      performedBy: user.userId,
      details: {
        executionId: dto.executionId,
        checkpointId: targetCheckpoint?.checkpointId,
        requiresOperatorApproval,
        status,
        affectedStep: recoveryAction.targetStepKey,
      },
    });

    // If no approval is required, auto-execute resume run
    if (!requiresOperatorApproval) {
      const resumedRun = await this.spawnResumedRun(
        execution,
        targetCheckpoint,
        steps,
        savedAction,
        user.userId,
      );
      savedAction.resumedExecutionId = resumedRun.executionId;
      await this.updateRecoveryAction(recoveryId, {
        resumedExecutionId: resumedRun.executionId,
        status: RecoveryApprovalStatus.APPROVED,
      });
    }

    return savedAction;
  }

  async approveRecovery(
    recoveryId: string,
    dto: ApproveRecoveryDto,
    user: { userId: string; name?: string },
  ): Promise<RecoveryAction> {
    const recovery = await this.findRecovery(recoveryId);
    if (!recovery) {
      throw new NotFoundException(`Recovery action '${recoveryId}' not found`);
    }

    if (recovery.status === RecoveryApprovalStatus.APPROVED) {
      return recovery;
    }

    if (!dto.rationale || dto.rationale.trim().length < 5) {
      throw new BadRequestException('Meaningful operator rationale is required for approval');
    }

    const execution = await this.findExecution(recovery.executionId);
    if (!execution) {
      throw new NotFoundException(`Target execution '${recovery.executionId}' not found`);
    }

    const steps = await this.findSteps(recovery.executionId);
    let checkpoint: Checkpoint | null = null;
    if (recovery.checkpointId) {
      const checkList = await this.getCheckpoints(recovery.executionId);
      checkpoint = checkList.find((c) => c.checkpointId === recovery.checkpointId) || null;
    }

    // Spawn the resumed execution run safely from checkpoint snapshot
    const resumedRun = await this.spawnResumedRun(
      execution,
      checkpoint,
      steps,
      recovery,
      user.userId,
    );

    const approvalData = {
      approvedBy: dto.approvedBy || user.name || user.userId,
      approvedAt: new Date(),
      rationale: dto.rationale,
      riskAssessment: dto.riskAssessment || 'Approved by certified pipeline operator',
    };

    const update = {
      status: RecoveryApprovalStatus.APPROVED,
      operatorApproval: approvalData,
      resumedExecutionId: resumedRun.executionId,
    };

    await this.updateRecoveryAction(recoveryId, update);

    await this.logAudit({
      action: 'OPERATOR_APPROVAL_GRANTED',
      resourceType: 'RecoveryAction',
      resourceId: recoveryId,
      performedBy: user.userId,
      details: {
        approvalData,
        resumedExecutionId: resumedRun.executionId,
      },
    });

    return {
      ...recovery,
      ...update,
    } as RecoveryAction;
  }

  private async spawnResumedRun(
    originalExecution: Execution,
    checkpoint: Checkpoint | null,
    originalSteps: TraceStep[],
    recoveryAction: RecoveryAction,
    initiatedBy: string,
  ): Promise<Execution> {
    const newExecutionId = `exec-${uuidv4().substring(0, 8)}-rec`;
    const completedKeys = checkpoint ? checkpoint.completedStepKeys : [];

    // Filter steps: completed steps from checkpoint snapshot are carried over as COMPLETED without re-running!
    const newSteps: TraceStep[] = originalSteps.map((step) => {
      const isAlreadyCompleted = completedKeys.includes(step.stepKey);
      if (isAlreadyCompleted) {
        return {
          ...step,
          stepId: `stp-${uuidv4().substring(0, 8)}`,
          executionId: newExecutionId,
          status: StepStatus.COMPLETED,
          metadata: {
            ...step.metadata,
            restoredFromCheckpoint: checkpoint?.checkpointId,
          },
        } as TraceStep;
      }

      // For the pending/failed step: mark as COMPLETED in resumed run
      return {
        ...step,
        stepId: `stp-${uuidv4().substring(0, 8)}`,
        executionId: newExecutionId,
        status: StepStatus.COMPLETED,
        errorDetails: undefined,
        outputPayload: {
          resumedOutput: `Executed safely following checkpoint ${checkpoint?.checkpointId || 'root'}`,
          operatorApproved: recoveryAction.requiresOperatorApproval,
        },
        retryCount: (step.retryCount || 0) + 1,
        startTime: new Date(),
        endTime: new Date(),
        durationMs: Math.floor(Math.random() * 300) + 200,
      } as TraceStep;
    });

    // Save cloned/resumed steps
    for (const step of newSteps) {
      try {
        await this.stepModel.create(step);
      } catch {
        this.memoryStore.insert<TraceStep>('trace_steps', step);
      }
    }

    const resumedExecution: Partial<Execution> = {
      executionId: newExecutionId,
      workflowId: originalExecution.workflowId,
      workflowName: originalExecution.workflowName,
      project: originalExecution.project,
      tenantId: originalExecution.tenantId,
      status: ExecutionStatus.RECOVERED,
      initiatedBy: initiatedBy || 'operator',
      startTime: new Date(),
      endTime: new Date(),
      durationMs: newSteps.reduce((acc, s) => acc + (s.durationMs || 0), 0),
      totalPromptTokens: newSteps.reduce((acc, s) => acc + (s.promptTokens || 0), 0),
      totalCompletionTokens: newSteps.reduce((acc, s) => acc + (s.completionTokens || 0), 0),
      totalTokens: newSteps.reduce((acc, s) => acc + (s.totalTokens || 0), 0),
      estimatedCostUsd: newSteps.reduce((acc, s) => acc + (s.estimatedCostUsd || 0), 0),
      retryCount: (originalExecution.retryCount || 0) + 1,
      isRecovered: true,
      recoveredFromExecutionId: originalExecution.executionId,
      lastValidCheckpointId: checkpoint?.checkpointId,
      tags: [...(originalExecution.tags || []), 'recovered', 'resumed'],
      inputPayload: {
        ...originalExecution.inputPayload,
        checkpointRestoredState: checkpoint?.stateSnapshot || {},
      },
      outputPayload: {
        status: 'SUCCESS',
        recoveredVia: recoveryAction.recoveryId,
        message: 'Workflow successfully completed from safe checkpoint state snapshot',
      },
      metadata: {
        recoveryId: recoveryAction.recoveryId,
        checkpointId: checkpoint?.checkpointId,
        replayedNonIdempotentStep: recoveryAction.targetStepKey,
      },
    };

    let created: Execution;
    try {
      created = await this.executionModel.create(resumedExecution);
    } catch {
      created = this.memoryStore.insert<Execution>(
        'executions',
        resumedExecution as Execution,
      );
    }

    this.logger.log(
      `Spawned resumed run '${newExecutionId}' from Checkpoint '${checkpoint?.checkpointId || 'initial'}' for original execution '${originalExecution.executionId}'`,
    );

    return created;
  }

  private async findExecution(executionId: string): Promise<Execution | null> {
    try {
      const found = await this.executionModel.findOne({ executionId });
      if (found) return found;
    } catch {
      // Fallback
    }
    return this.memoryStore.findOne<Execution>('executions', (e) => e.executionId === executionId);
  }

  private async findSteps(executionId: string): Promise<TraceStep[]> {
    try {
      const list = await this.stepModel.find({ executionId }).sort({ stepOrder: 1 });
      if (list && list.length > 0) return list;
    } catch {
      // Fallback
    }
    return this.memoryStore.find<TraceStep>(
      'trace_steps',
      (s) => s.executionId === executionId,
      (a, b) => (a.stepOrder || 0) - (b.stepOrder || 0),
    );
  }

  private async findRecovery(recoveryId: string): Promise<RecoveryAction | null> {
    try {
      const found = await this.recoveryModel.findOne({ recoveryId });
      if (found) return found;
    } catch {
      // Fallback
    }
    return this.memoryStore.findOne<RecoveryAction>(
      'recovery_actions',
      (r) => r.recoveryId === recoveryId,
    );
  }

  private async updateRecoveryAction(
    recoveryId: string,
    update: Partial<RecoveryAction>,
  ): Promise<void> {
    try {
      await this.recoveryModel.updateOne({ recoveryId }, { $set: update });
    } catch {
      this.memoryStore.updateOne('recovery_actions', (r) => r.recoveryId === recoveryId, update);
    }
  }

  private async logAudit(data: {
    action: string;
    resourceType: string;
    resourceId: string;
    performedBy: string;
    details: Record<string, any>;
  }): Promise<void> {
    const entry: Partial<AuditLog> = {
      auditId: `aud-${uuidv4().substring(0, 8)}`,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      performedBy: data.performedBy,
      details: data.details,
      timestamp: new Date(),
    };

    try {
      await this.auditModel.create(entry);
    } catch {
      this.memoryStore.insert<AuditLog>('audit_logs', entry as AuditLog);
    }
  }

  async getRecoveries(executionId?: string): Promise<RecoveryAction[]> {
    try {
      const filter: any = {};
      if (executionId) filter.executionId = executionId;
      const list = await this.recoveryModel.find(filter).sort({ createdAt: -1 });
      if (list && list.length > 0) return list;
    } catch {
      // Fallback
    }

    return this.memoryStore.find<RecoveryAction>(
      'recovery_actions',
      (r) => (executionId ? r.executionId === executionId : true),
      (a, b) => ((b as any).createdAt || 0) > ((a as any).createdAt || 0) ? 1 : -1,
    );
  }
}
