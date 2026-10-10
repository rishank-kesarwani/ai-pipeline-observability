import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ExecutionStatus, FailureCategory } from '../../common/types';

export type ExecutionDocument = Execution & Document;

@Schema({ timestamps: true, collection: 'executions' })
export class Execution {
  @Prop({ required: true, unique: true, index: true })
  executionId: string;

  @Prop({ required: true, index: true })
  workflowId: string;

  @Prop({ required: true })
  workflowName: string;

  @Prop({ default: 'default-project', index: true })
  project: string;

  @Prop({ default: 'default', index: true })
  tenantId: string;

  @Prop({
    required: true,
    enum: ExecutionStatus,
    default: ExecutionStatus.RUNNING,
  })
  status: ExecutionStatus;

  @Prop({ default: 'system' })
  initiatedBy: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ default: 0 })
  durationMs: number;

  @Prop({ default: 0 })
  totalPromptTokens: number;

  @Prop({ default: 0 })
  totalCompletionTokens: number;

  @Prop({ default: 0 })
  totalTokens: number;

  @Prop({ default: 0 })
  estimatedCostUsd: number;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ enum: FailureCategory, index: true })
  failureCategory?: FailureCategory;

  @Prop()
  errorSignature?: string;

  @Prop({ index: true })
  errorSignatureHash?: string;

  @Prop({ default: false })
  isRecovered: boolean;

  @Prop()
  recoveredFromExecutionId?: string;

  @Prop()
  lastValidCheckpointId?: string;

  @Prop({ type: Array, default: [] })
  tags: string[];

  @Prop({ type: Object, default: {} })
  inputPayload: Record<string, any>;

  @Prop({ type: Object, default: {} })
  outputPayload?: Record<string, any>;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const ExecutionSchema = SchemaFactory.createForClass(Execution);
ExecutionSchema.index({ project: 1, status: 1, startTime: -1 });
ExecutionSchema.index({ failureCategory: 1, startTime: -1 });
ExecutionSchema.index({ errorSignatureHash: 1, startTime: -1 });
