import { Module } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { FailuresModule } from '../failures/failures.module';
import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [FailuresModule, CheckpointsModule, IntegrationsModule],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
