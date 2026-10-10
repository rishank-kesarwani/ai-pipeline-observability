# AI Pipeline Observability & Recovery Platform

Production-grade AI Engineering platform that makes complex, multi-step AI agent workflows observable, forensic-traceable, and safely recoverable from durable checkpoints.

---

## 1. High-Level Architecture (HLD)

Modern multi-agent architectures (LangGraph, CrewAI, AutoGen, custom orchestration) fail in complex, non-deterministic ways: model rate limits, tool timeouts, schema drift, content policy denials, and flaky third-party APIs. When an agent fails after 6 steps, restarting from scratch wastes money and risks duplicate external side effects (e.g. charging credit cards, writing duplicate database records, sending duplicate emails).

`ai-pipeline-observability` provides:
1. **Hierarchical Step Execution Traces**: Captures parent-child DAG relationships between reasoning steps, tool calls, and RAG retrievals.
2. **Deep Data Sanitization**: Recursively redacts passwords, Bearer tokens, OpenAI keys (`sk-...`), Google API keys, emails, and credit cards before persistence or logging.
3. **Typed Failure Forensics & Clustering**: Classifies failures into standard typed categories (`TIMEOUT`, `MODEL_FAILURE`, `SCHEMA_FAILURE`, `TOOL_FAILURE`, `RETRIEVAL_FAILURE`, `POLICY_DENIAL`, `UNKNOWN`) and clusters recurring issues using normalized error signature hashes.
4. **Root-Cause Hypotheses with Cited Trace Evidence**: Generates structured hypotheses with explicit trace evidence citations without falsely asserting unproven claims.
5. **Durable Checkpointing & Safe Recovery**: Automatically captures state snapshots after successful milestones. Allows resuming partially completed workflows without re-executing completed non-idempotent steps.
6. **Operator Approval Guard**: Strictly requires human operator sign-off before replaying non-idempotent or externally side-effecting tools.
7. **Execution Comparison Diff Engine**: Aligns successful and failed runs side-by-side to highlight the exact step divergence point and behavioral drift.
8. **Shared Service Integrations**: Directly integrates through verified APIs with `ai-platform` (for reasoning), `notification-service` (for critical alerts), and `ai-model-regression-detection` (for model benchmarking).

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                        Next.js 14 Frontend UI                          │
 │  • Flamegraph Step Tree  • Failure Forensics  • Checkpoint Resumes    │
 │  • Side-by-Side Run Diff • Error Clusters     • Operator Approvals    │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ REST API (/api/v1)
 ┌───────────────────────────────────▼────────────────────────────────────┐
 │                          NestJS 11 Backend                             │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │ API & Ingestion Layer                                            │  │
 │  │ • Rate Limiting & Throttler • Correlation ID Middleware          │  │
 │  │ • OptionalJwtAuthGuard      • Sensitive Data Redaction Engine    │  │
 │  └──────────────────┬───────────────────────────────┬───────────────┘  │
 │                     │                               │                  │
 │  ┌──────────────────▼───────────────┐ ┌─────────────▼───────────────┐  │
 │  │ Failure Forensics & Clustering   │ │ Durable Checkpoints Engine  │  │
 │  │ • Normalized Signature Hasher    │ │ • Milestone State Snapshots │  │
 │  │ • Evidence-backed Hypotheses     │ │ • Non-idempotent Guard      │  │
 │  │ • Recovery Recommendation        │ │ • Operator Sign-off Modal   │  │
 │  └──────────────────┬───────────────┘ └─────────────┬───────────────┘  │
 │                     │                               │                  │
 │  ┌──────────────────▼───────────────────────────────▼───────────────┐  │
 │  │ Integration Adapters                                             │  │
 │  │ • AI Platform Client         (POST /api/v1/ai/chat)              │  │
 │  │ • Notification Service Client (POST /v1/notifications)           │  │
 │  │ • Model Regression Client    (POST /evaluations)                 │  │
 │  └──────────────────────────────────────────────────────────────────┘  │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│     MongoDB Document Store      │             │        Redis & BullMQ           │
