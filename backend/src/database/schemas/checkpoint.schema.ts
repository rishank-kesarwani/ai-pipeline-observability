import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CheckpointDocument = Checkpoint & Document;

@Schema({ timestamps: true, collection: 'checkpoints' })
export class Checkpoint {
  @Prop({ required: true, unique: true, index: true })
  checkpointId: string;

  @Prop({ required: true, index: true })
  executionId: string;

  @Prop({ required: true, index: true })
  workflowId: string;

  @Prop({ required: true })
  stepKey: string;

  @Prop({ default: 0 })
  stepOrder: number;

  @Prop({ type: Object, default: {} })
  stateSnapshot: Record<string, any>;

  @Prop({ type: Array, default: [] })
  completedStepKeys: string[];

  @Prop({ default: true })
  isValid: boolean;

  @Prop()
  invalidationReason?: string;

  @Prop({ required: true })
  timestamp: Date;
}

export const CheckpointSchema = SchemaFactory.createForClass(Checkpoint);
CheckpointSchema.index({ executionId: 1, stepOrder: -1 });
CheckpointSchema.index({ executionId: 1, isValid: 1 });
