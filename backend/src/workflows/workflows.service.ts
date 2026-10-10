import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workflow, WorkflowDocument } from '../database/schemas/workflow.schema';
import { MemoryStoreService } from '../database/memory-store.service';
import { CreateWorkflowDto } from './dto/workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    private readonly memoryStore: MemoryStoreService,
  ) {}

  async create(dto: CreateWorkflowDto, tenantId = 'default'): Promise<Workflow> {
    const existing = await this.findOne(dto.workflowId).catch(() => null);
    if (existing) {
      throw new ConflictException(`Workflow '${dto.workflowId}' already exists`);
    }

    const newWorkflow: Partial<Workflow> = {
      ...dto,
      project: dto.project || 'default-project',
      tenantId,
      version: dto.version || '1.0.0',
      isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
      tags: dto.tags || [],
      recoveryPolicy: {
        autoResumeMaxAttempts: dto.recoveryPolicy?.autoResumeMaxAttempts ?? 2,
        requireApprovalForNonIdempotent:
          dto.recoveryPolicy?.requireApprovalForNonIdempotent ?? true,
        backoffMs: dto.recoveryPolicy?.backoffMs ?? 2000,
      },
    };

    try {
      return await this.workflowModel.create(newWorkflow);
    } catch {
      return this.memoryStore.insert<Workflow>('workflows', newWorkflow as Workflow);
    }
  }

  async findAll(query?: { project?: string; tenantId?: string }, user?: any): Promise<Workflow[]> {
    let effectiveTenantId = 'default';
    if (user && !user.isAnonymous) {
      if (user.roles?.includes('admin') || user.roles?.includes('operator')) {
        effectiveTenantId = query?.tenantId || user.tenantId || 'default';
      } else {
        if (query?.tenantId && query.tenantId !== user.tenantId) {
          throw new ForbiddenException(
            `Cross-tenant access forbidden. You cannot access tenant '${query.tenantId}'`,
          );
        }
        effectiveTenantId = user.tenantId || 'default';
      }
    } else {
      if (query?.tenantId && query.tenantId !== 'default') {
        throw new ForbiddenException(
          'Anonymous visitors are restricted to public demo workflows. Please sign in.',
        );
      }
      effectiveTenantId = 'default';
    }

    try {
      const filter: any = {};
      if (query?.project) filter.project = query.project;
      if (effectiveTenantId) filter.tenantId = effectiveTenantId;
      const list = await this.workflowModel.find(filter).sort({ createdAt: -1 });
      if (list && list.length > 0) return list;
    } catch {
      // Use fallback
    }

    return this.memoryStore.find<Workflow>(
      'workflows',
      (w) => {
        if (query?.project && w.project !== query.project) return false;
        if (effectiveTenantId && (w.tenantId || 'default') !== effectiveTenantId) return false;
        return true;
      },
      (a, b) => ((b.createdAt || 0) > (a.createdAt || 0) ? 1 : -1),
    );
  }

  async findOne(workflowId: string, user?: any): Promise<Workflow> {
    let foundItem: Workflow | null = null;
    try {
      const found = await this.workflowModel.findOne({ workflowId });
      if (found) foundItem = found;
    } catch {
      // Use fallback
    }

    if (!foundItem) {
      foundItem = this.memoryStore.findOne<Workflow>(
        'workflows',
        (w) => w.workflowId === workflowId,
      );
    }

    if (!foundItem) {
      throw new NotFoundException(`Workflow '${workflowId}' not found`);
    }

    const itemTenant = foundItem.tenantId || 'default';
    if (!user || user.isAnonymous) {
      if (itemTenant !== 'default') {
        throw new ForbiddenException(
          'Anonymous visitors are restricted to public demo workflows. Please sign in.',
        );
      }
    } else if (!user.roles?.includes('admin') && !user.roles?.includes('operator')) {
      if (itemTenant !== user.tenantId && itemTenant !== 'default') {
        throw new ForbiddenException(
          `Access denied to workflow belonging to tenant '${itemTenant}'`,
        );
      }
    }

    return foundItem;
  }
}