│ (Workflows, Runs, Traces,       │             │ (Ingestion Queue, Rate Limits,  │
│  Clusters, Checkpoints, Audits) │             │  Background Forensics Engine)   │
└─────────────────────────────────┘             └─────────────────────────────────┘
```

---

## 2. Sequence Diagram: Failure Forensics, Safe Checkpointing & Operator Sign-Off

```mermaid
sequenceDiagram
    autonumber
    actor Agent as AI Agent Pipeline
    participant Backend as Observability Backend
    participant Redactor as Redaction Engine
    participant CheckpointDB as Checkpoint Store
    participant Forensics as Forensics & Clusters
    participant Notif as Notification Service
    actor Operator as Human Operator

    Agent->>Backend: POST /api/v1/executions/ingest (Step 1: Parse Input)
    Backend->>Redactor: Redact sensitive tokens & PII
    Backend->>CheckpointDB: Checkpoint 1 state snapshot saved
    
    Agent->>Backend: Ingest Step 2: Query Knowledge (RAG)
    Backend->>CheckpointDB: Checkpoint 2 state snapshot saved

    Agent->>Backend: Ingest Step 3: Execute Stripe Refund (Non-Idempotent)
    Note over Agent: External gateway timeout (HTTP 504)
    Backend->>Forensics: Classify failure (TOOL_FAILURE)
    Forensics->>Forensics: Normalize signature & compute signatureHash
    Forensics->>Notif: POST /v1/notifications (Priority: CRITICAL alert)
    
    Operator->>Backend: POST /api/v1/recoveries/initiate (from Checkpoint 2)
    Backend->>Backend: Inspect pending steps -> Detects isIdempotent: false
    Backend-->>Operator: Status: PENDING_OPERATOR_APPROVAL
    
    Operator->>Backend: POST /api/v1/recoveries/:id/approve (Rationale provided)
    Backend->>Backend: Record operator approval audit log
    Backend->>Backend: Spawn resumed run restoring Checkpoint 2 snapshot
    Note over Backend: Steps 1 & 2 carried over as completed (NOT re-executed)
    Backend-->>Operator: Workflow successfully resumed & completed!
