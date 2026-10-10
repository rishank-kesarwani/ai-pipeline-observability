import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Execution, ExecutionDocument } from '../database/schemas/execution.schema';
import { TraceStep, TraceStepDocument } from '../database/schemas/trace-step.schema';
import { Workflow, WorkflowDocument } from '../database/schemas/workflow.schema';
import { MemoryStoreService } from '../database/memory-store.service';
import { FailuresService } from '../failures/failures.service';
import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { NotificationService } from '../integrations/notification.service';
import {
  CreateExecutionDto,
  IngestTraceStepDto,
  BulkIngestExecutionDto,
  ExecutionFilterDto,
} from './dto/execution.dto';
import {
  ExecutionStatus,
  StepStatus,
  StepType,
  FailureCategory,
} from '../common/types';
import { redactData } from '../common/utils/redaction.util';
import { calculateEstimatedCostUsd } from '../common/utils/pricing.util';

@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name);

  constructor(
    @InjectModel(Execution.name)
    private readonly executionModel: Model<ExecutionDocument>,
    @InjectModel(TraceStep.name)
    private readonly stepModel: Model<TraceStepDocument>,
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    private readonly memoryStore: MemoryStoreService,
    private readonly failuresService: FailuresService,
    private readonly checkpointsService: CheckpointsService,
    private readonly notificationService: NotificationService,
  ) {}

  async createExecution(
    dto: CreateExecutionDto,
    tenantId = 'default',
  ): Promise<Execution> {
    const executionId = dto.executionId || `exec-${uuidv4().substring(0, 8)}`;

    // Redact input payload
    const sanitizedInput = redactData(dto.inputPayload || {});

    // Lookup workflow name if not provided
    let workflowName = dto.workflowName;
    if (!workflowName) {
      try {
        const wf = await this.workflowModel.findOne({ workflowId: dto.workflowId });
        if (wf) workflowName = wf.name;
      } catch {
        const memWf = this.memoryStore.findOne<Workflow>(
          'workflows',
          (w) => w.workflowId === dto.workflowId,
        );
        if (memWf) workflowName = memWf.name;
      }
    }

    const execution: Partial<Execution> = {
      executionId,
      workflowId: dto.workflowId,
      workflowName: workflowName || dto.workflowId,
      project: dto.project || 'default-project',
      tenantId: dto.tenantId || tenantId,
      status: ExecutionStatus.RUNNING,
      initiatedBy: dto.initiatedBy || 'system',
      startTime: new Date(),
      durationMs: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      retryCount: 0,
      isRecovered: false,
      tags: dto.tags || [],
      inputPayload: sanitizedInput,
      outputPayload: {},
      metadata: dto.metadata || {},
    };

    try {
      return await this.executionModel.create(execution);
    } catch {
      return this.memoryStore.insert<Execution>('executions', execution as Execution);
    }
  }

  async ingestStep(
    executionId: string,
    dto: IngestTraceStepDto,
    correlationId?: string,
  ): Promise<TraceStep> {
    const execution = await this.findOneExecution(executionId);
    if (!execution) {
      throw new NotFoundException(`Execution '${executionId}' not found`);
    }

    const stepId = dto.stepId || `stp-${uuidv4().substring(0, 8)}`;

    // Calculate prompt/completion tokens and estimated cost
    const promptTokens = dto.tokens?.promptTokens || 0;
    const completionTokens = dto.tokens?.completionTokens || 0;
    const totalTokens = dto.tokens?.totalTokens || promptTokens + completionTokens;
    const estimatedCostUsd = calculateEstimatedCostUsd(
      dto.model,
      promptTokens,
      completionTokens,
    );

    // Timing calculation
    const startTime = dto.startTime ? new Date(dto.startTime) : new Date();
    const durationMs = dto.durationMs !== undefined ? dto.durationMs : 250;
    const endTime = dto.endTime ? new Date(dto.endTime) : new Date(startTime.getTime() + durationMs);

    // Deep sensitive data redaction
    const sanitizedInput = redactData(dto.inputPayload || {});
    const sanitizedOutput = redactData(dto.outputPayload || {});
    const sanitizedError = dto.errorDetails
      ? {
          message: redactData(dto.errorDetails.message),
          stack: dto.errorDetails.stack ? redactData(dto.errorDetails.stack) : undefined,
          code: dto.errorDetails.code,
          statusCode: dto.errorDetails.statusCode,
        }
      : undefined;

    // Calculate depth based on parentStepKey or parentStepId
    let depth = 0;
    if (dto.parentStepKey || dto.parentStepId) {
      depth = 1;
    }

    const traceStep: Partial<TraceStep> = {
      stepId,
      executionId,
      workflowId: execution.workflowId,
      stepKey: dto.stepKey,
      name: dto.name || dto.stepKey,
      parentStepKey: dto.parentStepKey,
      parentStepId: dto.parentStepId,
      stepOrder: dto.stepOrder ?? 0,
      depth,
      type: dto.type,
      status: dto.status,
      model: dto.model,
      provider: dto.provider,
      isIdempotent: dto.isIdempotent !== false,
      requiresApprovalToReplay: dto.requiresApprovalToReplay === true,
      sideEffectDescription: dto.sideEffectDescription,
      inputPayload: sanitizedInput,
      outputPayload: sanitizedOutput,
      errorDetails: sanitizedError,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd,
      retryCount: dto.retryCount || 0,
      startTime,
      endTime,
      durationMs,
      metadata: dto.metadata || {},
    };

    let savedStep: TraceStep;
    try {
      savedStep = await this.stepModel.create(traceStep);
    } catch {
      savedStep = this.memoryStore.insert<TraceStep>('trace_steps', traceStep as TraceStep);
    }

    // If step failed, run failure forensics and notification
    let failureCategory: FailureCategory | undefined;
    let errorSignature: string | undefined;
    let errorSignatureHash: string | undefined;

    if (dto.status === StepStatus.FAILED) {
      const failureAnalysis = await this.failuresService.classifyAndRecordFailure(
        execution,
        {
          stepKey: dto.stepKey,
          stepId,
          type: dto.type,
          isIdempotent: dto.isIdempotent !== false,
          requiresApprovalToReplay: dto.requiresApprovalToReplay,
          sideEffectDescription: dto.sideEffectDescription,
          errorDetails: sanitizedError,
          inputPayload: sanitizedInput,
        },
        execution.lastValidCheckpointId,
      );

      failureCategory = failureAnalysis.category;
      errorSignature = failureAnalysis.normalizedSignature;
      errorSignatureHash = failureAnalysis.signatureHash;

      // Dispatch alert to Notification Service
      await this.notificationService.sendFailureAlert({
        correlationId: correlationId || `corr-${executionId}`,
        executionId,
        workflowId: execution.workflowId,
        workflowName: execution.workflowName,
        failedStepKey: dto.stepKey,
        errorCategory: failureAnalysis.category,
        errorMessage: sanitizedError?.message || 'Unknown failure',
      });
    }

    // Auto-create checkpoint after successful milestone steps
    if (
      dto.status === StepStatus.COMPLETED &&
      (dto.type === StepType.TOOL_EXECUTION ||
        dto.type === StepType.DATA_TRANSFORM ||
        dto.type === StepType.LLM_CALL)
    ) {
      const allSteps = await this.findStepsForExecution(executionId);
      const completedKeys = allSteps
        .filter((s) => s.status === StepStatus.COMPLETED)
        .map((s) => s.stepKey);

      await this.checkpointsService.createCheckpoint({
        checkpointId: `chk-${executionId}-${dto.stepKey}`,
        executionId,
        workflowId: execution.workflowId,
        stepKey: dto.stepKey,
        stepOrder: dto.stepOrder ?? allSteps.length,
        stateSnapshot: {
          lastStep: dto.stepKey,
          output: sanitizedOutput,
        },
        completedStepKeys: completedKeys,
        isValid: true,
      });
    }

    // Rollup execution metrics
    await this.rollupExecutionMetrics(
      executionId,
      dto.status === StepStatus.FAILED ? ExecutionStatus.FAILED : undefined,
      failureCategory,
      errorSignature,
      errorSignatureHash,
    );

    return savedStep;
  }

  async bulkIngest(
    dto: BulkIngestExecutionDto,
    correlationId?: string,
  ): Promise<{ execution: Execution; steps: TraceStep[] }> {
    const execution = await this.createExecution(dto.execution, dto.execution.tenantId);
    const steps: TraceStep[] = [];

    let hasFailedStep = false;
    let lastFailureCategory: FailureCategory | undefined;
    let lastErrorSig: string | undefined;
    let lastErrorHash: string | undefined;

    for (let i = 0; i < dto.steps.length; i++) {
      const stepDto = dto.steps[i];
      stepDto.stepOrder = stepDto.stepOrder ?? i + 1;
      const step = await this.ingestStep(execution.executionId, stepDto, correlationId);
      steps.push(step);

      if (step.status === StepStatus.FAILED) {
        hasFailedStep = true;
        lastFailureCategory = step.errorDetails?.category as any;
      }
    }

    const finalStatus =
      dto.status ||
      (hasFailedStep ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED);

    await this.updateExecution(execution.executionId, {
      status: finalStatus,
      endTime: new Date(),
      outputPayload: redactData(dto.outputPayload || {}),
    });

    const updatedExecution = await this.findOneExecution(execution.executionId);
    return { execution: updatedExecution!, steps };
  }

  async findAll(filter: ExecutionFilterDto) {
    const limit = filter.limit ? Number(filter.limit) : 20;
    const offset = filter.offset ? Number(filter.offset) : 0;

    try {
      const query: any = {};
      if (filter.project) query.project = filter.project;
      if (filter.workflowId) query.workflowId = filter.workflowId;
      if (filter.status) query.status = filter.status;
      if (filter.failureCategory) query.failureCategory = filter.failureCategory;
      if (filter.minLatencyMs) query.durationMs = { $gte: filter.minLatencyMs };
      if (filter.maxLatencyMs) {
        query.durationMs = { ...(query.durationMs || {}), $lte: filter.maxLatencyMs };
      }
      if (filter.search) {
        query.$or = [
          { workflowName: { $regex: filter.search, $options: 'i' } },
          { executionId: { $regex: filter.search, $options: 'i' } },
          { errorSignature: { $regex: filter.search, $options: 'i' } },
        ];
      }

      const [items, total] = await Promise.all([
        this.executionModel
          .find(query)
          .sort({ startTime: -1 })
          .skip(offset)
          .limit(limit),
        this.executionModel.countDocuments(query),
      ]);

      if (items && items.length > 0) {
        return { items, total, limit, offset };
      }
    } catch {
      // Memory fallback
    }

    // Memory Store search & filter
    const all = this.memoryStore.find<Execution>(
      'executions',
      (e) => {
        if (filter.project && e.project !== filter.project) return false;
        if (filter.workflowId && e.workflowId !== filter.workflowId) return false;
        if (filter.status && e.status !== filter.status) return false;
        if (filter.failureCategory && e.failureCategory !== filter.failureCategory) return false;
        if (filter.minLatencyMs && (e.durationMs || 0) < filter.minLatencyMs) return false;
        if (filter.maxLatencyMs && (e.durationMs || 0) > filter.maxLatencyMs) return false;
        if (filter.search) {
          const q = filter.search.toLowerCase();
          const matchName = (e.workflowName || '').toLowerCase().includes(q);
          const matchId = (e.executionId || '').toLowerCase().includes(q);
          const matchErr = (e.errorSignature || '').toLowerCase().includes(q);
          if (!matchName && !matchId && !matchErr) return false;
        }
        return true;
      },
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

    const paginated = all.slice(offset, offset + limit);
    return { items: paginated, total: all.length, limit, offset };
  }

  async findOne(executionId: string) {
    const execution = await this.findOneExecution(executionId);
    if (!execution) {
      throw new NotFoundException(`Execution '${executionId}' not found`);
    }

    const steps = await this.findStepsForExecution(executionId);
    const checkpoints = await this.checkpointsService.getCheckpoints(executionId);
    const recoveries = await this.checkpointsService.getRecoveries(executionId);

    // Lookup cluster forensics if execution failed
    let cluster = null;
    if (execution.errorSignatureHash) {
      cluster = await this.failuresService.getClusterByHash(execution.errorSignatureHash);
    }

    return {
      execution,
      steps,
      checkpoints,
      recoveries,
      cluster,
    };
  }

  async getTimeline(executionId: string) {
    const { execution, steps } = await this.findOne(executionId);
    const stepMap = new Map<string, any>();

    // Build step tree with parent-child links
    steps.forEach((step) => {
      stepMap.set(step.stepKey, {
        ...((step as any).toObject ? (step as any).toObject() : step),
        children: [],
      });
    });

    const rootNodes: any[] = [];
    steps.forEach((step) => {
      const node = stepMap.get(step.stepKey);
      if (step.parentStepKey && stepMap.has(step.parentStepKey)) {
        stepMap.get(step.parentStepKey).children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return {
      executionId,
      workflowId: execution.workflowId,
      status: execution.status,
      totalDurationMs: execution.durationMs,
      totalCostUsd: execution.estimatedCostUsd,
      totalTokens: execution.totalTokens,
      stepTree: rootNodes,
      stepsList: steps,
    };
  }

  private async findOneExecution(executionId: string): Promise<Execution | null> {
    try {
      const found = await this.executionModel.findOne({ executionId });
      if (found) return found;
    } catch {
      // Fallback
    }
    return this.memoryStore.findOne<Execution>('executions', (e) => e.executionId === executionId);
  }

  private async findStepsForExecution(executionId: string): Promise<TraceStep[]> {
    try {
      const steps = await this.stepModel.find({ executionId }).sort({ stepOrder: 1 });
      if (steps && steps.length > 0) return steps;
    } catch {
      // Fallback
    }
    return this.memoryStore.find<TraceStep>(
      'trace_steps',
      (s) => s.executionId === executionId,
      (a, b) => (a.stepOrder || 0) - (b.stepOrder || 0),
    );
  }

  private async updateExecution(
    executionId: string,
    update: Partial<Execution>,
  ): Promise<void> {
    try {
      await this.executionModel.updateOne({ executionId }, { $set: update });
    } catch {
      this.memoryStore.updateOne('executions', (e) => e.executionId === executionId, update);
    }
  }

  private async rollupExecutionMetrics(
    executionId: string,
    statusOverride?: ExecutionStatus,
    failureCategory?: FailureCategory,
    errorSignature?: string,
    errorSignatureHash?: string,
  ): Promise<void> {
    const steps = await this.findStepsForExecution(executionId);

    const totalDuration = steps.reduce((acc, s) => acc + (s.durationMs || 0), 0);
    const totalPrompt = steps.reduce((acc, s) => acc + (s.promptTokens || 0), 0);
    const totalCompletion = steps.reduce((acc, s) => acc + (s.completionTokens || 0), 0);
    const totalTokens = totalPrompt + totalCompletion;
    const totalCost = steps.reduce((acc, s) => acc + (s.estimatedCostUsd || 0), 0);
    const totalRetries = steps.reduce((acc, s) => acc + (s.retryCount || 0), 0);

    const update: Partial<Execution> = {
      durationMs: totalDuration,
      totalPromptTokens: totalPrompt,
      totalCompletionTokens: totalCompletion,
      totalTokens,
      estimatedCostUsd: Math.round(totalCost * 1_000_000) / 1_000_000,
      retryCount: totalRetries,
    };

    if (statusOverride) {
      update.status = statusOverride;
      update.endTime = new Date();
    }
    if (failureCategory) update.failureCategory = failureCategory;
    if (errorSignature) update.errorSignature = errorSignature;
    if (errorSignatureHash) update.errorSignatureHash = errorSignatureHash;

    await this.updateExecution(executionId, update);
  }
}
