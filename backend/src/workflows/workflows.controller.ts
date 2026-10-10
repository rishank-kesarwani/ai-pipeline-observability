import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/workflow.dto';
import { Public, CurrentUser } from '../common/decorators';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(OptionalJwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new observable AI workflow definition' })
  @ApiResponse({ status: 201, description: 'Workflow registered' })
  async create(@Body() dto: CreateWorkflowDto, @CurrentUser('tenantId') tenantId: string) {
    return this.workflowsService.create(dto, tenantId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all registered workflow definitions' })
  async findAll(
    @Query('project') project?: string,
    @CurrentUser('tenantId') tenantId?: string,
  ) {
    return this.workflowsService.findAll({ project, tenantId });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get details and step specifications of a workflow' })
  async findOne(@Param('id') id: string) {
    return this.workflowsService.findOne(id);
  }
}
