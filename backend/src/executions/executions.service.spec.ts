import { ExecutionsService } from './executions.service';
import { MemoryStoreService } from '../database/memory-store.service';
import { FailuresService } from '../failures/failures.service';
import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { NotificationService } from '../integrations/notification.service';
import { StepType, StepStatus, ExecutionStatus, FailureCategory } from '../common/types';

describe('ExecutionsService', () => {
  let executionsService: ExecutionsService;
  let memoryStore: MemoryStoreService;
  let failuresService: FailuresService;
  let checkpointsService: CheckpointsService;
  let notificationService: NotificationService;

  beforeEach(() => {
    memoryStore = new MemoryStoreService();

    const mockModel: any = {
      create: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline');
      }),
      findOne: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline');
      }),
      find: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline');
      }),
      updateOne: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline');
      }),
    };

    failuresService = new FailuresService(mockModel, memoryStore);
    checkpointsService = new CheckpointsService(
      mockModel,
      mockModel,
      mockModel,
      mockModel,
      mockModel,
      memoryStore,
    );

    notificationService = {
      sendFailureAlert: jest.fn().mockResolvedValue(true),
    } as any;

    executionsService = new ExecutionsService(
      mockModel,
      mockModel,
      mockModel,
      memoryStore,
      failuresService,
      checkpointsService,
      notificationService,
    );
  });

  it('should create execution and redact sensitive fields in input payload', async () => {
    const exec = await executionsService.createExecution({
      workflowId: 'test-wf',
      project: 'test-proj',
      inputPayload: {
        apiKey: 'sk-secret-key-12345678901234567890',
        userEmail: 'bob@example.com',
        query: 'Help me plan a flight',
      },
    });

    expect(exec.executionId).toBeDefined();
    expect(exec.status).toBe(ExecutionStatus.RUNNING);
    expect(exec.inputPayload.apiKey).toBe('[REDACTED_SENSITIVE_FIELD]');
    expect(exec.inputPayload.userEmail).toBe('[REDACTED_EMAIL]');
    expect(exec.inputPayload.query).toBe('Help me plan a flight');
  });

  it('should ingest step, calculate cost, roll up metrics, and classify failure', async () => {
    const exec = await executionsService.createExecution({
      workflowId: 'test-wf',
      project: 'test-proj',
    });

    // Ingest successful LLM step
    await executionsService.ingestStep(exec.executionId, {
      stepKey: 'llm_call_1',
      type: StepType.LLM_CALL,
      status: StepStatus.COMPLETED,
      model: 'gemini-1.5-flash',
      durationMs: 300,
      tokens: { promptTokens: 1000, completionTokens: 200, totalTokens: 1200 },
      isIdempotent: true,
    });

    // Ingest failed tool step
    await executionsService.ingestStep(exec.executionId, {
      stepKey: 'tool_call_2',
      type: StepType.TOOL_EXECUTION,
      status: StepStatus.FAILED,
      durationMs: 400,
      isIdempotent: false,
      errorDetails: {
        message: 'Stripe API Gateway Timeout (504): Gateway did not respond in time',
        statusCode: 504,
      },
    });

    const executionData = await executionsService.findOne(exec.executionId);
    expect(executionData.execution.status).toBe(ExecutionStatus.FAILED);
    expect(executionData.execution.failureCategory).toBe(FailureCategory.TIMEOUT);
    expect(executionData.execution.totalTokens).toBe(1200);
    expect(executionData.execution.durationMs).toBe(700);
    expect(executionData.execution.estimatedCostUsd).toBeGreaterThan(0);
    expect(notificationService.sendFailureAlert).toHaveBeenCalled();
  });
});
