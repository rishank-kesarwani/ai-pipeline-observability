import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StepType } from '../../common/types';

export class StepDefinitionDto {
  @ApiProperty({ example: 'prompt_builder' })
  @IsString()
  @IsNotEmpty()
  stepKey: string;

  @ApiProperty({ example: 'Prompt Assembly & Context Injection' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: StepType, example: StepType.LLM_CALL })
  @IsEnum(StepType)
  type: StepType;

  @ApiProperty({ example: true, description: 'Whether this step can be safely retried without side effects' })
  @IsBoolean()
  isIdempotent: boolean;

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @IsNumber()
  timeoutMs?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @ApiPropertyOptional({ example: ['retrieve_context'] })
  @IsOptional()
  @IsArray()
  dependencies?: string[];

  @ApiPropertyOptional({ example: 'Dispatches external payment refund via Stripe API' })
  @IsOptional()
  @IsString()
  sideEffectDescription?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this step requires human operator confirmation before replaying' })
  @IsOptional()
  @IsBoolean()
  requiresApprovalToReplay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class RecoveryPolicyDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  autoResumeMaxAttempts?: number = 2;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requireApprovalForNonIdempotent?: boolean = true;

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @IsNumber()
  backoffMs?: number = 2000;
}

export class CreateWorkflowDto {
  @ApiProperty({ example: 'customer-support-agent' })
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @ApiProperty({ example: 'Customer Support Autonomous Resolution Agent' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Triages customer tickets, executes refunds, and generates personalized responses' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ example: 'support-core' })
  @IsOptional()
  @IsString()
  project?: string;

  @ApiProperty({ type: [StepDefinitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDefinitionDto)
  steps: StepDefinitionDto[];

  @ApiPropertyOptional({ type: RecoveryPolicyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecoveryPolicyDto)
  recoveryPolicy?: RecoveryPolicyDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ example: ['agent', 'support', 'production'] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}
