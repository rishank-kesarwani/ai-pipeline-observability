import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  FailureCluster,
  FailureClusterDocument,
} from '../database/schemas/failure-cluster.schema';
import { MemoryStoreService } from '../database/memory-store.service';
import {
  FailureCategory,
  CulpritType,
  RootCauseHypothesis,
  RecoveryRecommendation,
  RecoveryActionType,
  TraceEvidenceItem,
} from '../common/types';
import {
  normalizeErrorMessage,
  generateErrorSignatureHash,
  classifyFailure,
} from '../common/utils/error-normalizer.util';

@Injectable()
export class FailuresService {
  private readonly logger = new Logger(FailuresService.name);

  constructor(
    @InjectModel(FailureCluster.name)
    private readonly clusterModel: Model<FailureClusterDocument>,
    private readonly memoryStore: MemoryStoreService,
  ) {}

  async classifyAndRecordFailure(
    execution: {
      executionId: string;
      workflowId: string;
      workflowName?: string;
    },
    failedStep: {
      stepKey: string;
      stepId?: string;
      type: string;
      isIdempotent: boolean;
      requiresApprovalToReplay?: boolean;
      sideEffectDescription?: string;
      errorDetails?: { message: string; statusCode?: number; code?: string };
      inputPayload?: Record<string, any>;
      timestamp?: Date | string;
    },
    lastValidCheckpointId?: string,
  ): Promise<{
    category: FailureCategory;
    signatureHash: string;
    normalizedSignature: string;
    hypothesis: RootCauseHypothesis;
    recommendation: RecoveryRecommendation;
  }> {
    const rawMessage = failedStep.errorDetails?.message || 'Unknown step failure';
    const statusCode = failedStep.errorDetails?.statusCode;
    const category = classifyFailure(rawMessage, statusCode, failedStep.type);
    const normalizedSignature = normalizeErrorMessage(rawMessage);
    const signatureHash = generateErrorSignatureHash(category, normalizedSignature);

    // Build evidence citations directly from execution trace event
    const evidenceItems: TraceEvidenceItem[] = [
      {
        stepKey: failedStep.stepKey,
        stepId: failedStep.stepId,
        timestamp: new Date().toISOString(),
        observation: `Step '${failedStep.stepKey}' [${failedStep.type}] failed with: "${rawMessage.slice(0, 180)}"`,
        culpritType: this.mapCategoryToCulprit(category),
        rawIndicator: failedStep.errorDetails?.code || `status_${statusCode || 'ERR'}`,
      },
    ];

    // Hypothesis generation
    const hypothesis: RootCauseHypothesis = {
      hypothesisId: `hyp-${uuidv4().substring(0, 8)}`,
      category,
      statement: this.generateHypothesisStatement(category, failedStep.stepKey, rawMessage),
      confidence: this.calculateHypothesisConfidence(category, failedStep.errorDetails),
      isProven: false, // Core requirement: never claim AI-generated root cause is proven without evidence
      evidence: evidenceItems,
      mitigation: this.generateMitigationAdvice(category, failedStep),
    };

    // Recovery recommendation
    const isIdempotent = failedStep.isIdempotent !== false;
    const requiresApproval =
      !isIdempotent || failedStep.requiresApprovalToReplay === true;

    const recommendation: RecoveryRecommendation = {
      recommendationId: `rec-${uuidv4().substring(0, 8)}`,
      actionType: lastValidCheckpointId
        ? RecoveryActionType.RESUME_FROM_CHECKPOINT
        : isIdempotent
        ? RecoveryActionType.RETRY_FAILED_STEP
        : RecoveryActionType.MANUAL_INTERVENTION_REQUIRED,
      targetCheckpointId: lastValidCheckpointId,
      targetStepKey: failedStep.stepKey,
      confidence: lastValidCheckpointId ? 0.94 : 0.82,
      explanation: this.generateRecoveryExplanation(
        failedStep,
        lastValidCheckpointId,
        requiresApproval,
      ),
      requiresOperatorApproval: requiresApproval,
      approvalReason: requiresApproval
        ? `Step '${failedStep.stepKey}' has external side-effects (${failedStep.sideEffectDescription || 'non-idempotent external write'}). Operator approval is strictly required before replaying.`
        : undefined,
      isIdempotent,
    };

    // Upsert or update cluster
    await this.recordCluster(
      signatureHash,
      normalizedSignature,
      category,
      execution.executionId,
      execution.workflowId,
      hypothesis,
      recommendation,
    );

    return {
      category,
      signatureHash,
      normalizedSignature,
      hypothesis,
      recommendation,
    };
  }

