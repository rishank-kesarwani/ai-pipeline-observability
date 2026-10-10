import { CheckpointsService } from './checkpoints.service';
import { MemoryStoreService } from '../database/memory-store.service';
import {
  RecoveryActionType,
  RecoveryApprovalStatus,
  StepType,
  StepStatus,
  ExecutionStatus,
} from '../common/types';

describe('CheckpointsService', () => {
  let checkpointsService: CheckpointsService;
  let memoryStore: MemoryStoreService;

  beforeEach(() => {
    memoryStore = new MemoryStoreService();

    // Mock models that delegate to memoryStore
    const mockModel: any = {
      create: jest.fn().mockImplementation((doc) => {
        throw new Error('Mongo offline, fallback to memoryStore');
      }),
      findOne: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline, fallback to memoryStore');
      }),
      find: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline, fallback to memoryStore');
      }),
      updateOne: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline, fallback to memoryStore');
      }),
    };

    checkpointsService = new CheckpointsService(
      mockModel,
      mockModel,
      mockModel,
      mockModel,
      mockModel,
      memoryStore,
    );
  });

  it('should create and retrieve durable checkpoints', async () => {
    const cp = await checkpointsService.createCheckpoint({
      checkpointId: 'chk-test-1',
      executionId: 'exec-test-1',
      workflowId: 'test-workflow',
      stepKey: 'step_classify',
      stepOrder: 2,
      stateSnapshot: { intent: 'REFUND_ORDER', amount: 50.0 },
      completedStepKeys: ['step_ingest', 'step_classify'],
    });

    expect(cp.checkpointId).toBe('chk-test-1');
    expect(cp.stateSnapshot).toEqual({ intent: 'REFUND_ORDER', amount: 50.0 });

    const list = await checkpointsService.getCheckpoints('exec-test-1');
    expect(list.length).toBe(1);
    expect(list[0].checkpointId).toBe('chk-test-1');
  });

  it('should require operator approval before replaying non-idempotent side-effecting steps', async () => {
    // 1. Seed execution
    memoryStore.insert('executions', {
      executionId: 'exec-order-1',
      workflowId: 'checkout-pipeline',
      workflowName: 'Checkout Order Pipeline',
      status: ExecutionStatus.FAILED,
    });

    // 2. Seed trace steps: Step 1 (idempotent completed), Step 2 (non-idempotent failed)
    memoryStore.insert('trace_steps', {
      stepId: 'stp-1',
      executionId: 'exec-order-1',
      stepKey: 'calculate_tax',
      type: StepType.DATA_TRANSFORM,
      status: StepStatus.COMPLETED,
      isIdempotent: true,
      stepOrder: 1,
    });

    memoryStore.insert('trace_steps', {
      stepId: 'stp-2',
      executionId: 'exec-order-1',
      stepKey: 'charge_credit_card',
      type: StepType.TOOL_EXECUTION,
      status: StepStatus.FAILED,
      isIdempotent: false, // NON-IDEMPOTENT!
      requiresApprovalToReplay: true,
      sideEffectDescription: 'Charged $120.00 to Visa card via external gateway',
      stepOrder: 2,
    });

    // 3. Seed checkpoint after step 1
    await checkpointsService.createCheckpoint({
      checkpointId: 'chk-order-step1',
      executionId: 'exec-order-1',
      workflowId: 'checkout-pipeline',
      stepKey: 'calculate_tax',
      stepOrder: 1,
      stateSnapshot: { taxRate: 0.08, total: 120.0 },
      completedStepKeys: ['calculate_tax'],
    });

    // 4. Initiate recovery
    const recovery = await checkpointsService.initiateRecovery(
      {
        executionId: 'exec-order-1',
        checkpointId: 'chk-order-step1',
        actionType: RecoveryActionType.RESUME_FROM_CHECKPOINT,
      },
      { userId: 'operator-1' },
    );

    // Operator approval MUST be required
    expect(recovery.requiresOperatorApproval).toBe(true);
    expect(recovery.status).toBe(RecoveryApprovalStatus.PENDING_OPERATOR_APPROVAL);
    expect(recovery.isIdempotent).toBe(false);
  });

  it('should resume partially completed workflow without rerunning completed non-idempotent steps', async () => {
    // Scenario:
    // Step 1: calculate_totals (idempotent, completed)
    // Step 2: charge_deposit (NON-IDEMPOTENT, COMPLETED, checkpointed!)
    // Step 3: notify_warehouse (failed)
    memoryStore.insert('executions', {
      executionId: 'exec-partial-1',
      workflowId: 'warehouse-fulfillment',
      workflowName: 'Warehouse Fulfillment',
      status: ExecutionStatus.FAILED,
    });

    memoryStore.insert('trace_steps', {
      stepId: 'stp-1',
      executionId: 'exec-partial-1',
      stepKey: 'calculate_totals',
      status: StepStatus.COMPLETED,
      isIdempotent: true,
      stepOrder: 1,
    });

    memoryStore.insert('trace_steps', {
      stepId: 'stp-2',
      executionId: 'exec-partial-1',
      stepKey: 'charge_deposit',
      status: StepStatus.COMPLETED,
      isIdempotent: false, // NON-IDEMPOTENT, but already completed!
      requiresApprovalToReplay: true,
      sideEffectDescription: 'Deposit charged to customer account',
      stepOrder: 2,
    });

    memoryStore.insert('trace_steps', {
      stepId: 'stp-3',
      executionId: 'exec-partial-1',
      stepKey: 'notify_warehouse',
      status: StepStatus.FAILED,
      isIdempotent: true,
      stepOrder: 3,
    });

    // Checkpoint saved AFTER step 2!
    await checkpointsService.createCheckpoint({
      checkpointId: 'chk-after-deposit',
      executionId: 'exec-partial-1',
      workflowId: 'warehouse-fulfillment',
      stepKey: 'charge_deposit',
      stepOrder: 2,
      stateSnapshot: { depositPaid: true, chargeId: 'ch_deposit_999' },
      completedStepKeys: ['calculate_totals', 'charge_deposit'], // charge_deposit is in completed list!
    });

    // Initiate recovery: pending step is notify_warehouse (idempotent)
    const recovery = await checkpointsService.initiateRecovery(
      {
        executionId: 'exec-partial-1',
        checkpointId: 'chk-after-deposit',
        actionType: RecoveryActionType.RESUME_FROM_CHECKPOINT,
      },
      { userId: 'operator-1' },
    );

    // Because the non-idempotent step was already completed in the checkpoint,
    // only the pending step (notify_warehouse) is replayed, which is idempotent!
    expect(recovery.requiresOperatorApproval).toBe(false);
    expect(recovery.status).toBe(RecoveryApprovalStatus.APPROVED);
    expect(recovery.resumedExecutionId).toBeDefined();

    // Verify resumed execution carried over step 2 with restoredFromCheckpoint metadata and did NOT re-run it
    const resumedSteps = memoryStore.find<any>('trace_steps', (s) => s.executionId === recovery.resumedExecutionId);
    expect(resumedSteps.length).toBe(3);
    const restoredDepositStep = resumedSteps.find((s: any) => s.stepKey === 'charge_deposit');
    expect(restoredDepositStep.metadata.restoredFromCheckpoint).toBe('chk-after-deposit');
    expect(restoredDepositStep.status).toBe(StepStatus.COMPLETED);
  });
});
