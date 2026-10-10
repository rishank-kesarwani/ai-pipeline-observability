import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { RecoveryActionType } from '../../common/types';

export class CreateCheckpointDto {
  @ApiProperty({ example: 'chk-8890-step2' })
  @IsString()
  @IsNotEmpty()
  checkpointId: string;

  @ApiProperty({ example: 'exec-8890-a' })
  @IsString()
  @IsNotEmpty()
  executionId: string;

  @ApiProperty({ example: 'customer-support-agent' })
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @ApiProperty({ example: 'classify_intent' })
  @IsString()
  @IsNotEmpty()
  stepKey: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  stepOrder?: number;

  @ApiPropertyOptional({ example: { intent: 'REFUND_REQUEST', customerTier: 'GOLD', refundAmount: 75.0 } })
  @IsOptional()
  @IsObject()
  stateSnapshot?: Record<string, any>;

  @ApiPropertyOptional({ example: ['ingest_ticket', 'classify_intent'] })
  @IsOptional()
  @IsArray()
  completedStepKeys?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isValid?: boolean = true;
}

export class InitiateRecoveryDto {
  @ApiProperty({ example: 'exec-8890-a' })
  @IsString()
  @IsNotEmpty()
  executionId: string;

  @ApiPropertyOptional({ example: 'chk-8890-step2' })
  @IsOptional()
  @IsString()
  checkpointId?: string;

  @ApiProperty({ enum: RecoveryActionType, example: RecoveryActionType.RESUME_FROM_CHECKPOINT })
  @IsEnum(RecoveryActionType)
  actionType: RecoveryActionType;

  @ApiPropertyOptional({ example: 'Resuming failed support run from step 2 after external gateway recovery' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: { overrideAuthToken: 'refreshed-token' } })
  @IsOptional()
  @IsObject()
  payloadOverrides?: Record<string, any>;
}

export class ApproveRecoveryDto {
  @ApiProperty({ example: 'Sarah Senior Operator' })
  @IsString()
  @IsNotEmpty()
  approvedBy: string;

  @ApiProperty({ example: 'Verified ticket validity and approved one-time retry of non-idempotent Stripe charge tool' })
  @IsString()
  @IsNotEmpty()
  rationale: string;

  @ApiPropertyOptional({ example: 'Low risk: Customer bank account verified, duplicate idempotency key confirmed' })
  @IsOptional()
  @IsString()
  riskAssessment?: string;
}
