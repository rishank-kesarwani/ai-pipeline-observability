export type ExecutionStatus =
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RECOVERED'
  | 'PAUSED'
  | 'CANCELLED';

export type StepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED'
  | 'CANCELLED';

export type StepType =
  | 'LLM_CALL'
  | 'TOOL_EXECUTION'
  | 'RAG_RETRIEVAL'
  | 'DATA_TRANSFORM'
  | 'EXTERNAL_WEBHOOK'
  | 'VALIDATION';

export type FailureCategory =
  | 'TIMEOUT'
  | 'MODEL_FAILURE'
  | 'SCHEMA_FAILURE'
  | 'TOOL_FAILURE'
  | 'RETRIEVAL_FAILURE'
  | 'POLICY_DENIAL'
  | 'UNKNOWN';

export type CulpritType =
  | 'INPUT_DRIFT'
  | 'DEPENDENCY_OUTAGE'
  | 'SCHEMA_MISMATCH'
  | 'TIMEOUT'
  | 'GUARDRAIL_TRIGGER'
  | 'RATE_LIMIT'
  | 'UNHANDLED_EXCEPTION';

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
  confidence: number;
  isProven: boolean;
  evidence: TraceEvidenceItem[];
  mitigation: string;
}

export interface RecoveryRecommendation {
  recommendationId: string;
  actionType: string;
  targetCheckpointId?: string;
  targetStepKey?: string;
  confidence: number;
  explanation: string;
  requiresOperatorApproval: boolean;
  approvalReason?: string;
  isIdempotent: boolean;
}

export interface StepErrorDetails {
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
}

export interface TraceStep {
  stepId: string;
  executionId: string;
  workflowId: string;
  stepKey: string;
  name: string;
  parentStepKey?: string;
  parentStepId?: string;
  stepOrder: number;
  depth: number;
  type: StepType;
  status: StepStatus;
  model?: string;
  provider?: string;
  isIdempotent: boolean;
  requiresApprovalToReplay: boolean;
  sideEffectDescription?: string;
  inputPayload?: Record<string, any>;
  outputPayload?: Record<string, any>;
  errorDetails?: StepErrorDetails;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  retryCount: number;
  durationMs: number;
  startTime: string;
  endTime?: string;
  metadata?: Record<string, any>;
  children?: TraceStep[];
}

export interface Execution {
  executionId: string;
  workflowId: string;
  workflowName: string;
  project: string;
  tenantId: string;
  status: ExecutionStatus;
  initiatedBy: string;
  startTime: string;
  endTime?: string;
  durationMs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  retryCount: number;
  failureCategory?: FailureCategory;
  errorSignature?: string;
  errorSignatureHash?: string;
  isRecovered: boolean;
  recoveredFromExecutionId?: string;
  lastValidCheckpointId?: string;
  tags: string[];
  inputPayload?: Record<string, any>;
  outputPayload?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface Checkpoint {
  checkpointId: string;
  executionId: string;
  workflowId: string;
  stepKey: string;
  stepOrder: number;
  stateSnapshot: Record<string, any>;
  completedStepKeys: string[];
  isValid: boolean;
  timestamp: string;
}

export interface RecoveryAction {
  recoveryId: string;
  executionId: string;
  workflowId: string;
  actionType: string;
  checkpointId?: string;
  targetStepKey?: string;
  status: string;
  requiresOperatorApproval: boolean;
  isIdempotent: boolean;
  operatorApproval?: {
    approvedBy: string;
    approvedAt: string;
    rationale: string;
    riskAssessment?: string;
  };
  initiatedBy: string;
  resumedExecutionId?: string;
  createdAt: string;
}

export interface FailureCluster {
  clusterId: string;
  signatureHash: string;
  normalizedSignature: string;
  category: FailureCategory;
  frequency: number;
  firstSeenAt: string;
  lastSeenAt: string;
  affectedWorkflows: string[];
  sampleExecutionIds: string[];
  rootCauseHypothesis?: RootCauseHypothesis;
  recoveryRecommendation?: RecoveryRecommendation;
}

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
