import { Module, MiddlewareConsumer, NestModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import * as net from 'net';
import configuration from './config/configuration';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

async function isPortReachable(uri: string): Promise<boolean> {
  try {
    const match = uri.match(/:\/\/([^:/]+):?(\d+)?/);
    if (!match) return false;
    const host = match[1] || '127.0.0.1';
    const port = parseInt(match[2] || '27017', 10);
    return new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(600);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    });
  } catch {
    return false;
  }
}

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ExecutionsModule } from './executions/executions.module';
import { FailuresModule } from './failures/failures.module';
import { CheckpointsModule } from './checkpoints/checkpoints.module';
import { ComparisonsModule } from './comparisons/comparisons.module';
import { AuditModule } from './audit/audit.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { HealthModule } from './health/health.module';
import { DemoModule } from './demo/demo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('Database');
        let uri = configService.get<string>('app.database.uri') || 'mongodb://localhost:27017/ai_pipeline_observability';
        
        // If connecting to local mongo, verify reachable port or spin up in-memory mongo
        if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
          const isReachable = await isPortReachable(uri);
          if (!isReachable) {
            logger.warn(`Local MongoDB not running on 27017. Spinning up embedded Mongo server for seamless local execution...`);
            try {
              const { MongoMemoryServer } = await import('mongodb-memory-server');
              const mongod = await MongoMemoryServer.create();
              uri = mongod.getUri() + 'ai_pipeline_observability';
              logger.log(`Embedded MongoDB initialized at ${uri}`);
            } catch (err: any) {
              logger.error(`Failed to launch MongoMemoryServer: ${err.message}`);
            }
          }
        }

        return {
          uri,
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('app.rateLimit.ttl') || 60,
          limit: configService.get<number>('app.rateLimit.max') || 60,
        },
      ],
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    WorkflowsModule,
    ExecutionsModule,
    FailuresModule,
    CheckpointsModule,
    ComparisonsModule,
    AuditModule,
    IntegrationsModule,
    HealthModule,
    DemoModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
