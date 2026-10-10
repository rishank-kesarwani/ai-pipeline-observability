import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Workflow, WorkflowSchema } from './schemas/workflow.schema';
import { Execution, ExecutionSchema } from './schemas/execution.schema';
import { TraceStep, TraceStepSchema } from './schemas/trace-step.schema';
import { FailureCluster, FailureClusterSchema } from './schemas/failure-cluster.schema';
import { Checkpoint, CheckpointSchema } from './schemas/checkpoint.schema';
import { RecoveryAction, RecoveryActionSchema } from './schemas/recovery-action.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { User, UserSchema } from './schemas/user.schema';
import { MemoryStoreService } from './memory-store.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
      { name: Execution.name, schema: ExecutionSchema },
      { name: TraceStep.name, schema: TraceStepSchema },
      { name: FailureCluster.name, schema: FailureClusterSchema },
      { name: Checkpoint.name, schema: CheckpointSchema },
      { name: RecoveryAction.name, schema: RecoveryActionSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [MemoryStoreService],
  exports: [MongooseModule, MemoryStoreService],
})
export class DatabaseModule {}
