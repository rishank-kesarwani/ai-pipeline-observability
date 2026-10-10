import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Public } from '../common/decorators';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

@ApiTags('Audit Trail')
@Controller('audit')
@UseGuards(OptionalJwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get immutable audit trail of operator approvals and recovery events',
  })
  async getLogs(
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getLogs({ resourceType, resourceId, limit });
  }
}
