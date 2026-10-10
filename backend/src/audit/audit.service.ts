import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AuditLog, AuditLogDocument } from '../database/schemas/audit-log.schema';
import { MemoryStoreService } from '../database/memory-store.service';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
    private readonly memoryStore: MemoryStoreService,
  ) {}

  async log(data: {
    action: string;
    resourceType: string;
    resourceId: string;
    performedBy: string;
    details: Record<string, any>;
    ipAddress?: string;
  }): Promise<AuditLog> {
    const entry: Partial<AuditLog> = {
      auditId: `aud-${uuidv4().substring(0, 8)}`,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      performedBy: data.performedBy,
      details: data.details,
      ipAddress: data.ipAddress,
      timestamp: new Date(),
    };

    try {
      return await this.auditModel.create(entry);
    } catch {
      return this.memoryStore.insert<AuditLog>('audit_logs', entry as AuditLog);
    }
  }

  async getLogs(query?: { resourceType?: string; resourceId?: string; limit?: number }) {
    const limit = query?.limit ? Number(query.limit) : 50;
    try {
      const filter: any = {};
      if (query?.resourceType) filter.resourceType = query.resourceType;
      if (query?.resourceId) filter.resourceId = query.resourceId;
      const list = await this.auditModel.find(filter).sort({ timestamp: -1 }).limit(limit);
      if (list && list.length > 0) return list;
    } catch {
      // Fallback
    }

    return this.memoryStore.find<AuditLog>(
      'audit_logs',
      (a) => {
        if (query?.resourceType && a.resourceType !== query.resourceType) return false;
        if (query?.resourceId && a.resourceId !== query.resourceId) return false;
        return true;
      },
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      limit,
    );
  }
}
