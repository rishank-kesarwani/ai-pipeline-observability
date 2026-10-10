import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

import { ServiceOrOperatorGuard } from '../common/guards/service-or-operator.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>(
          'app.jwt.accessSecret',
          'dev-access-secret-replace-in-prod-min-32-characters-secure',
        ),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    OptionalJwtAuthGuard,
    JwtAuthGuard,
    ApiKeyGuard,
    ServiceOrOperatorGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    OptionalJwtAuthGuard,
    JwtAuthGuard,
    ApiKeyGuard,
    ServiceOrOperatorGuard,
    RolesGuard,
    JwtModule,
  ],
})
export class AuthModule {}
