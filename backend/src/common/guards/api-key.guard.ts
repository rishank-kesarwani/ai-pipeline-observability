import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HEADERS } from '../constants';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly configuredKey: string;

  constructor(private readonly configService: ConfigService) {
    this.configuredKey = this.configService.get<string>(
      'app.serviceAuth.apiKey',
      'dev-service-api-key',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey =
      request.headers[HEADERS.API_KEY] ||
      request.headers['authorization']?.replace(/^Bearer\s+/i, '');

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Valid service API key required');
    }

    if (!this.secureCompare(apiKey.trim(), this.configuredKey.trim())) {
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

  private secureCompare(a: string, b: string): boolean {
    if (!a || !b) return false;
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }
}
