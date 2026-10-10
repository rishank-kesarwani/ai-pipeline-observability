import { Module } from '@nestjs/common';
import { AiPlatformService } from './ai-platform.service';
import { NotificationService } from './notification.service';
import { RegressionDetectionService } from './regression-detection.service';

@Module({
  providers: [AiPlatformService, NotificationService, RegressionDetectionService],
  exports: [AiPlatformService, NotificationService, RegressionDetectionService],
})
export class IntegrationsModule {}
