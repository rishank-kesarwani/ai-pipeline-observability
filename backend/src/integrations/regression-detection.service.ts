import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface WorkflowEvaluationTriggerRequest {
  workflowId: string;
  project: string;
  datasetId?: string;
  candidateModel: string;
  baselineModel?: string;
}

@Injectable()
export class RegressionDetectionService {
  private readonly logger = new Logger(RegressionDetectionService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const rawBaseUrl = this.configService.get<string>(
      'app.modelRegression.baseUrl',
      'https://model-regression.rishankkesharwani.com',
    );
    this.baseUrl = (rawBaseUrl || '').replace(/\/api\/v1\/?$/, '').replace(/\/v1\/?$/, '').replace(/\/+$/, '');
    this.apiKey = this.configService.get<string>(
      'app.modelRegression.apiKey',
      'dev-model-regression-key',
    );

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.configService.get<number>(
        'app.modelRegression.timeoutMs',
        15000,
      ),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'X-Service-Name': 'ai-pipeline-observability',
      },
    });
  }

  async triggerBenchmarkEvaluation(
    req: WorkflowEvaluationTriggerRequest,
  ): Promise<{ runId: string; status: string; message: string }> {
    const isMockOrUnreachable =
      !this.baseUrl ||
      this.apiKey.includes('mock') ||
      this.apiKey.includes('dev-') ||
      this.baseUrl.includes('local');

    if (!isMockOrUnreachable) {
      try {
        const res = await this.client.post('/api/v1/evaluations', {
          project: req.project,
          datasetId: req.datasetId || `${req.workflowId}-benchmark`,
          model: req.candidateModel,
          baselineModel: req.baselineModel || 'gemini-1.5-flash',
          description: `Triggered from AI Pipeline Observability for workflow ${req.workflowId}`,
        });
        return {
          runId: res.data?.data?._id || res.data?._id || `eval-run-${Date.now()}`,
          status: 'INITIATED',
          message: 'Model regression evaluation successfully initiated on external service',
        };
      } catch (err: any) {
        this.logger.warn(
          `Model Regression Service remote invocation failed (${err.message}). Using simulated evaluation response.`,
        );
      }
    }

    return {
      runId: `eval-sim-${Date.now().toString(36)}`,
      status: 'INITIATED',
      message: `Simulated benchmark initiated for workflow ${req.workflowId} on candidate ${req.candidateModel}`,
    };
  }
}
