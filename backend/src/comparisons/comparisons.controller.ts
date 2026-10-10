import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ComparisonsService } from './comparisons.service';
import { OptionalAuth, CurrentUser } from '../common/decorators';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

@ApiTags('Run Comparisons & Diff')
@Controller('comparisons')
@UseGuards(OptionalJwtAuthGuard)
export class ComparisonsController {
  constructor(private readonly comparisonsService: ComparisonsService) {}

  @OptionalAuth()
  @Get()
  @ApiOperation({
    summary: 'Compare two execution runs side-by-side with step divergence and metrics diff',
  })
  @ApiQuery({ name: 'baseRunId', required: true, example: 'exec-8890-success' })
  @ApiQuery({ name: 'targetRunId', required: true, example: 'exec-8890-failed' })
  async compareRuns(
    @Query('baseRunId') baseRunId: string,
    @Query('targetRunId') targetRunId: string,
    @CurrentUser() user: any,
  ) {
    return this.comparisonsService.compareRuns(baseRunId, targetRunId, user);
  }
}
