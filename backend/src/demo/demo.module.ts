import { Module } from '@nestjs/common';
import { DemoService } from './demo.service';
import { DemoController } from './demo.controller';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ExecutionsModule } from '../executions/executions.module';
import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { FailuresModule } from '../failures/failures.module';

@Module({
  imports: [WorkflowsModule, ExecutionsModule, CheckpointsModule, FailuresModule],
  controllers: [DemoController],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
