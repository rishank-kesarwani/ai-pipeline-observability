import { MemoryStoreService } from './memory-store.service';

export function createMemoryModel(collectionName: string, memoryStore: MemoryStoreService) {
  const model: any = {
    create: async (doc: any) => {
      return memoryStore.insert(collectionName, doc);
    },

    find: (filter: any = {}) => {
      const queryExec = {
        _sort: undefined as any,
        _limit: undefined as number | undefined,
        _offset: 0,
        sort: function (s: any) {
          this._sort = s;
          return this;
        },
        skip: function (offset: number) {
          this._offset = offset;
          return this;
        },
        limit: function (n: number) {
          this._limit = n;
          return this;
        },
        exec: async function () {
          return memoryStore.find(
            collectionName,
            (item) => matchesFilter(item, filter),
            createSortComparator(this._sort),
            this._limit,
            this._offset,
          );
        },
        then: function (resolve: any, reject: any) {
          return this.exec().then(resolve, reject);
        },
      };
      return queryExec;
    },

    findOne: (filter: any = {}) => {
      const queryExec = {
        _sort: undefined as any,
        sort: function (s: any) {
          this._sort = s;
          return this;
        },
        exec: async function () {
          return memoryStore.findOne(collectionName, (item) => matchesFilter(item, filter));
        },
        then: function (resolve: any, reject: any) {
          return this.exec().then(resolve, reject);
        },
      };
      return queryExec;
    },

    findById: async (id: string) => {
      return memoryStore.findOne(collectionName, (item) => item._id === id || item.id === id);
    },

    updateOne: async (filter: any, update: any) => {
      const updateData = update?.$set ? { ...update.$set } : { ...update };
      if (update?.$inc) {
        // Handle $inc
        const existing = memoryStore.findOne(collectionName, (item) => matchesFilter(item, filter));
        if (existing) {
          for (const [k, val] of Object.entries(update.$inc)) {
            updateData[k] = ((existing as any)[k] || 0) + (val as number);
          }
        }
      }
      return memoryStore.updateOne(collectionName, (item) => matchesFilter(item, filter), updateData);
    },

    countDocuments: async (filter: any = {}) => {
      const items = memoryStore.find(collectionName, (item) => matchesFilter(item, filter));
      return items.length;
    },

    deleteMany: async (filter: any = {}) => {
      return memoryStore.delete(collectionName, (item) => matchesFilter(item, filter));
    },
  };

  return model;
}

function matchesFilter(item: any, filter: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(value)) {
      const matched = value.some((f) => matchesFilter(item, f));
      if (!matched) return false;
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      if ((value as any).$regex) {
        const regex = new RegExp((value as any).$regex, (value as any).$options || 'i');
        if (!regex.test(item[key] || '')) return false;
        continue;
      }
      if ((value as any).$gte !== undefined && (item[key] || 0) < (value as any).$gte) return false;
      if ((value as any).$lte !== undefined && (item[key] || 0) > (value as any).$lte) return false;
      continue;
    }
    if (item[key] !== value) return false;
  }
  return true;
}

function createSortComparator(sortObj: any) {
  if (!sortObj) return undefined;
  const [field, direction] = Object.entries(sortObj)[0] || [];
  if (!field) return undefined;
  const dir = direction === -1 || direction === 'desc' ? -1 : 1;
  return (a: any, b: any) => {
    const valA = a[field] instanceof Date ? a[field].getTime() : a[field];
    const valB = b[field] instanceof Date ? b[field].getTime() : b[field];
    if (valA > valB) return dir;
    if (valA < valB) return -dir;
    return 0;
  };
}
