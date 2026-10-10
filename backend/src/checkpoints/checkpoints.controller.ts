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
import { CheckpointsService } from './checkpoints.service';
import {
  CreateCheckpointDto,
  InitiateRecoveryDto,
  ApproveRecoveryDto,
} from './dto/recovery.dto';
import { Public, CurrentUser } from '../common/decorators';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Checkpoints & Recovery')
@Controller()
@UseGuards(OptionalJwtAuthGuard)
export class CheckpointsController {
  constructor(private readonly checkpointsService: CheckpointsService) {}

  @Post('checkpoints')
  @ApiOperation({ summary: 'Save durable workflow checkpoint state snapshot' })
  @ApiResponse({ status: 201, description: 'Checkpoint recorded' })
  async createCheckpoint(@Body() dto: CreateCheckpointDto) {
    return this.checkpointsService.createCheckpoint(dto);
  }

  @Public()
  @Get('checkpoints/execution/:executionId')
  @ApiOperation({ summary: 'List available checkpoints for an execution' })
  async getCheckpoints(@Param('executionId') executionId: string) {
    return this.checkpointsService.getCheckpoints(executionId);
  }

  @Post('recoveries/initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initiate workflow resume or replay from checkpoint with safety guardrails',
  })
  async initiateRecovery(
    @Body() dto: InitiateRecoveryDto,
    @CurrentUser() user: any,
  ) {
    return this.checkpointsService.initiateRecovery(dto, user);
  }

  @Post('recoveries/:recoveryId/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Operator sign-off to execute non-idempotent or side-effecting recovery replay',
  })
  async approveRecovery(
    @Param('recoveryId') recoveryId: string,
    @Body() dto: ApproveRecoveryDto,
    @CurrentUser() user: any,
  ) {
    return this.checkpointsService.approveRecovery(recoveryId, dto, user);
  }

  @Public()
  @Get('recoveries')
  @ApiOperation({ summary: 'List recovery actions and operator approvals' })
  async getRecoveries(@Query('executionId') executionId?: string) {
    return this.checkpointsService.getRecoveries(executionId);
  }
}
