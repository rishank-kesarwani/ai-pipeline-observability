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
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiSecurity } from '@nestjs/swagger';
import { ExecutionsService } from './executions.service';
import {
  CreateExecutionDto,
  IngestTraceStepDto,
  BulkIngestExecutionDto,
  ExecutionFilterDto,
} from './dto/execution.dto';
import { OptionalAuth, CorrelationId, CurrentUser } from '../common/decorators';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { ServiceOrOperatorGuard } from '../common/guards/service-or-operator.guard';
import { HEADERS } from '../common/constants';

@ApiTags('Executions & Tracing')
@Controller('executions')
@UseGuards(OptionalJwtAuthGuard)
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post()
  @UseGuards(ServiceOrOperatorGuard)
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Register or start a new AI pipeline execution (Internal Service / Operator only)' })
  @ApiResponse({ status: 201, description: 'Execution registered' })
  async createExecution(
    @Body() dto: CreateExecutionDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.executionsService.createExecution(dto, tenantId);
  }

  @Post('ingest')
  @UseGuards(ServiceOrOperatorGuard)
  @ApiSecurity('x-api-key')
  @ApiOperation({
    summary: 'Bulk ingest complete execution trace with hierarchical steps (Internal Service / Operator only)',
  })
  @ApiHeader({ name: HEADERS.IDEMPOTENCY_KEY, required: false })
  async bulkIngest(
    @Body() dto: BulkIngestExecutionDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.executionsService.bulkIngest(dto, correlationId);
  }

  @Post(':id/steps')
  @UseGuards(ServiceOrOperatorGuard)
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Ingest individual trace step event with telemetry (Internal Service / Operator only)' })
  async ingestStep(
    @Param('id') executionId: string,
    @Body() dto: IngestTraceStepDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.executionsService.ingestStep(executionId, dto, correlationId);
  }

  @OptionalAuth()
  @Get()
  @ApiOperation({ summary: 'Search and filter executions across projects and status' })
  async findAll(@Query() filter: ExecutionFilterDto, @CurrentUser() user: any) {
    return this.executionsService.findAll(filter, user);
  }

  @OptionalAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get execution details, step traces, checkpoints, and failure forensics',
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.executionsService.findOne(id, user);
  }

  @OptionalAuth()
  @Get(':id/timeline')
  @ApiOperation({
    summary: 'Get hierarchical flamegraph / execution tree timeline with durations',
  })
  async getTimeline(@Param('id') id: string, @CurrentUser() user: any) {
    return this.executionsService.getTimeline(id, user);
  }
}
