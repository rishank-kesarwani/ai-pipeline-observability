import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { ServiceOrOperatorGuard } from '../common/guards/service-or-operator.guard';
import { IS_PUBLIC_KEY, IS_OPTIONAL_AUTH_KEY } from '../common/decorators';
import { ExecutionsService } from '../executions/executions.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { MemoryStoreService } from '../database/memory-store.service';

describe('Public Access & Authorization Guards (Travel Planner Style)', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('OptionalJwtAuthGuard with PUBLIC_ACCESS_ENABLED switch', () => {
    it('1. When PUBLIC_ACCESS_ENABLED=true: allows anonymous access on @OptionalAuth routes', () => {
      const mockConfigService: any = {
        get: jest.fn((key: string, defaultVal: any) => {
          if (key === 'app.publicAccessEnabled') return true;
          return defaultVal;
        }),
      };

      const guard = new OptionalJwtAuthGuard(reflector, mockConfigService);

      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === IS_OPTIONAL_AUTH_KEY) return true;
        return false;
      });

      const mockContext: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
      };

      const canActivate = guard.canActivate(mockContext);
      expect(canActivate).toBe(true);

      const user = guard.handleRequest(null, null, null, mockContext);
      expect(user).toBeDefined();
      expect(user.isAnonymous).toBe(true);
      expect(user.roles).toContain('guest');
      expect(user.tenantId).toBe('default');
    });

    it('2. When PUBLIC_ACCESS_ENABLED=false: denies anonymous access on @OptionalAuth routes with 401', () => {
      const mockConfigService: any = {
        get: jest.fn((key: string, defaultVal: any) => {
          if (key === 'app.publicAccessEnabled') return false;
          return defaultVal;
        }),
      };

      const guard = new OptionalJwtAuthGuard(reflector, mockConfigService);

      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === IS_OPTIONAL_AUTH_KEY) return true;
        return false;
      });

      const mockContext: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
      };

      expect(() => {
        guard.handleRequest(null, null, null, mockContext);
      }).toThrow(UnauthorizedException);

      expect(() => {
        guard.handleRequest(null, null, null, mockContext);
      }).toThrow('Public demo access is disabled. Please sign in to access telemetry data.');
    });

    it('3. When PUBLIC_ACCESS_ENABLED=false: allows authenticated requests with valid JWT', () => {
      const mockConfigService: any = {
        get: jest.fn((key: string) => (key === 'app.publicAccessEnabled' ? false : undefined)),
      };

      const guard = new OptionalJwtAuthGuard(reflector, mockConfigService);

      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === IS_OPTIONAL_AUTH_KEY) return true;
        return false;
      });

      const mockContext: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer valid-token-xyz' },
          }),
        }),
      };

      const validUser = {
        userId: 'usr-101',
        email: 'operator@pipeline.local',
        roles: ['operator'],
        tenantId: 'tenant-prod',
      };

      const user = guard.handleRequest(null, validUser, null, mockContext);
      expect(user).toEqual(validUser);
    });

    it('4. Rejects invalid / malformed Bearer tokens even when PUBLIC_ACCESS_ENABLED=true', () => {
      const mockConfigService: any = {
        get: jest.fn((key: string) => (key === 'app.publicAccessEnabled' ? true : undefined)),
      };

      const guard = new OptionalJwtAuthGuard(reflector, mockConfigService);

      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === IS_OPTIONAL_AUTH_KEY) return true;
        return false;
      });

      const mockContext: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer malformed-token' },
          }),
        }),
      };

      expect(() => {
        guard.handleRequest(new Error('jwt malformed'), null, null, mockContext);
      }).toThrow('Authentication token is missing or invalid');
    });

    it('5. @Public routes (health/auth) always bypass authentication regardless of flags', () => {
      const mockConfigService: any = {
        get: jest.fn((key: string) => (key === 'app.publicAccessEnabled' ? false : undefined)),
      };

      const guard = new OptionalJwtAuthGuard(reflector, mockConfigService);

      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return true;
        return false;
      });

      const mockContext: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
      };

      const canActivate = guard.canActivate(mockContext);
      expect(canActivate).toBe(true);

      const result = guard.handleRequest(null, null, null, mockContext);
      expect(result).toBeNull();
    });
  });

  describe('ServiceOrOperatorGuard', () => {
    let mockConfigService: any;
    let mockJwtService: any;
    let guard: ServiceOrOperatorGuard;

    beforeEach(() => {
      mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'app.serviceAuth.apiKey') return 'correct-service-key-999';
          if (key === 'app.jwt.accessSecret') return 'test-secret';
          return undefined;
        }),
      };

      mockJwtService = {
        verify: jest.fn(),
      };

      guard = new ServiceOrOperatorGuard(mockConfigService, mockJwtService);
    });

    it('6. Ingestion: permits valid service API key in x-api-key header', () => {
      const req: any = {
        headers: {
          'x-api-key': 'correct-service-key-999',
        },
      };

      const context: any = {
        switchToHttp: () => ({ getRequest: () => req }),
      };

      const res = guard.canActivate(context);
      expect(res).toBe(true);
      expect(req.user.roles).toContain('service');
    });

    it('7. Ingestion: rejects invalid service API key with 401', () => {
      const req: any = {
        headers: {
          'x-api-key': 'wrong-key-xyz',
        },
      };

      const context: any = {
        switchToHttp: () => ({ getRequest: () => req }),
      };

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid service API key');
    });

    it('8. Ingestion: rejects unauthenticated caller with neither key nor token', () => {
      const req: any = {
        headers: {},
      };

      const context: any = {
        switchToHttp: () => ({ getRequest: () => req }),
      };

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Valid internal service API key');
    });

    it('9. Ingestion: permits authenticated operator with valid JWT Bearer token', () => {
      const req: any = {
        headers: {
          authorization: 'Bearer valid-operator-jwt',
        },
      };

      mockJwtService.verify.mockReturnValueOnce({
        userId: 'usr-op-1',
        roles: ['operator'],
        tenantId: 'default',
      });

      const context: any = {
        switchToHttp: () => ({ getRequest: () => req }),
      };

      const res = guard.canActivate(context);
      expect(res).toBe(true);
      expect(req.user.roles).toContain('operator');
    });
  });

  describe('Tenant Isolation Enforcement', () => {
    let memoryStore: MemoryStoreService;
    let executionsService: ExecutionsService;
    let workflowsService: WorkflowsService;

    beforeEach(() => {
      memoryStore = new MemoryStoreService();
      const mockModel: any = {
        find: jest.fn().mockReturnValue({ sort: () => ({ skip: () => ({ limit: () => [] }) }) }),
        findOne: jest.fn().mockReturnValue(null),
        countDocuments: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      };

      const mockFailuresService: any = { getClusterByHash: jest.fn() };
      const mockCheckpointsService: any = { getCheckpoints: jest.fn().mockResolvedValue([]) };
      const mockNotificationService: any = { sendFailureAlert: jest.fn() };

      executionsService = new ExecutionsService(
        mockModel,
        mockModel,
        mockModel,
        memoryStore,
        mockFailuresService,
        mockCheckpointsService,
        mockNotificationService,
      );

      workflowsService = new WorkflowsService(mockModel, memoryStore);

      // Seed a public demo execution and a private tenant execution
      memoryStore.insert('executions', {
        executionId: 'exec-public-demo',
        workflowId: 'wf-demo',
        tenantId: 'default',
        status: 'COMPLETED',
        startTime: new Date(),
      } as any);

      memoryStore.insert('executions', {
        executionId: 'exec-private-enterprise',
        workflowId: 'wf-finance',
        tenantId: 'tenant-enterprise',
        status: 'COMPLETED',
        startTime: new Date(),
      } as any);
    });

    it('10. Anonymous visitor querying private tenant executions is rejected with 403 Forbidden', async () => {
      const guestUser = { isAnonymous: true, tenantId: 'default' };

      await expect(
        executionsService.findAll({ tenantId: 'tenant-enterprise' }, guestUser),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        executionsService.findAll({ tenantId: 'tenant-enterprise' }, guestUser),
      ).rejects.toThrow('Anonymous visitors are restricted to public demo executions');
    });

    it('11. Anonymous visitor can query public demo executions (tenantId: default)', async () => {
      const guestUser = { isAnonymous: true, tenantId: 'default' };

      const res = await executionsService.findAll({}, guestUser);
      expect(res.items.length).toBe(1);
      expect(res.items[0].executionId).toBe('exec-public-demo');
    });

    it('12. Authenticated user from tenant-A requesting tenant-B executions is rejected with 403 Forbidden', async () => {
      const regularUser = {
        userId: 'usr-user1',
        isAnonymous: false,
        tenantId: 'tenant-alpha',
        roles: ['user'],
      };

      await expect(
        executionsService.findAll({ tenantId: 'tenant-beta' }, regularUser),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        executionsService.findAll({ tenantId: 'tenant-beta' }, regularUser),
      ).rejects.toThrow("Cross-tenant access forbidden. You cannot access tenant 'tenant-beta'");
    });

    it('13. Anonymous visitor attempting to view private tenant execution details is rejected with 403 Forbidden', async () => {
      const guestUser = { isAnonymous: true, tenantId: 'default' };

      await expect(
        executionsService.findOne('exec-private-enterprise', guestUser),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        executionsService.findOne('exec-private-enterprise', guestUser),
      ).rejects.toThrow('Anonymous visitors are restricted to public demo traces');
    });

    it('14. Workflows: Anonymous visitor querying private tenant workflows is rejected with 403 Forbidden', async () => {
      const guestUser = { isAnonymous: true, tenantId: 'default' };

      await expect(
        workflowsService.findAll({ tenantId: 'tenant-secret' }, guestUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
