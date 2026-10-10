import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { WorkflowsService } from '../workflows/workflows.service';
import { ExecutionsService } from '../executions/executions.service';
import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { FailuresService } from '../failures/failures.service';
import { StepType, StepStatus, ExecutionStatus } from '../common/types';

@Injectable()
export class DemoService implements OnModuleInit {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly executionsService: ExecutionsService,
    private readonly checkpointsService: CheckpointsService,
    private readonly failuresService: FailuresService,
  ) {}

  async onModuleInit() {
    // Automatically seed rich demo workflows and traces on application start
    await this.seedDemoData().catch((err) => {
      this.logger.warn(`Demo seeding note: ${err.message}`);
    });
  }

  async seedDemoData(): Promise<{ message: string; workflowsCount: number; runsCount: number }> {
    this.logger.log('Seeding rich AI pipeline observability workflows and failure scenarios...');

    // 1. Workflow: Customer Support Agent
    const wfSupport = await this.workflowsService.create({
      workflowId: 'customer-support-agent',
      name: 'Customer Support Autonomous Resolution Agent',
      description: 'Triages customer tickets, checks knowledge base, issues refunds, and sends resolution emails',
      project: 'support-core',
      version: '1.2.0',
      isPublic: true,
      tags: ['agent', 'customer-support', 'financial-side-effect'],
      steps: [
        {
          stepKey: 'ingest_ticket',
          name: 'Ticket Ingestion & Entity Extraction',
          type: StepType.DATA_TRANSFORM,
          isIdempotent: true,
          timeoutMs: 5000,
        },
        {
          stepKey: 'classify_intent',
          name: 'Intent Classification & Sentiment Analysis',
          type: StepType.LLM_CALL,
          isIdempotent: true,
          timeoutMs: 10000,
        },
        {
          stepKey: 'knowledge_search',
          name: 'Policy & SLA Knowledge Retrieval',
          type: StepType.RAG_RETRIEVAL,
          isIdempotent: true,
          timeoutMs: 8000,
        },
        {
          stepKey: 'execute_stripe_refund',
          name: 'External Payment Refund Dispatch',
          type: StepType.TOOL_EXECUTION,
          isIdempotent: false, // Critical: non-idempotent tool!
          requiresApprovalToReplay: true,
          sideEffectDescription: 'Dispatches non-idempotent customer credit card refund to Stripe payment gateway ($75.00 USD)',
          timeoutMs: 15000,
        },
        {
          stepKey: 'generate_customer_email',
          name: 'Resolution Confirmation Email Synthesis',
          type: StepType.LLM_CALL,
          isIdempotent: true,
          timeoutMs: 12000,
        },
      ],
      recoveryPolicy: {
        autoResumeMaxAttempts: 1,
        requireApprovalForNonIdempotent: true,
        backoffMs: 3000,
      },
    }).catch(() => null);

    // 2. Workflow: RAG Medical Diagnostics
    const wfMedical = await this.workflowsService.create({
      workflowId: 'rag-clinical-summary',
      name: 'Clinical Diagnostics & RAG Knowledge Pipeline',
      description: 'Synthesizes clinical trial datasets, queries medical ontologies, and prepares physician briefing',
      project: 'healthcare-ai',
      version: '2.0.1',
      isPublic: true,
      tags: ['rag', 'healthcare', 'gemini-1.5-pro'],
      steps: [
        {
          stepKey: 'parse_patient_ehr',
          name: 'EHR Patient Record Parsing',
          type: StepType.DATA_TRANSFORM,
          isIdempotent: true,
        },
        {
          stepKey: 'generate_dense_embeddings',
          name: 'Dense Vector Embeddings Generation',
          type: StepType.DATA_TRANSFORM,
          isIdempotent: true,
        },
        {
          stepKey: 'query_vector_ontology',
          name: 'Vector Database Qdrant Ontology Lookup',
          type: StepType.RAG_RETRIEVAL,
          isIdempotent: true,
          timeoutMs: 25000,
        },
        {
          stepKey: 'synthesize_clinical_summary',
          name: 'Clinical Briefing Synthesis',
          type: StepType.LLM_CALL,
          isIdempotent: true,
        },
      ],
    }).catch(() => null);

    // 3. Workflow: Code Generation & AST Patch Agent
    const wfCode = await this.workflowsService.create({
      workflowId: 'code-refactor-agent',
      name: 'Autonomous Code Refactoring & Patch Generator',
      description: 'Parses repository AST, generates type-safe refactoring patches, and validates schema diffs',
      project: 'developer-tools',
      version: '1.0.4',
      isPublic: true,
      tags: ['coding-agent', 'claude-3-5-sonnet', 'schema-validation'],
      steps: [
        {
          stepKey: 'ast_dependency_graph',
          name: 'AST Dependency Graph Ingestion',
          type: StepType.DATA_TRANSFORM,
          isIdempotent: true,
        },
        {
          stepKey: 'synthesize_patch_ast',
          name: 'LLM Patch Code Generation',
          type: StepType.LLM_CALL,
          isIdempotent: true,
        },
        {
          stepKey: 'validate_patch_schema',
          name: 'Structured Patch JSON Schema Validation',
          type: StepType.VALIDATION,
          isIdempotent: true,
        },
        {
          stepKey: 'push_git_branch',
          name: 'Git Branch Creation & Commit Push',
          type: StepType.TOOL_EXECUTION,
          isIdempotent: false,
          requiresApprovalToReplay: true,
          sideEffectDescription: 'Creates and pushes git ref to upstream repository',
        },
      ],
    }).catch(() => null);

    // 4. Workflow: Financial Advisor Agent
    const wfFinance = await this.workflowsService.create({
      workflowId: 'wealth-portfolio-advisor',
      name: 'Wealth Portfolio Allocation & Risk Advisor',
      description: 'Evaluates market macro trends, tests risk appetite, and enforces SEC safety compliance',
      project: 'fintech-core',
      version: '3.1.0',
      isPublic: true,
      tags: ['finance', 'guardrails', 'policy-enforcement'],
      steps: [
        {
          stepKey: 'fetch_macro_indicators',
          name: 'Market Data Ingestion',
          type: StepType.DATA_TRANSFORM,
          isIdempotent: true,
        },
        {
          stepKey: 'portfolio_risk_simulation',
          name: 'Monte Carlo Risk Simulation',
          type: StepType.LLM_CALL,
          isIdempotent: true,
        },
        {
          stepKey: 'compliance_guardrail_audit',
          name: 'Regulatory Safety Policy Audit',
          type: StepType.VALIDATION,
          isIdempotent: true,
        },
        {
          stepKey: 'deliver_client_statement',
          name: 'Client Statement Dispatch',
          type: StepType.EXTERNAL_WEBHOOK,
          isIdempotent: false,
        },
      ],
    }).catch(() => null);

    // Seed execution runs with realistic failure scenarios and checkpoints
    await this.seedSupportAgentRuns();
    await this.seedMedicalRAGRun();
    await this.seedCodeRefactorRun();
    await this.seedFinancePolicyRun();

    return {
      message: 'Demo workflows and failure scenarios successfully initialized',
      workflowsCount: 4,
      runsCount: 6,
    };
  }

  private async seedSupportAgentRuns() {
    // Run A: Failed run (TOOL_FAILURE at Stripe tool - non-idempotent!)
    await this.executionsService.bulkIngest({
      execution: {
        executionId: 'exec-support-failed-001',
        workflowId: 'customer-support-agent',
        workflowName: 'Customer Support Autonomous Resolution Agent',
        project: 'support-core',
        initiatedBy: 'agent-scheduler',
        inputPayload: {
          ticketId: 'TCK-88219',
          customerEmail: 'alex.rivers@example.com',
          customerTier: 'PLATINUM',
          issue: 'Double billing on monthly enterprise subscription. Requesting immediate refund of $75.00.',
        },
        tags: ['agent', 'refund-attempt', 'failed'],
      },
      steps: [
        {
          stepKey: 'ingest_ticket',
          name: 'Ticket Ingestion & Entity Extraction',
          type: StepType.DATA_TRANSFORM,
          status: StepStatus.COMPLETED,
          durationMs: 140,
          isIdempotent: true,
          outputPayload: {
            extractedEntities: { amount: 75.0, currency: 'USD', reason: 'duplicate_charge' },
          },
        },
        {
          stepKey: 'classify_intent',
          name: 'Intent Classification & Sentiment Analysis',
          parentStepKey: 'ingest_ticket',
          type: StepType.LLM_CALL,
          status: StepStatus.COMPLETED,
          model: 'gemini-1.5-flash',
          durationMs: 420,
          tokens: { promptTokens: 380, completionTokens: 65, totalTokens: 445 },
          isIdempotent: true,
          outputPayload: {
            intent: 'ISSUE_REFUND',
            confidence: 0.98,
            sentiment: 'FRUSTRATED',
            eligibleForAutoRefund: true,
          },
        },
        {
          stepKey: 'knowledge_search',
          name: 'Policy & SLA Knowledge Retrieval',
          parentStepKey: 'classify_intent',
          type: StepType.RAG_RETRIEVAL,
          status: StepStatus.COMPLETED,
          model: 'text-embedding-004',
          durationMs: 310,
          tokens: { promptTokens: 120, completionTokens: 0, totalTokens: 120 },
          isIdempotent: true,
          outputPayload: {
            policyMatch: 'SLA-REFUND-TIER-1',
            maxAutoRefundUsd: 150.0,
            allowAutomaticProcessing: true,
          },
        },
        {
          stepKey: 'execute_stripe_refund',
          name: 'External Payment Refund Dispatch',
          parentStepKey: 'knowledge_search',
          type: StepType.TOOL_EXECUTION,
          status: StepStatus.FAILED,
          durationMs: 1850,
          isIdempotent: false, // Critical: non-idempotent tool!
          requiresApprovalToReplay: true,
          sideEffectDescription: 'Dispatches $75.00 credit refund to external Stripe API',
          inputPayload: {
            chargeId: 'ch_3N8gLp2eZvKYlo2C1g9Xx1A9',
            amountCents: 7500,
            idempotencyKey: 'idem-ch-7500-user489',
          },
          errorDetails: {
            message: 'Stripe API Error 402: Rate limit on payment merchant gateway or card decline: Insufficient balance on merchant clearing pool',
            statusCode: 402,
            code: 'STRIPE_GATEWAY_DECLINE',
            stack: 'StripeError: Insufficient balance on merchant clearing pool\n at StripeClient.createRefund (/app/services/stripe.ts:88:14)',
          },
        },
      ],
      status: ExecutionStatus.FAILED,
    });

    // Run B: Successful Baseline Run for Comparison
    await this.executionsService.bulkIngest({
      execution: {
        executionId: 'exec-support-success-001',
        workflowId: 'customer-support-agent',
        workflowName: 'Customer Support Autonomous Resolution Agent',
        project: 'support-core',
        initiatedBy: 'agent-scheduler',
        inputPayload: {
          ticketId: 'TCK-88210',
          customerEmail: 'jordan.lee@example.com',
          customerTier: 'GOLD',
          issue: 'Accidental double purchase of annual license. Requesting cancellation and refund.',
        },
        tags: ['agent', 'refund-attempt', 'success'],
      },
      steps: [
        {
          stepKey: 'ingest_ticket',
          name: 'Ticket Ingestion & Entity Extraction',
          type: StepType.DATA_TRANSFORM,
          status: StepStatus.COMPLETED,
          durationMs: 130,
          isIdempotent: true,
          outputPayload: { extractedEntities: { amount: 75.0, currency: 'USD' } },
        },
        {
          stepKey: 'classify_intent',
          name: 'Intent Classification & Sentiment Analysis',
          parentStepKey: 'ingest_ticket',
          type: StepType.LLM_CALL,
          status: StepStatus.COMPLETED,
          model: 'gemini-1.5-flash',
          durationMs: 410,
          tokens: { promptTokens: 380, completionTokens: 65, totalTokens: 445 },
          isIdempotent: true,
          outputPayload: { intent: 'ISSUE_REFUND', confidence: 0.99 },
        },
        {
          stepKey: 'knowledge_search',
          name: 'Policy & SLA Knowledge Retrieval',
          parentStepKey: 'classify_intent',
          type: StepType.RAG_RETRIEVAL,
          status: StepStatus.COMPLETED,
          model: 'text-embedding-004',
          durationMs: 290,
          tokens: { promptTokens: 120, completionTokens: 0, totalTokens: 120 },
          isIdempotent: true,
          outputPayload: { policyMatch: 'SLA-REFUND-TIER-1' },
        },
        {
          stepKey: 'execute_stripe_refund',
          name: 'External Payment Refund Dispatch',
          parentStepKey: 'knowledge_search',
          type: StepType.TOOL_EXECUTION,
          status: StepStatus.COMPLETED,
          durationMs: 620,
          isIdempotent: false,
          sideEffectDescription: 'Dispatched $75.00 credit refund to external Stripe API',
          outputPayload: { refundId: 're_9012jLz8201', status: 'succeeded', amountRefunded: 75.0 },
        },
        {
          stepKey: 'generate_customer_email',
          name: 'Resolution Confirmation Email Synthesis',
          parentStepKey: 'execute_stripe_refund',
          type: StepType.LLM_CALL,
          status: StepStatus.COMPLETED,
          model: 'gemini-1.5-flash',
          durationMs: 510,
          tokens: { promptTokens: 410, completionTokens: 140, totalTokens: 550 },
          isIdempotent: true,
          outputPayload: {
            emailSubject: 'Your refund of $75.00 has been processed',
            recipient: 'jordan.lee@example.com',
          },
        },
      ],
      status: ExecutionStatus.COMPLETED,
    });
  }

  private async seedMedicalRAGRun() {
    await this.executionsService.bulkIngest({
      execution: {
        executionId: 'exec-medical-timeout-002',
        workflowId: 'rag-clinical-summary',
        workflowName: 'Clinical Diagnostics & RAG Knowledge Pipeline',
        project: 'healthcare-ai',
        initiatedBy: 'dr-watson-ehr-trigger',
        inputPayload: {
          patientId: 'PT-99042',
          studyType: 'oncology-phase-3-trials',
          query: 'Cross-reference clinical trial efficacy markers with genomic sequencing biomarkers',
        },
        tags: ['rag', 'timeout', 'retrieval-failure'],
      },
      steps: [
        {
          stepKey: 'parse_patient_ehr',
          name: 'EHR Patient Record Parsing',
          type: StepType.DATA_TRANSFORM,
          status: StepStatus.COMPLETED,
          durationMs: 280,
          isIdempotent: true,
          outputPayload: { biomarkerCount: 14, primaryGene: 'BRCA1-mutant' },
        },
        {
          stepKey: 'generate_dense_embeddings',
          name: 'Dense Vector Embeddings Generation',
          parentStepKey: 'parse_patient_ehr',
          type: StepType.DATA_TRANSFORM,
          status: StepStatus.COMPLETED,
          model: 'text-embedding-004',
          durationMs: 650,
          tokens: { promptTokens: 1520, completionTokens: 0, totalTokens: 1520 },
          isIdempotent: true,
        },
        {
          stepKey: 'query_vector_ontology',
          name: 'Vector Database Qdrant Ontology Lookup',
          parentStepKey: 'generate_dense_embeddings',
          type: StepType.RAG_RETRIEVAL,
          status: StepStatus.FAILED,
          durationMs: 30005, // Exceeded 30s deadline
          isIdempotent: true,
          errorDetails: {
            message: 'TimeoutError: Qdrant cluster cluster-us-east-1.qdrant.io failed to respond within 30000ms deadline. Vector query aborted.',
            statusCode: 504,
            code: 'ETIMEDOUT',
            stack: 'Error: Request timed out\n at QdrantClient.search (/app/vector/qdrant.ts:114:22)',
          },
        },
      ],
      status: ExecutionStatus.FAILED,
    });
  }

  private async seedCodeRefactorRun() {
    await this.executionsService.bulkIngest({
      execution: {
        executionId: 'exec-code-schema-err-003',
        workflowId: 'code-refactor-agent',
        workflowName: 'Autonomous Code Refactoring & Patch Generator',
        project: 'developer-tools',
        initiatedBy: 'github-webhook-pr-142',
        inputPayload: {
          repo: 'rishank-kesarwani/distribution-dashboard',
          targetFile: 'src/components/MetricTable.tsx',
          instruction: 'Migrate React class lifecycle methods to React useEffect hooks with strict typescript typings',
        },
        tags: ['coding-agent', 'schema-failure'],
      },
      steps: [
        {
          stepKey: 'ast_dependency_graph',
          name: 'AST Dependency Graph Ingestion',
          type: StepType.DATA_TRANSFORM,
          status: StepStatus.COMPLETED,
          durationMs: 380,
          isIdempotent: true,
        },
        {
          stepKey: 'synthesize_patch_ast',
          name: 'LLM Patch Code Generation',
          parentStepKey: 'ast_dependency_graph',
          type: StepType.LLM_CALL,
          status: StepStatus.COMPLETED,
          model: 'claude-3-5-sonnet',
          durationMs: 2400,
          tokens: { promptTokens: 2400, completionTokens: 890, totalTokens: 3290 },
          isIdempotent: true,
          outputPayload: {
            rawTextOutput: 'Here is the requested patch: ```json { "modifications": [] } ```',
          },
        },
        {
          stepKey: 'validate_patch_schema',
          name: 'Structured Patch JSON Schema Validation',
          parentStepKey: 'synthesize_patch_ast',
          type: StepType.VALIDATION,
          status: StepStatus.FAILED,
          durationMs: 45,
          isIdempotent: true,
          errorDetails: {
            message: 'ZodValidationError: Invalid JSON patch schema. Expected array property "patchHunks", received undefined. LLM response enclosed markdown codeblock instead of raw structured JSON object.',
            statusCode: 422,
            code: 'SCHEMA_PARSE_FAILED',
          },
        },
      ],
      status: ExecutionStatus.FAILED,
    });
  }

  private async seedFinancePolicyRun() {
    await this.executionsService.bulkIngest({
      execution: {
        executionId: 'exec-finance-policy-004',
        workflowId: 'wealth-portfolio-advisor',
        workflowName: 'Wealth Portfolio Allocation & Risk Advisor',
        project: 'fintech-core',
        initiatedBy: 'robo-advisor-api',
        inputPayload: {
          clientAccountId: 'ACC-88301',
          riskScore: 8,
          targetAllocation: 'crypto-derivatives-100x-leverage',
        },
        tags: ['finance', 'policy-denial'],
      },
      steps: [
        {
          stepKey: 'fetch_macro_indicators',
          name: 'Market Data Ingestion',
          type: StepType.DATA_TRANSFORM,
          status: StepStatus.COMPLETED,
          durationMs: 210,
          isIdempotent: true,
        },
        {
          stepKey: 'portfolio_risk_simulation',
          name: 'Monte Carlo Risk Simulation',
          parentStepKey: 'fetch_macro_indicators',
          type: StepType.LLM_CALL,
          status: StepStatus.COMPLETED,
          model: 'gpt-4o',
          durationMs: 1450,
          tokens: { promptTokens: 1100, completionTokens: 320, totalTokens: 1420 },
          isIdempotent: true,
        },
        {
          stepKey: 'compliance_guardrail_audit',
          name: 'Regulatory Safety Policy Audit',
          parentStepKey: 'portfolio_risk_simulation',
          type: StepType.VALIDATION,
          status: StepStatus.FAILED,
          durationMs: 180,
          isIdempotent: true,
          errorDetails: {
            message: 'PolicyDenialException: Strategy violated FINRA Regulatory Notice 21-15. Leverage ratio exceeding 5x is restricted for retail investor tier accounts.',
            statusCode: 403,
            code: 'POLICY_DENIED_EXCESSIVE_LEVERAGE',
          },
        },
      ],
      status: ExecutionStatus.FAILED,
    });
  }

  async simulateRun(workflowId = 'customer-support-agent', failStep = false): Promise<any> {
    const runId = `exec-sim-${Date.now().toString(36)}`;
    const stepStatuses: StepStatus[] = failStep
      ? [StepStatus.COMPLETED, StepStatus.COMPLETED, StepStatus.FAILED]
      : [StepStatus.COMPLETED, StepStatus.COMPLETED, StepStatus.COMPLETED, StepStatus.COMPLETED];

    return this.executionsService.bulkIngest({
      execution: {
        executionId: runId,
        workflowId,
        project: 'simulation-suite',
        initiatedBy: 'live-simulator',
        inputPayload: {
          testParam: 'Simulated pipeline input telemetry',
          timestamp: new Date().toISOString(),
        },
        tags: ['simulated', failStep ? 'failed' : 'success'],
      },
      steps: [
        {
          stepKey: 'step_1_input_processing',
          name: 'Input Normalization',
          type: StepType.DATA_TRANSFORM,
          status: stepStatuses[0],
          durationMs: 120,
          isIdempotent: true,
        },
        {
          stepKey: 'step_2_inference',
          name: 'Model Reasoning & Planning',
          parentStepKey: 'step_1_input_processing',
          type: StepType.LLM_CALL,
          status: stepStatuses[1],
          model: 'gemini-1.5-flash',
          durationMs: 450,
          tokens: { promptTokens: 420, completionTokens: 90, totalTokens: 510 },
          isIdempotent: true,
        },
        {
          stepKey: 'step_3_action',
          name: 'Action Dispatch',
          parentStepKey: 'step_2_inference',
          type: StepType.TOOL_EXECUTION,
          status: stepStatuses[2],
          durationMs: failStep ? 850 : 340,
          isIdempotent: false,
          requiresApprovalToReplay: true,
          sideEffectDescription: 'Simulated external tool with non-idempotent mutation',
          errorDetails: failStep
            ? {
                message: 'Simulated downstream timeout and socket drop after 850ms',
                statusCode: 504,
                code: 'SIMULATED_FAILURE',
              }
            : undefined,
        },
      ],
    });
  }
}