```

---

## 3. Data Model

### `Workflow`
- `workflowId`: Unique string ID.
- `name`, `description`, `version`, `project`, `tenantId`.
- `steps`: Array of `WorkflowStepDefinition` (`stepKey`, `name`, `type`, `isIdempotent`, `requiresApprovalToReplay`, `sideEffectDescription`, `timeoutMs`).
- `recoveryPolicy`: `autoResumeMaxAttempts`, `requireApprovalForNonIdempotent`, `backoffMs`.

### `Execution`
- `executionId`, `workflowId`, `workflowName`, `project`, `tenantId`.
- `status`: `RUNNING` | `COMPLETED` | `FAILED` | `RECOVERED` | `PAUSED` | `CANCELLED`.
- `durationMs`, `totalPromptTokens`, `totalCompletionTokens`, `totalTokens`, `estimatedCostUsd`, `retryCount`.
- `failureCategory`: `TIMEOUT` | `MODEL_FAILURE` | `SCHEMA_FAILURE` | `TOOL_FAILURE` | `RETRIEVAL_FAILURE` | `POLICY_DENIAL` | `UNKNOWN`.
- `errorSignature`, `errorSignatureHash`.
- `lastValidCheckpointId`, `isRecovered`, `recoveredFromExecutionId`.

### `TraceStep`
- `stepId`, `executionId`, `workflowId`, `stepKey`, `parentStepKey`, `parentStepId`.
- `depth`: Hierarchical nesting depth.
- `type`: `LLM_CALL` | `TOOL_EXECUTION` | `RAG_RETRIEVAL` | `DATA_TRANSFORM` | `EXTERNAL_WEBHOOK` | `VALIDATION`.
- `status`: `PENDING` | `RUNNING` | `COMPLETED` | `FAILED` | `SKIPPED`.
- `model`, `provider`, `isIdempotent`, `requiresApprovalToReplay`, `sideEffectDescription`.
- `inputPayload`, `outputPayload`: Sanitized JSON payloads.
- `errorDetails`: `{ message, stack, code, statusCode }`.
- `promptTokens`, `completionTokens`, `totalTokens`, `estimatedCostUsd`, `durationMs`.

### `Checkpoint`
- `checkpointId`, `executionId`, `workflowId`, `stepKey`, `stepOrder`.
- `stateSnapshot`: Accumulated state dictionary at checkpoint milestone.
- `completedStepKeys`: Array of completed step keys.
- `isValid`, `timestamp`.

### `RecoveryAction`
- `recoveryId`, `executionId`, `workflowId`, `actionType`, `checkpointId`, `targetStepKey`.
- `status`: `PENDING_OPERATOR_APPROVAL` | `APPROVED` | `EXECUTING` | `COMPLETED` | `REJECTED`.
- `requiresOperatorApproval`, `isIdempotent`.
- `operatorApproval`: `{ approvedBy, approvedAt, rationale, riskAssessment }`.
- `resumedExecutionId`, `createdAt`.

### `FailureCluster`
- `clusterId`, `signatureHash`, `normalizedSignature`, `category`, `frequency`.
- `firstSeenAt`, `lastSeenAt`, `affectedWorkflows`, `sampleExecutionIds`.
- `rootCauseHypothesis`: Statement, confidence score, cited evidence items, mitigation advice.
- `recoveryRecommendation`: Recommended action, explanation, safety approval flags.

---

## 4. Verified API Contracts

### Executions & Ingestion
- `POST /api/v1/executions`: Register execution run.
- `POST /api/v1/executions/ingest`: Bulk ingest execution trace with hierarchical steps and telemetry. Supports `idempotency-key` header to prevent duplicate writes on network retries.
- `POST /api/v1/executions/:id/steps`: Ingest individual step event with duration, tokens, cost, and sanitized payloads.
- `GET /api/v1/executions`: Filter runs by `project`, `status`, `workflowId`, `failureCategory`, `minLatencyMs`, `maxLatencyMs`, and `search`.
- `GET /api/v1/executions/:id`: Fetch complete execution summary, step traces, checkpoints, recoveries, and cluster diagnostics.
- `GET /api/v1/executions/:id/timeline`: Hierarchical tree / flamegraph representation with durations.

### Checkpoints & Recovery
- `POST /api/v1/checkpoints`: Record durable milestone state snapshot.
- `GET /api/v1/checkpoints/execution/:id`: Retrieve valid checkpoints for execution.
- `POST /api/v1/recoveries/initiate`: Initiate recovery. Automatically verifies if target steps are non-idempotent; if so, transitions to `PENDING_OPERATOR_APPROVAL`.
- `POST /api/v1/recoveries/:id/approve`: Operator approval endpoint. Requires operator rationale before spawning safe resumed run.
- `GET /api/v1/recoveries`: List all recovery actions.

### Failure Forensics & Clusters
- `GET /api/v1/failures/clusters`: List error clusters grouped by normalized signature hashes.
- `GET /api/v1/failures/clusters/:hash`: Fetch cluster root-cause hypothesis, cited trace evidence, and sample runs.

### Run Comparisons (Diff Engine)
- `GET /api/v1/comparisons?baseRunId=...&targetRunId=...`: Side-by-side run comparison diff. Pinpoints initial divergence point and metric deltas.

### Health & Observability
- `GET /health`: Platform health check (memory usage, database connection, queue status).
- `GET /health/live`: Kubernetes liveness probe.
- `GET /health/ready`: Kubernetes readiness probe.

---

## 5. Security & Sensitive Data Redaction

1. **Automatic Ingestion Redaction**:
   - Matches and redacts sensitive keys: `password`, `secret`, `token`, `api_key`, `authorization`, `credit_card`, `ssn`, `cookie`.
   - Normalizes text patterns:
     - JWT tokens (`eyJ...` -> `[REDACTED_JWT_TOKEN]`)
     - Bearer tokens (`Bearer ...` -> `Bearer [REDACTED_TOKEN]`)
     - OpenAI API keys (`sk-...` -> `[REDACTED_API_KEY]`)
     - Google API keys (`AIza...` -> `[REDACTED_GOOGLE_API_KEY]`)
     - Email PII -> `[REDACTED_EMAIL]`
     - Credit Card numbers -> `[REDACTED_CREDIT_CARD]`
2. **Dual-Switch Optional Public Access Architecture**:
   - Built to mirror the Travel Planner public access model (`NEXT_PUBLIC_ACCESS_ENABLED` on frontend and `PUBLIC_ACCESS_ENABLED` on backend).
   - **Authoritative Backend**: The backend is the sole source of truth for all authorization. Setting the frontend flag to `true` has zero impact on backend protection.
   - **Strict Separation of Privilege**:
     - *Anonymous Guest*: Confined to read-only demo telemetry in `tenantId: 'default'`. Can never initiate recoveries, approve replays, access cross-tenant records, or ingest execution data.
     - *Service Caller*: Ingestion agents authenticate via `x-api-key` matching `SERVICE_API_KEY`. Public access mode never bypasses internal service authentication.
     - *Operator / Admin*: Authenticated operators authenticate via JWT Bearer token and hold exclusive authorization to initiate and approve workflow recovery replays and inspect audit ledgers.
3. **Rate Limiting & Abuse Prevention**:
   - Per-IP rate limiting enforced via `@nestjs/throttler`.
   - Request size limited to 1MB (`MAX_PAYLOAD_BYTES`).
   - Generic external errors returned without stack traces, credentials, or internal prompts.

---

## 6. Authorization Categories & Route Matrix

| Category | Guard / Decorator | Required Credentials | Endpoints |
| :--- | :--- | :--- | :--- |
| **Public Infrastructure** | `@Public()` | None | `GET /health`<br/>`GET /health/live`<br/>`GET /health/ready`<br/>`POST /api/v1/auth/login`<br/>`POST /api/v1/auth/register`<br/>`POST /api/v1/auth/refresh`<br/>`GET /api/v1/auth/config` |
| **Optional Demo Reads** | `@OptionalAuth()` | Allowed anonymously IF `PUBLIC_ACCESS_ENABLED=true`. Otherwise requires valid JWT. Strictly scoped to `tenantId: 'default'`. | `GET /api/v1/executions`<br/>`GET /api/v1/executions/:id`<br/>`GET /api/v1/executions/:id/timeline`<br/>`GET /api/v1/failures/clusters`<br/>`GET /api/v1/failures/clusters/:id`<br/>`GET /api/v1/comparisons`<br/>`GET /api/v1/workflows`<br/>`GET /api/v1/workflows/:id`<br/>`POST /api/v1/demo/seed`<br/>`POST /api/v1/demo/simulate-run` |
| **Ingestion Mutations** | `ServiceOrOperatorGuard` | Valid `x-api-key` (timing-safe check against `SERVICE_API_KEY`) **OR** valid JWT with role `operator`/`admin`. | `POST /api/v1/executions`<br/>`POST /api/v1/executions/ingest`<br/>`POST /api/v1/executions/:id/steps`<br/>`POST /api/v1/checkpoints` |
| **Operator Privileged** | `JwtAuthGuard` + `RolesGuard(['operator', 'admin'])` | Valid JWT Bearer token with operator or admin role. | `POST /api/v1/recoveries/initiate`<br/>`POST /api/v1/recoveries/:id/approve`<br/>`GET /api/v1/recoveries`<br/>`GET /api/v1/audit`<br/>`POST /api/v1/workflows` |

---

## 7. Shared Service Integrations (Audited Contracts)

### A. Shared AI Platform (`rishank-kesarwani/ai-platform`)
- **Endpoint**: `POST /api/v1/ai/chat`
- **Auth Header**: `x-api-key: ${AI_PLATFORM_OBSERVABILITY_API_KEY}`
- **Usage**: Diagnostic summaries and root-cause reasoning.
- **Contract**: Accepts `applicationId`, `tenantId`, `message`, `systemInstruction`. Responds with `answer`, `citations`, `usage`, `model`, `latencyMs`.
- **Fault Tolerance**: Resilient local evidence fallback if external AI Platform is offline or unreachable.

### B. Notification Service (`rishank-kesarwani/notification-service`)
- **Endpoint**: `POST /v1/notifications`
- **Auth Header**: `x-api-key: ${NOTIFICATION_OBSERVABILITY_API_KEY}`
- **Usage**: Dispatches actionable email alerts for critical workflow failures or repeated errors.
- **Contract**: Accepts `idempotencyKey`, `priority: "CRITICAL"`, `channels: ["EMAIL"]`, `recipient: { userId, email }`, `email: { subject, text, html }`, `metadata`.
- **Payload Safety**: Transmits only sanitized correlation ID, workflow name, error class, and dashboard link. Never sends API keys or raw user payloads.

### C. AI Model Regression Detection (`rishank-kesarwani/ai-model-regression-detection`)
- **Endpoint**: `POST /api/v1/evaluations`
- **Auth Header**: `Authorization: Bearer ${MODEL_REGRESSION_API_KEY}`
- **Usage**: Triggers model benchmark evaluations when assessing candidate model versions across observed workflows. Does not duplicate its evaluator registry or baseline engine.

---

## 8. Deployment Configuration (Vercel & Render)

### Environment Variable Interaction Matrix

| Variable | Deployment Platform | Runtime / Scope | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_ACCESS_ENABLED` | **Vercel** (Frontend) | Client Build-Time | `true` | Controls whether UI displays anonymous demo telemetry or shows operator sign-in gate. **Not a security boundary.** |
| `NEXT_PUBLIC_API_URL` | **Vercel** (Frontend) | Client Build-Time | `https://ai-pipeline-observability.onrender.com/api/v1` | URL to backend API endpoint. |
| `PUBLIC_ACCESS_ENABLED` | **Render** (Backend) | Server Runtime | `true` | **Authoritative security switch.** If `false`, rejects unauthenticated requests across all application endpoints with HTTP 401. |
| `SERVICE_API_KEY` | **Render** (Backend) | Server Runtime | (Secret) | Shared service key for external AI agent pipelines ingesting telemetry. |

