import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { StepType } from '../../common/types';

export interface WorkflowStepDefinition {
  stepKey: string;
  name: string;
  type: StepType;
  isIdempotent: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  dependencies?: string[];
  sideEffectDescription?: string;
  requiresApprovalToReplay?: boolean;
  description?: string;
}

export interface WorkflowRecoveryPolicy {
  autoResumeMaxAttempts: number;
  requireApprovalForNonIdempotent: boolean;
  backoffMs: number;
}

export type WorkflowDocument = Workflow & Document;

@Schema({ timestamps: true, collection: 'workflows' })
export class Workflow {
  @Prop({ required: true, unique: true, index: true })
  workflowId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ default: '1.0.0' })
  version: string;

  @Prop({ default: 'default-project', index: true })
  project: string;

  @Prop({ default: 'default', index: true })
  tenantId: string;

  @Prop({ type: Array, default: [] })
  steps: WorkflowStepDefinition[];

  @Prop({
    type: Object,
    default: {
      autoResumeMaxAttempts: 2,
      requireApprovalForNonIdempotent: true,
      backoffMs: 2000,
    },
  })
  recoveryPolicy: WorkflowRecoveryPolicy;

  @Prop({ default: true })
  isPublic: boolean;

  @Prop({ type: Array, default: [] })
  tags: string[];
}

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);
