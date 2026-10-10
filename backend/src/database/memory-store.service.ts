import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface MemoryCollection<T> {
  data: Map<string, T>;
}

@Injectable()
export class MemoryStoreService {
  private readonly logger = new Logger(MemoryStoreService.name);
  public readonly collections: Map<string, Map<string, any>> = new Map();

  constructor() {
    this.initCollection('workflows');
    this.initCollection('executions');
    this.initCollection('trace_steps');
    this.initCollection('failure_clusters');
    this.initCollection('checkpoints');
    this.initCollection('recovery_actions');
    this.initCollection('audit_logs');
    this.initCollection('users');
  }

  private initCollection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
  }

  getCollection(name: string): Map<string, any> {
    this.initCollection(name);
    return this.collections.get(name)!;
  }

  insert<T extends Record<string, any>>(collectionName: string, item: T): T {
    const col = this.getCollection(collectionName);
    let id = item.id || item._id;
    if (!id) {
      if (collectionName === 'trace_steps') id = item.stepId;
      else if (collectionName === 'executions') id = item.executionId;
      else if (collectionName === 'workflows') id = item.workflowId;
      else if (collectionName === 'failure_clusters') id = item.clusterId || item.signatureHash;
      else if (collectionName === 'checkpoints') id = item.checkpointId;
      else if (collectionName === 'recovery_actions') id = item.recoveryId;
      else if (collectionName === 'audit_logs') id = item.auditId;
      else if (collectionName === 'users') id = item.userId;
    }
    if (!id) {
      id = uuidv4();
    }

    const record = {
      ...item,
      _id: id,
      createdAt: item.createdAt || new Date(),
      updatedAt: new Date(),
    };
    col.set(String(id), record);
    return record;
  }

  find<T>(
    collectionName: string,
    predicate?: (item: any) => boolean,
    sortFn?: (a: any, b: any) => number,
    limit?: number,
    offset = 0,
  ): T[] {
    const col = this.getCollection(collectionName);
    let items = Array.from(col.values());
    if (predicate) {
      items = items.filter(predicate);
    }
    if (sortFn) {
      items = items.sort(sortFn);
    }
    if (offset > 0) {
      items = items.slice(offset);
    }
    if (limit && limit > 0) {
      items = items.slice(0, limit);
    }
    return items as T[];
  }

  findOne<T>(
    collectionName: string,
    predicate: (item: any) => boolean,
  ): T | null {
    const col = this.getCollection(collectionName);
    for (const item of col.values()) {
      if (predicate(item)) return item as T;
    }
    return null;
  }

  updateOne(
    collectionName: string,
    predicate: (item: any) => boolean,
    update: Record<string, any>,
  ): any | null {
    const col = this.getCollection(collectionName);
    for (const [key, item] of col.entries()) {
      if (predicate(item)) {
        const updated = {
          ...item,
          ...update,
          updatedAt: new Date(),
        };
        col.set(key, updated);
        return updated;
      }
    }
    return null;
  }

  delete(collectionName: string, predicate: (item: any) => boolean): number {
    const col = this.getCollection(collectionName);
    let count = 0;
    for (const [key, item] of col.entries()) {
      if (predicate(item)) {
        col.delete(key);
        count++;
      }
    }
    return count;
  }
}
