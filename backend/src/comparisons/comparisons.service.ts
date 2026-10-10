import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Execution, ExecutionDocument } from '../database/schemas/execution.schema';
import { TraceStep, TraceStepDocument } from '../database/schemas/trace-step.schema';
import { MemoryStoreService } from '../database/memory-store.service';

export interface StepComparisonItem {
  stepKey: string;
  name: string;
  type: string;
  baseStatus?: string;
  targetStatus?: string;
  isDivergencePoint: boolean;
  baseDurationMs?: number;
  targetDurationMs?: number;
  durationDeltaMs?: number;
  baseTokens?: number;
  targetTokens?: number;
  tokenDelta?: number;
  baseCostUsd?: number;
  targetCostUsd?: number;
  costDeltaUsd?: number;
  inputDriftDetected: boolean;
  baseError?: string;
  targetError?: string;
}

export interface RunComparisonResult {
  baseExecution: Partial<Execution>;
  targetExecution: Partial<Execution>;
  divergencePoint?: {
    stepKey: string;
    reason: string;
  };
  metricsDelta: {
    durationDeltaMs: number;
    tokenDelta: number;
    costDeltaUsd: number;
    successDiff: boolean;
  };
  stepComparisons: StepComparisonItem[];
}

@Injectable()
export class ComparisonsService {
  constructor(
    @InjectModel(Execution.name)
    private readonly executionModel: Model<ExecutionDocument>,
    @InjectModel(TraceStep.name)
    private readonly stepModel: Model<TraceStepDocument>,
    private readonly memoryStore: MemoryStoreService,
  ) {}

  async compareRuns(baseRunId: string, targetRunId: string, user?: any): Promise<RunComparisonResult> {
    const [baseExecution, targetExecution] = await Promise.all([
      this.findExecution(baseRunId),
      this.findExecution(targetRunId),
    ]);

    if (!baseExecution) {
      throw new NotFoundException(`Base execution '${baseRunId}' not found`);
    }
    if (!targetExecution) {
      throw new NotFoundException(`Target execution '${targetRunId}' not found`);
    }

    const baseTenant = baseExecution.tenantId || 'default';
    const targetTenant = targetExecution.tenantId || 'default';

    if (!user || user.isAnonymous) {
      if (baseTenant !== 'default' || targetTenant !== 'default') {
        throw new ForbiddenException(
          'Anonymous visitors are restricted to comparing public demo executions. Please sign in.',
        );
      }
    } else if (!user.roles?.includes('admin') && !user.roles?.includes('operator')) {
      if (
        (baseTenant !== user.tenantId && baseTenant !== 'default') ||
        (targetTenant !== user.tenantId && targetTenant !== 'default')
      ) {
        throw new ForbiddenException('Access denied to compare private tenant executions');
      }
    }

    const [baseSteps, targetSteps] = await Promise.all([
      this.findSteps(baseRunId),
      this.findSteps(targetRunId),
    ]);

    const baseStepMap = new Map<string, TraceStep>();
    baseSteps.forEach((s) => baseStepMap.set(s.stepKey, s));

    const targetStepMap = new Map<string, TraceStep>();
    targetSteps.forEach((s) => targetStepMap.set(s.stepKey, s));

    const allStepKeys = Array.from(
      new Set([...baseSteps.map((s) => s.stepKey), ...targetSteps.map((s) => s.stepKey)]),
    );

    const stepComparisons: StepComparisonItem[] = [];
    let divergencePoint: { stepKey: string; reason: string } | undefined;

    for (const stepKey of allStepKeys) {
      const baseStep = baseStepMap.get(stepKey);
      const targetStep = targetStepMap.get(stepKey);

      const isStatusDiff =
        baseStep && targetStep && baseStep.status !== targetStep.status;
      const isMissingInOne = !baseStep || !targetStep;

      let isDivergent = false;
      if (!divergencePoint && (isStatusDiff || isMissingInOne)) {
        isDivergent = true;
        divergencePoint = {
          stepKey,
          reason: isStatusDiff
            ? `Status diverged: Base was '${baseStep?.status}', Target became '${targetStep?.status}'`
            : !targetStep
            ? `Step was skipped in target execution`
            : `Step only executed in target run`,
        };
      }

      // Check input drift
      const baseInputJson = JSON.stringify(baseStep?.inputPayload || {});
      const targetInputJson = JSON.stringify(targetStep?.inputPayload || {});
      const inputDrift = baseInputJson !== targetInputJson;

      const baseDur = baseStep?.durationMs ?? 0;
      const targetDur = targetStep?.durationMs ?? 0;
      const baseTok = baseStep?.totalTokens ?? 0;
      const targetTok = targetStep?.totalTokens ?? 0;
      const baseCost = baseStep?.estimatedCostUsd ?? 0;
      const targetCost = targetStep?.estimatedCostUsd ?? 0;

      stepComparisons.push({
        stepKey,
        name: targetStep?.name || baseStep?.name || stepKey,
        type: targetStep?.type || baseStep?.type || 'LLM_CALL',
        baseStatus: baseStep?.status,
        targetStatus: targetStep?.status,
        isDivergencePoint: isDivergent,
        baseDurationMs: baseDur,
        targetDurationMs: targetDur,
        durationDeltaMs: targetDur - baseDur,
        baseTokens: baseTok,
        targetTokens: targetTok,
        tokenDelta: targetTok - baseTok,
        baseCostUsd: baseCost,
        targetCostUsd: targetCost,
        costDeltaUsd: Math.round((targetCost - baseCost) * 1_000_000) / 1_000_000,
        inputDriftDetected: inputDrift,
        baseError: baseStep?.errorDetails?.message,
        targetError: targetStep?.errorDetails?.message,
      });
    }

    return {
      baseExecution,
      targetExecution,
      divergencePoint,
      metricsDelta: {
        durationDeltaMs: (targetExecution.durationMs || 0) - (baseExecution.durationMs || 0),
        tokenDelta: (targetExecution.totalTokens || 0) - (baseExecution.totalTokens || 0),
        costDeltaUsd:
          Math.round(
            ((targetExecution.estimatedCostUsd || 0) - (baseExecution.estimatedCostUsd || 0)) *
              1_000_000,
          ) / 1_000_000,
        successDiff: baseExecution.status !== targetExecution.status,
      },
      stepComparisons,
    };
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
}
