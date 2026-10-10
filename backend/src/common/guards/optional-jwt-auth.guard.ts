import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY, IS_OPTIONAL_AUTH_KEY } from '../decorators';

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

    // 1. Strictly public routes (health, auth endpoints) always bypass auth
    if (isPublic) {
      return true;
    }

    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const publicAccessEnabled = this.configService.get<boolean>(
      'app.publicAccessEnabled',
      true,
    );

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    // 2. If route is @OptionalAuth and public access is enabled:
    if (isOptionalAuth && publicAccessEnabled) {
      // If client provided a Bearer token, attempt verification
      if (authHeader) {
        return super.canActivate(context);
      }
      // If no token provided, allow anonymous activation
      return true;
    }

    // 3. In all other cases (including @OptionalAuth when publicAccessEnabled=false),
    // require standard JWT authentication
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return user || null;
    }

    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const publicAccessEnabled = this.configService.get<boolean>(
      'app.publicAccessEnabled',
      true,
    );

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    // If a token was provided but is invalid or expired, reject regardless of public mode
    if (authHeader && (err || !user)) {
      throw new UnauthorizedException('Authentication token is missing or invalid');
    }

    if (user) {
      return user;
    }

    // If optional auth and public access is enabled: allow guest
    if (isOptionalAuth && publicAccessEnabled) {
      return {
        userId: 'anonymous-guest',
        name: 'Demo Visitor',
        email: 'guest@observability.local',
        roles: ['guest', 'viewer'],
        tenantId: 'default',
        isAnonymous: true,
      };
    }

    if (isOptionalAuth && !publicAccessEnabled) {
      throw new UnauthorizedException('Public demo access is disabled. Please sign in to access telemetry data.');
    }

    throw err || new UnauthorizedException('Authentication token is missing or invalid');
  }
}