  private mapCategoryToCulprit(category: FailureCategory): CulpritType {
    switch (category) {
      case FailureCategory.TIMEOUT:
        return CulpritType.TIMEOUT;
      case FailureCategory.POLICY_DENIAL:
        return CulpritType.GUARDRAIL_TRIGGER;
      case FailureCategory.SCHEMA_FAILURE:
        return CulpritType.SCHEMA_MISMATCH;
      case FailureCategory.RETRIEVAL_FAILURE:
        return CulpritType.DEPENDENCY_OUTAGE;
      case FailureCategory.TOOL_FAILURE:
        return CulpritType.UNHANDLED_EXCEPTION;
      case FailureCategory.MODEL_FAILURE:
        return CulpritType.RATE_LIMIT;
      default:
        return CulpritType.UNHANDLED_EXCEPTION;
    }
  }

  private generateHypothesisStatement(
    category: FailureCategory,
    stepKey: string,
    message: string,
  ): string {
    switch (category) {
      case FailureCategory.TIMEOUT:
        return `Step '${stepKey}' exceeded allocated execution deadline. Likely caused by network latency or downstream service stall.`;
      case FailureCategory.SCHEMA_FAILURE:
        return `Output from step '${stepKey}' did not conform to expected schema. Model output parsing or function calling argument contract failed.`;
      case FailureCategory.POLICY_DENIAL:
        return `Safety guardrail or tenant policy was triggered during step '${stepKey}'. Input or output violated moderation constraints.`;
      case FailureCategory.RETRIEVAL_FAILURE:
        return `Knowledge retrieval failed at step '${stepKey}'. Vector index query returned 0 documents or similarity threshold breached.`;
      case FailureCategory.TOOL_FAILURE:
        return `External tool or API dependency failed during execution of '${stepKey}'. Downstream service responded with error or unhandled payload.`;
      case FailureCategory.MODEL_FAILURE:
        return `Provider model invocation failed for '${stepKey}'. Possible rate limit exhaustion, quota breach, or upstream provider 5xx.`;
      default:
        return `Uncategorized execution anomaly occurred at step '${stepKey}': ${message.slice(0, 100)}`;
    }
  }

  private calculateHypothesisConfidence(
    category: FailureCategory,
    errorDetails?: { statusCode?: number; code?: string },
  ): number {
    if (errorDetails?.statusCode === 408 || errorDetails?.statusCode === 504) return 0.98;
    if (errorDetails?.statusCode === 429) return 0.99;
    if (errorDetails?.statusCode === 403) return 0.95;
    if (category === FailureCategory.SCHEMA_FAILURE) return 0.94;
    if (category === FailureCategory.TOOL_FAILURE) return 0.91;
    if (category === FailureCategory.RETRIEVAL_FAILURE) return 0.89;
    return 0.78;
  }

  private generateMitigationAdvice(
    category: FailureCategory,
    failedStep: { stepKey: string; isIdempotent: boolean },
  ): string {
    switch (category) {
      case FailureCategory.TIMEOUT:
        return 'Increase step timeout limit or configure async polling for long-running downstream invocations.';
      case FailureCategory.SCHEMA_FAILURE:
        return 'Enforce strict JSON schema in LLM system prompt and inject fallback default output parser.';
      case FailureCategory.POLICY_DENIAL:
        return 'Review prompt safety filters or apply input sanitization before passing user payload to model.';
      case FailureCategory.RETRIEVAL_FAILURE:
        return 'Verify vector index health and lower topK similarity threshold fallback.';
      case FailureCategory.TOOL_FAILURE:
        return failedStep.isIdempotent
          ? 'Step is idempotent; retry with exponential backoff or inspect external API health.'
          : 'Step has external side-effects; request operator review before re-dispatching tool.';
      case FailureCategory.MODEL_FAILURE:
        return 'Enable provider fallback (e.g. Gemini 1.5 Pro -> Gemini 1.5 Flash) or increase backoff jitter.';
      default:
        return 'Inspect raw step input and stack trace forensics for root-cause diagnosis.';
    }
  }

