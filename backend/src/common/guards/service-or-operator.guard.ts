import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HEADERS } from '../constants';
import * as crypto from 'crypto';

@Injectable()
export class ServiceOrOperatorGuard implements CanActivate {
  private readonly configuredKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.configuredKey = this.configService.get<string>(
      'app.serviceAuth.apiKey',
      'dev-service-api-key',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader =
      request.headers[HEADERS.API_KEY] ||
      (request.headers['authorization']?.startsWith('ApiKey ')
        ? request.headers['authorization'].substring(7).trim()
        : undefined);

    // 1. If API Key header was provided, validate service key
    if (apiKeyHeader) {
      if (!this.secureCompare(apiKeyHeader.trim(), this.configuredKey.trim())) {
        throw new UnauthorizedException('Invalid service API key');
      }

      request.user = {
        userId: 'service-agent',
        name: 'Automated Pipeline Ingestion Agent',
        roles: ['service'],
        isAnonymous: false,
      };
      return true;
    }

    // 2. Otherwise, check for valid operator/admin JWT
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('app.jwt.accessSecret'),
        });

        if (
          payload &&
          Array.isArray(payload.roles) &&
          payload.roles.some((r: string) => ['operator', 'admin'].includes(r))
        ) {
          request.user = {
            ...payload,
            isAnonymous: false,
          };
          return true;
        }
      } catch {
        throw new UnauthorizedException('Invalid or expired operator authentication token');
      }
    }

    throw new UnauthorizedException(
      'Valid internal service API key (x-api-key) or operator credentials required',
    );
  }

  private secureCompare(a: string, b: string): boolean {
    if (!a || !b) return false;
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }
}