> [!IMPORTANT]
> Next.js variables starting with `NEXT_PUBLIC_` are embedded into the frontend bundle at **build time**. If you change `NEXT_PUBLIC_ACCESS_ENABLED` in Vercel, you must trigger a new deployment for the change to take effect. `PUBLIC_ACCESS_ENABLED` on Render is read dynamically at server startup and on each incoming HTTP request.

### Configuring Vercel
1. In your Vercel Project Settings under **Environment Variables**, configure:
   - `NEXT_PUBLIC_ACCESS_ENABLED`: `true` (for public demo) or `false` (for private enterprise mode).
   - `NEXT_PUBLIC_API_URL`: `https://ai-pipeline-observability.onrender.com/api/v1`
2. Trigger a redeploy so the build picks up the new environment configuration.

### Configuring Render
1. In your Render Web Service under **Environment**, configure:
   - `PUBLIC_ACCESS_ENABLED`: `true` (or `false` to restrict to signed-in operators only).
   - `SERVICE_API_KEY`: A secure random secret string for pipeline ingestion.
   - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Secure random 32+ character secrets.
2. Render automatically restarts the service with zero downtime.

---

## 9. Verification & Test Commands

### Run Unit & Integration Tests:
```bash
npm test
```
All 7 test suites and 29 tests pass:
- Execution ingestion & metric rollups
- Sensitive data redaction
- Error normalization & failure classification
- Durable checkpointing & safe resume
- Resuming partially completed workflow without rerunning completed non-idempotent steps
- Operator approval workflow & authentication
- **Public access switch unit & integration suite**:
  - `PUBLIC_ACCESS_ENABLED=true` permits anonymous reads to `/executions` in default tenant.
  - `PUBLIC_ACCESS_ENABLED=false` denies anonymous requests with HTTP 401.
  - Health and auth configuration endpoints remain unauthenticated in all modes.
  - Malformed or invalid Bearer tokens are rejected with HTTP 401 even when public mode is enabled.
  - Ingestion endpoints reject anonymous callers with HTTP 401 even when public mode is enabled.
  - Ingestion permits valid `SERVICE_API_KEY` via `x-api-key`.
  - Ingestion rejects invalid service key with HTTP 401.
  - Ingestion permits authenticated operator JWT.
  - Anonymous callers cannot initiate workflow recoveries (HTTP 401).
  - Anonymous callers cannot query privileged audit logs (HTTP 401).
  - Cross-tenant requests by anonymous guests are rejected with HTTP 403.

### Run Production Build:
```bash
npm run build
```
Builds NestJS backend (`nest build`) and Next.js frontend (`next build`) cleanly with zero errors.
