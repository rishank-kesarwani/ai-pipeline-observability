import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ExecutionsService } from './executions.service';
import {
  CreateExecutionDto,
  IngestTraceStepDto,
  BulkIngestExecutionDto,
  ExecutionFilterDto,
} from './dto/execution.dto';
import { Public, CorrelationId, CurrentUser } from '../common/decorators';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { HEADERS } from '../common/constants';

@ApiTags('Executions & Tracing')
@Controller('executions')
@UseGuards(OptionalJwtAuthGuard)
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post()
  @ApiOperation({ summary: 'Register or start a new AI pipeline execution' })
  @ApiResponse({ status: 201, description: 'Execution registered' })
  async createExecution(
    @Body() dto: CreateExecutionDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.executionsService.createExecution(dto, tenantId);
  }

  @Post('ingest')
  @ApiOperation({
    summary: 'Bulk ingest complete execution trace with hierarchical steps',
  })
  @ApiHeader({ name: HEADERS.IDEMPOTENCY_KEY, required: false })
  async bulkIngest(
    @Body() dto: BulkIngestExecutionDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.executionsService.bulkIngest(dto, correlationId);
  }

  @Post(':id/steps')
  @ApiOperation({ summary: 'Ingest individual trace step event with telemetry' })
  async ingestStep(
    @Param('id') executionId: string,
    @Body() dto: IngestTraceStepDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.executionsService.ingestStep(executionId, dto, correlationId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search and filter executions across projects and status' })
  async findAll(@Query() filter: ExecutionFilterDto) {
    return this.executionsService.findAll(filter);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get execution details, step traces, checkpoints, and failure forensics',
  })
  async findOne(@Param('id') id: string) {
    return this.executionsService.findOne(id);
  }

  @Public()
  @Get(':id/timeline')
  @ApiOperation({
    summary: 'Get hierarchical flamegraph / execution tree timeline with durations',
  })
  async getTimeline(@Param('id') id: string) {
    return this.executionsService.getTimeline(id);
  }
}
