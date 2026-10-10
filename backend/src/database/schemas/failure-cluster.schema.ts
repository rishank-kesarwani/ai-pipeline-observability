import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FailureCategory, RootCauseHypothesis, RecoveryRecommendation } from '../../common/types';

export type FailureClusterDocument = FailureCluster & Document;

@Schema({ timestamps: true, collection: 'failure_clusters' })
export class FailureCluster {
  @Prop({ required: true, unique: true, index: true })
  clusterId: string;

  @Prop({ required: true, unique: true, index: true })
  signatureHash: string;

  @Prop({ required: true })
  normalizedSignature: string;

  @Prop({ required: true, enum: FailureCategory, index: true })
  category: FailureCategory;

  @Prop({ default: 1 })
  frequency: number;

  @Prop({ required: true })
  firstSeenAt: Date;

  @Prop({ required: true })
  lastSeenAt: Date;

  @Prop({ type: Array, default: [] })
  affectedWorkflows: string[];

  @Prop({ type: Array, default: [] })
  sampleExecutionIds: string[];

  @Prop({ type: Object })
  rootCauseHypothesis?: RootCauseHypothesis;

  @Prop({ type: Object })
  recoveryRecommendation?: RecoveryRecommendation;
}

export const FailureClusterSchema = SchemaFactory.createForClass(FailureCluster);
FailureClusterSchema.index({ category: 1, frequency: -1 });
FailureClusterSchema.index({ lastSeenAt: -1 });
