import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Audit Trail')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('operator', 'admin')
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Get immutable audit trail of operator approvals and recovery events (Operator only)',
  })
  async getLogs(
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getLogs({ resourceType, resourceId, limit });
  }
}
