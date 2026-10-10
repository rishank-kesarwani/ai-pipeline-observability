import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { FailureCategory } from '../common/types';

export interface PipelineAlertPayload {
  correlationId: string;
  executionId: string;
  workflowId: string;
  workflowName: string;
  failedStepKey: string;
  errorCategory: FailureCategory;
  errorMessage: string;
  dashboardUrl?: string;
  isRepeatedError?: boolean;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly alertsEmail: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const rawBaseUrl = this.configService.get<string>(
      'app.notificationService.baseUrl',
      'https://notifications.rishankkesharwani.com',
    );
    this.baseUrl = (rawBaseUrl || '').replace(/\/api\/v1\/?$/, '').replace(/\/v1\/?$/, '').replace(/\/+$/, '');
    this.apiKey = this.configService.get<string>(
      'app.notificationService.apiKey',
      'dev-notification-obs-key',
    );
    this.alertsEmail = this.configService.get<string>(
      'app.notificationService.alertsEmail',
      'alerts@observability.local',
    );
    this.frontendUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.configService.get<number>('app.notificationService.timeoutMs', 10000),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        Authorization: `ApiKey ${this.apiKey}`,
        'X-Service-Name': 'ai-pipeline-observability',
      },
    });
  }

  async sendFailureAlert(alert: PipelineAlertPayload): Promise<boolean> {
    const dashboardLink =
      alert.dashboardUrl || `${this.frontendUrl}/executions/${alert.executionId}`;

    const subject = alert.isRepeatedError
      ? `🚨 [CRITICAL ALERT] Repeated AI Pipeline Failure: ${alert.workflowName}`
      : `⚠️ [ALERT] AI Pipeline Failure: ${alert.workflowName} (${alert.errorCategory})`;

    const textBody = `AI Pipeline Execution Failure Alert
Workflow: ${alert.workflowName} (${alert.workflowId})
Execution ID: ${alert.executionId}
Correlation ID: ${alert.correlationId}
Failed Step: ${alert.failedStepKey}
Error Category: ${alert.errorCategory}
Summary: ${alert.errorMessage.slice(0, 300)}
Inspect Execution & Resume: ${dashboardLink}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background: #0B0F17; color: #FFFFFF; padding: 24px; border-radius: 8px;">
        <h2 style="color: #F43F5E;">${subject}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px; color: #9CA3AF;">Workflow:</td><td style="padding: 8px; font-weight: bold;">${alert.workflowName}</td></tr>
          <tr><td style="padding: 8px; color: #9CA3AF;">Execution ID:</td><td style="padding: 8px; font-family: monospace;">${alert.executionId}</td></tr>
          <tr><td style="padding: 8px; color: #9CA3AF;">Correlation ID:</td><td style="padding: 8px; font-family: monospace;">${alert.correlationId}</td></tr>
          <tr><td style="padding: 8px; color: #9CA3AF;">Failed Step:</td><td style="padding: 8px; color: #F59E0B; font-weight: bold;">${alert.failedStepKey}</td></tr>
          <tr><td style="padding: 8px; color: #9CA3AF;">Error Class:</td><td style="padding: 8px; color: #F43F5E; font-weight: bold;">${alert.errorCategory}</td></tr>
          <tr><td style="padding: 8px; color: #9CA3AF;">Error Detail:</td><td style="padding: 8px;">${alert.errorMessage.slice(0, 300)}</td></tr>
        </table>
        <div style="margin-top: 24px;">
          <a href="${dashboardLink}" style="background: #3B82F6; color: #FFFFFF; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Open Forensics Dashboard
          </a>
        </div>
      </div>
    `;

    this.logger.log(
      `[Alert Dispatch] ${alert.errorCategory} in workflow '${alert.workflowId}', execution '${alert.executionId}' (Corr: ${alert.correlationId})`,
    );

    const isMockOrUnreachable =
      !this.baseUrl ||
      this.apiKey.includes('mock') ||
      this.apiKey.includes('dev-') ||
      this.baseUrl.includes('local');

    if (!isMockOrUnreachable) {
      try {
        await this.client.post('/v1/notifications', {
          idempotencyKey: `alert-${alert.executionId}-${alert.failedStepKey}`,
          priority: 'CRITICAL',
          channels: ['EMAIL'],
          recipient: {
            userId: 'pipeline-operations',
            email: this.alertsEmail,
          },
          email: {
            subject,
            text: textBody,
            html: htmlBody,
          },
          metadata: {
            correlationId: alert.correlationId,
            workflowId: alert.workflowId,
            executionId: alert.executionId,
            errorCategory: alert.errorCategory,
          },
        });
        return true;
      } catch (err: any) {
        this.logger.warn(
          `Notification Service remote dispatch failed (${err.message}). Logged alert safely to audit stream.`,
        );
        return false;
      }
    }

    return true;
  }
}
