import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { StepType, StepStatus } from '../../common/types';

export interface StepErrorDetails {
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  category?: string;
}

export type TraceStepDocument = TraceStep & Document;

@Schema({ timestamps: true, collection: 'trace_steps' })
export class TraceStep {
  @Prop({ required: true, unique: true, index: true })
  stepId: string;

  @Prop({ required: true, index: true })
  executionId: string;

  @Prop({ required: true, index: true })
  workflowId: string;

  @Prop({ required: true, index: true })
  stepKey: string;

  @Prop()
  name: string;

  @Prop({ index: true })
  parentStepKey?: string;

  @Prop({ index: true })
  parentStepId?: string;

  @Prop({ default: 0 })
  stepOrder: number;

  @Prop({ default: 0 })
  depth: number;

  @Prop({ required: true, enum: StepType, default: StepType.LLM_CALL })
  type: StepType;

  @Prop({ required: true, enum: StepStatus, default: StepStatus.RUNNING, index: true })
  status: StepStatus;

  @Prop()
  model?: string;

  @Prop()
  provider?: string;

  @Prop({ default: true })
  isIdempotent: boolean;

  @Prop({ default: false })
  requiresApprovalToReplay: boolean;

  @Prop()
  sideEffectDescription?: string;

  @Prop({ type: Object, default: {} })
  inputPayload: Record<string, any>;

  @Prop({ type: Object, default: {} })
  outputPayload?: Record<string, any>;

  @Prop({ type: Object })
  errorDetails?: StepErrorDetails;

  @Prop({ default: 0 })
  promptTokens: number;

  @Prop({ default: 0 })
  completionTokens: number;

  @Prop({ default: 0 })
  totalTokens: number;

  @Prop({ default: 0 })
  estimatedCostUsd: number;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ default: 0 })
  durationMs: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const TraceStepSchema = SchemaFactory.createForClass(TraceStep);
TraceStepSchema.index({ executionId: 1, stepOrder: 1 });
TraceStepSchema.index({ executionId: 1, parentStepKey: 1 });
TraceStepSchema.index({ executionId: 1, status: 1 });
