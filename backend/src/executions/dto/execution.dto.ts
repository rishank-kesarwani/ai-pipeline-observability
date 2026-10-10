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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StepType, StepStatus, ExecutionStatus, FailureCategory } from '../../common/types';

export class StepTokenUsageDto {
  @ApiPropertyOptional({ example: 450 })
  @IsOptional()
  @IsNumber()
  promptTokens?: number = 0;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  completionTokens?: number = 0;

  @ApiPropertyOptional({ example: 570 })
  @IsOptional()
  @IsNumber()
  totalTokens?: number = 0;
}

export class StepErrorDetailsDto {
  @ApiProperty({ example: 'Stripe API 402: Card declined or insufficient funds' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stack?: string;

  @ApiPropertyOptional({ example: 'CARD_DECLINED' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 402 })
  @IsOptional()
  @IsNumber()
  statusCode?: number;
}

export class IngestTraceStepDto {
  @ApiPropertyOptional({ example: 'stp-101' })
  @IsOptional()
  @IsString()
  stepId?: string;

  @ApiProperty({ example: 'vector_search' })
  @IsString()
  @IsNotEmpty()
  stepKey: string;

  @ApiPropertyOptional({ example: 'Vector Search & Knowledge Retrieval' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'prompt_builder' })
  @IsOptional()
  @IsString()
  parentStepKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentStepId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  stepOrder?: number;

  @ApiProperty({ enum: StepType, example: StepType.RAG_RETRIEVAL })
  @IsEnum(StepType)
  type: StepType;

  @ApiProperty({ enum: StepStatus, example: StepStatus.COMPLETED })
  @IsEnum(StepStatus)
  status: StepStatus;

  @ApiPropertyOptional({ example: 'gemini-1.5-flash' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'google' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: true, description: 'True if operation is safe to replay without duplicate side-effects' })
  @IsOptional()
  @IsBoolean()
  isIdempotent?: boolean = true;

  @ApiPropertyOptional({ example: false, description: 'Requires operator sign-off before replaying' })
  @IsOptional()
  @IsBoolean()
  requiresApprovalToReplay?: boolean = false;

  @ApiPropertyOptional({ example: 'Refunded customer transaction on external payment processor' })
  @IsOptional()
  @IsString()
  sideEffectDescription?: string;

  @ApiPropertyOptional({ example: { query: 'User ticket #4089', topK: 5 } })
  @IsOptional()
  @IsObject()
  inputPayload?: Record<string, any>;

  @ApiPropertyOptional({ example: { documentsFound: 4 } })
  @IsOptional()
  @IsObject()
  outputPayload?: Record<string, any>;

  @ApiPropertyOptional({ type: StepErrorDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StepErrorDetailsDto)
  errorDetails?: StepErrorDetailsDto;

  @ApiPropertyOptional({ type: StepTokenUsageDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StepTokenUsageDto)
  tokens?: StepTokenUsageDto;

  @ApiPropertyOptional({ example: 420, description: 'Step duration in milliseconds' })
  @IsOptional()
  @IsNumber()
  durationMs?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  startTime?: Date | string;

  @ApiPropertyOptional()
  @IsOptional()
  endTime?: Date | string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateExecutionDto {
  @ApiPropertyOptional({ example: 'exec-8890-a' })
  @IsOptional()
  @IsString()
  executionId?: string;

  @ApiProperty({ example: 'customer-support-agent' })
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @ApiPropertyOptional({ example: 'Customer Support Autonomous Resolution Agent' })
  @IsOptional()
  @IsString()
  workflowName?: string;

  @ApiPropertyOptional({ example: 'support-core' })
  @IsOptional()
  @IsString()
  project?: string;

  @ApiPropertyOptional({ example: 'default' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ example: 'system-agent' })
  @IsOptional()
  @IsString()
  initiatedBy?: string;

  @ApiPropertyOptional({ example: { ticketId: 'TCK-9921', customerEmail: 'alice@example.com' } })
  @IsOptional()
  @IsObject()
  inputPayload?: Record<string, any>;

  @ApiPropertyOptional({ example: ['agent', 'support'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BulkIngestExecutionDto {
  @ApiProperty({ type: CreateExecutionDto })
  @ValidateNested()
  @Type(() => CreateExecutionDto)
  execution: CreateExecutionDto;

  @ApiProperty({ type: [IngestTraceStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestTraceStepDto)
  steps: IngestTraceStepDto[];

  @ApiPropertyOptional({ enum: ExecutionStatus, example: ExecutionStatus.COMPLETED })
  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  outputPayload?: Record<string, any>;
}

export class ExecutionFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  project?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional({ enum: ExecutionStatus })
  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @ApiPropertyOptional({ enum: FailureCategory })
  @IsOptional()
  @IsEnum(FailureCategory)
  failureCategory?: FailureCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minLatencyMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxLatencyMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  offset?: number;
}