  private generateRecoveryExplanation(
    step: { stepKey: string; isIdempotent: boolean; sideEffectDescription?: string },
    checkpointId?: string,
    requiresApproval?: boolean,
  ): string {
    if (checkpointId && requiresApproval) {
      return `Resume workflow from Checkpoint '${checkpointId}'. Step '${step.stepKey}' has external side-effects; operator must approve before re-executing this step.`;
    }
    if (checkpointId) {
      return `Resume workflow safely from Checkpoint '${checkpointId}'. Completed prior steps will not be re-run, avoiding duplicate operations.`;
    }
    if (step.isIdempotent) {
      return `Step '${step.stepKey}' is marked idempotent. Safe to retry directly without risk of duplicate side effects.`;
    }
    return `Step '${step.stepKey}' has external side-effects (${step.sideEffectDescription || 'non-idempotent write'}). Operator approval required before replay.`;
  }

  private async recordCluster(
    signatureHash: string,
    normalizedSignature: string,
    category: FailureCategory,
    executionId: string,
    workflowId: string,
    hypothesis: RootCauseHypothesis,
    recommendation: RecoveryRecommendation,
  ): Promise<void> {
    try {
      const existing = await this.clusterModel.findOne({ signatureHash });
      if (existing) {
        await this.clusterModel.updateOne(
          { signatureHash },
          {
            $inc: { frequency: 1 },
            $set: {
              lastSeenAt: new Date(),
              rootCauseHypothesis: hypothesis,
              recoveryRecommendation: recommendation,
            },
            $addToSet: {
              affectedWorkflows: workflowId,
              sampleExecutionIds: executionId,
            },
          },
        );
        return;
      }

      await this.clusterModel.create({
        clusterId: `cls-${uuidv4().substring(0, 8)}`,
        signatureHash,
        normalizedSignature,
        category,
        frequency: 1,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        affectedWorkflows: [workflowId],
        sampleExecutionIds: [executionId],
        rootCauseHypothesis: hypothesis,
        recoveryRecommendation: recommendation,
      });
      return;
    } catch {
      // Fallback in memory
    }

    const memExisting = this.memoryStore.findOne<FailureCluster>(
      'failure_clusters',
      (c) => c.signatureHash === signatureHash,
    );
    if (memExisting) {
      this.memoryStore.updateOne(
        'failure_clusters',
        (c) => c.signatureHash === signatureHash,
        {
          frequency: (memExisting.frequency || 1) + 1,
          lastSeenAt: new Date(),
          affectedWorkflows: Array.from(
            new Set([...(memExisting.affectedWorkflows || []), workflowId]),
          ),
          sampleExecutionIds: Array.from(
            new Set([...(memExisting.sampleExecutionIds || []), executionId]),
          ).slice(-20),
          rootCauseHypothesis: hypothesis,
          recoveryRecommendation: recommendation,
        },
      );
    } else {
      this.memoryStore.insert<FailureCluster>('failure_clusters', {
        clusterId: `cls-${uuidv4().substring(0, 8)}`,
        signatureHash,
        normalizedSignature,
        category,
        frequency: 1,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        affectedWorkflows: [workflowId],
        sampleExecutionIds: [executionId],
        rootCauseHypothesis: hypothesis,
        recoveryRecommendation: recommendation,
      } as FailureCluster);
    }
  }

  async getClusters(query?: { category?: FailureCategory; limit?: number }) {
    try {
      const filter: any = {};
      if (query?.category) filter.category = query.category;
      const clusters = await this.clusterModel
        .find(filter)
        .sort({ frequency: -1, lastSeenAt: -1 })
        .limit(query?.limit || 50);
      if (clusters && clusters.length > 0) return clusters;
    } catch {
      // Fallback
    }

    return this.memoryStore.find<FailureCluster>(
      'failure_clusters',
      (c) => (query?.category ? c.category === query.category : true),
      (a, b) => (b.frequency || 0) - (a.frequency || 0),
      query?.limit || 50,
    );
  }

  async getClusterByHash(signatureHash: string) {
    try {
      const found = await this.clusterModel.findOne({ signatureHash });
      if (found) return found;
    } catch {
      // Fallback
    }
    return this.memoryStore.findOne<FailureCluster>(
      'failure_clusters',
      (c) => c.signatureHash === signatureHash,
    );
  }
}
