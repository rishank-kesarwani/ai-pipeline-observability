import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const publicAccessEnabled = this.configService.get<boolean>(
      'app.publicAccessEnabled',
      true,
    );

    // If marked public or demo mode is on, attempt auth but do not fail if unauthenticated
    if (isPublic || publicAccessEnabled) {
      try {
        return super.canActivate(context);
      } catch {
        return true;
      }
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const publicAccessEnabled = this.configService.get<boolean>(
      'app.publicAccessEnabled',
      true,
    );

    if (user) return user;

    if (isPublic || publicAccessEnabled) {
      return {
        userId: 'anonymous-operator',
        name: 'Demo Visitor',
        email: 'demo@observability.local',
        roles: ['anonymous', 'viewer'],
        tenantId: 'default',
        isAnonymous: true,
      };
    }

    throw err || new UnauthorizedException('Authentication required');
  }
}
