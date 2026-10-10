import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RecoveryActionType, RecoveryApprovalStatus } from '../../common/types';

export interface OperatorApprovalData {
  approvedBy: string;
  approvedAt: Date;
  rationale: string;
  riskAssessment?: string;
  signature?: string;
}

export type RecoveryActionDocument = RecoveryAction & Document;

@Schema({ timestamps: true, collection: 'recovery_actions' })
export class RecoveryAction {
  @Prop({ required: true, unique: true, index: true })
  recoveryId: string;

  @Prop({ required: true, index: true })
  executionId: string;

  @Prop({ required: true, index: true })
  workflowId: string;

  @Prop({ required: true, enum: RecoveryActionType })
  actionType: RecoveryActionType;

  @Prop()
  checkpointId?: string;

  @Prop()
  targetStepKey?: string;

  @Prop({
    required: true,
    enum: RecoveryApprovalStatus,
    default: RecoveryApprovalStatus.NOT_REQUIRED,
    index: true,
  })
  status: RecoveryApprovalStatus;

  @Prop({ default: false })
  requiresOperatorApproval: boolean;

  @Prop({ default: true })
  isIdempotent: boolean;

  @Prop({ type: Object })
  operatorApproval?: OperatorApprovalData;

  @Prop()
  initiatedBy: string;

  @Prop()
  resumedExecutionId?: string;

  @Prop({ type: Object, default: {} })
  payloadOverrides?: Record<string, any>;

  @Prop()
  notes?: string;
}

export const RecoveryActionSchema = SchemaFactory.createForClass(RecoveryAction);
RecoveryActionSchema.index({ executionId: 1, createdAt: -1 });
