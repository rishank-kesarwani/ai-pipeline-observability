import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.cookies?.access_token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'app.jwt.accessSecret',
        'dev-access-secret-replace-in-prod-min-32-characters-secure',
      ),
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub || payload.userId,
      email: payload.email,
      name: payload.name,
      roles: payload.roles || ['operator'],
      tenantId: payload.tenantId || 'default',
      isAnonymous: false,
    };
  }
}
