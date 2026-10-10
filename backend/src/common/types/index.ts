export enum StepType {
  LLM_CALL = 'LLM_CALL',
  TOOL_EXECUTION = 'TOOL_EXECUTION',
  RAG_RETRIEVAL = 'RAG_RETRIEVAL',
  DATA_TRANSFORM = 'DATA_TRANSFORM',
  EXTERNAL_WEBHOOK = 'EXTERNAL_WEBHOOK',
  VALIDATION = 'VALIDATION',
}

export enum StepStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

export enum ExecutionStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RECOVERED = 'RECOVERED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export enum FailureCategory {
  TIMEOUT = 'TIMEOUT',
  MODEL_FAILURE = 'MODEL_FAILURE',
  SCHEMA_FAILURE = 'SCHEMA_FAILURE',
  TOOL_FAILURE = 'TOOL_FAILURE',
  RETRIEVAL_FAILURE = 'RETRIEVAL_FAILURE',
  POLICY_DENIAL = 'POLICY_DENIAL',
  UNKNOWN = 'UNKNOWN',
}

export enum CulpritType {
  INPUT_DRIFT = 'INPUT_DRIFT',
  DEPENDENCY_OUTAGE = 'DEPENDENCY_OUTAGE',
  SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
  TIMEOUT = 'TIMEOUT',
  GUARDRAIL_TRIGGER = 'GUARDRAIL_TRIGGER',
  RATE_LIMIT = 'RATE_LIMIT',
  UNHANDLED_EXCEPTION = 'UNHANDLED_EXCEPTION',
}

export enum RecoveryActionType {
  RESUME_FROM_CHECKPOINT = 'RESUME_FROM_CHECKPOINT',
  RETRY_FAILED_STEP = 'RETRY_FAILED_STEP',
  FALLBACK_MODEL = 'FALLBACK_MODEL',
  REPLAY_WORKFLOW = 'REPLAY_WORKFLOW',
  MANUAL_INTERVENTION_REQUIRED = 'MANUAL_INTERVENTION_REQUIRED',
}

export enum RecoveryApprovalStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING_OPERATOR_APPROVAL = 'PENDING_OPERATOR_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface TraceEvidenceItem {
  stepKey: string;
  stepId?: string;
  timestamp: string;
  observation: string;
  culpritType: CulpritType;
  rawIndicator?: string;
}

export interface RootCauseHypothesis {
  hypothesisId: string;
  category: FailureCategory;
  statement: string;
  confidence: number; // 0.0 - 1.0
  isProven: boolean; // Must never claim proven without conclusive evidence
  evidence: TraceEvidenceItem[];
  mitigation: string;
}

export interface RecoveryRecommendation {
  recommendationId: string;
  actionType: RecoveryActionType;
  targetCheckpointId?: string;
  targetStepKey?: string;
  confidence: number;
  explanation: string;
  requiresOperatorApproval: boolean;
  approvalReason?: string;
  isIdempotent: boolean;
  suggestedPayloadOverrides?: Record<string, any>;
}

export interface StepTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StepMetrics {
  durationMs: number;
  tokenUsage?: StepTokenUsage;
  estimatedCostUsd: number;
  retryCount: number;
}
