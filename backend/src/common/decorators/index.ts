import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export interface RequestUser {
  userId: string;
  email?: string;
  name?: string;
  roles?: string[];
  tenantId?: string;
  isAnonymous?: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: RequestUser = request.user || {
      userId: 'anonymous',
      roles: ['anonymous'],
      isAnonymous: true,
      tenantId: 'default',
    };
    return data ? user?.[data] : user;
  },
);

export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      request.correlationId ||
      'corr-' + Math.random().toString(36).substring(2, 10)
    );
  },
);
