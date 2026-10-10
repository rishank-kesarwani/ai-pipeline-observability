import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FailuresService } from './failures.service';
import { FailureCategory } from '../common/types';
import { Public } from '../common/decorators';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

@ApiTags('Failure Forensics & Clustering')
@Controller('failures')
@UseGuards(OptionalJwtAuthGuard)
export class FailuresController {
  constructor(private readonly failuresService: FailuresService) {}

  @Public()
  @Get('clusters')
  @ApiOperation({
    summary: 'List aggregated failure clusters grouped by normalized error signatures',
  })
  async getClusters(
    @Query('category') category?: FailureCategory,
    @Query('limit') limit?: number,
  ) {
    return this.failuresService.getClusters({
      category,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Public()
  @Get('clusters/:hash')
  @ApiOperation({
    summary: 'Get details, root-cause hypotheses, and sample runs for a specific error cluster',
  })
  async getClusterDetails(@Param('hash') hash: string) {
    return this.failuresService.getClusterByHash(hash);
  }
}
