import { ComparisonsService } from './comparisons.service';
import { MemoryStoreService } from '../database/memory-store.service';
import { StepStatus, ExecutionStatus } from '../common/types';

describe('ComparisonsService', () => {
  let comparisonsService: ComparisonsService;
  let memoryStore: MemoryStoreService;

  beforeEach(() => {
    memoryStore = new MemoryStoreService();

    const mockModel: any = {
      findOne: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline');
      }),
      find: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline');
      }),
    };

    comparisonsService = new ComparisonsService(mockModel, mockModel, memoryStore);
  });

  it('should compare two runs and pinpoint the exact step divergence point', async () => {
    // Run 1: Successful run
    memoryStore.insert('executions', {
      executionId: 'exec-success',
      workflowId: 'wf-1',
      status: ExecutionStatus.COMPLETED,
      durationMs: 800,
      totalTokens: 1000,
      estimatedCostUsd: 0.005,
    });

    memoryStore.insert('trace_steps', {
      stepId: 'stp-1-s',
      executionId: 'exec-success',
      stepKey: 'step_1',
      name: 'Step 1',
      status: StepStatus.COMPLETED,
      durationMs: 300,
      totalTokens: 400,
      stepOrder: 1,
    });

    memoryStore.insert('trace_steps', {
      stepId: 'stp-2-s',
      executionId: 'exec-success',
      stepKey: 'step_2',
      name: 'Step 2',
      status: StepStatus.COMPLETED,
      durationMs: 500,
      totalTokens: 600,
      stepOrder: 2,
    });

    // Run 2: Failed run
    memoryStore.insert('executions', {
      executionId: 'exec-fail',
      workflowId: 'wf-1',
      status: ExecutionStatus.FAILED,
      durationMs: 650,
      totalTokens: 400,
      estimatedCostUsd: 0.002,
    });

    memoryStore.insert('trace_steps', {
      stepId: 'stp-1-f',
      executionId: 'exec-fail',
      stepKey: 'step_1',
      name: 'Step 1',
      status: StepStatus.COMPLETED,
      durationMs: 320,
      totalTokens: 400,
      stepOrder: 1,
    });

    memoryStore.insert('trace_steps', {
      stepId: 'stp-2-f',
      executionId: 'exec-fail',
      stepKey: 'step_2',
      name: 'Step 2',
      status: StepStatus.FAILED,
      durationMs: 330,
      totalTokens: 0,
      stepOrder: 2,
      errorDetails: { message: 'Database connection failed' },
    });

    const result = await comparisonsService.compareRuns('exec-success', 'exec-fail');

    expect(result.divergencePoint).toBeDefined();
    expect(result.divergencePoint?.stepKey).toBe('step_2');
    expect(result.divergencePoint?.reason).toContain("Status diverged: Base was 'COMPLETED', Target became 'FAILED'");
    expect(result.metricsDelta.successDiff).toBe(true);
    expect(result.stepComparisons.length).toBe(2);
    expect(result.stepComparisons[1].isDivergencePoint).toBe(true);
  });
});
