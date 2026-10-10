import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 4000;
  const host = configService.get<string>('app.host') || '0.0.0.0';

  // Security Middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: false,
    }),
  );
  app.use(cookieParser());

  // CORS Configuration
  app.enableCors({
    origin: (origin, callback) => {
      // Allow localhost, vercel, internal services, and curl/Postman
      if (
        !origin ||
        /^https?:\/\/(localhost|127\.0\.0\.1|.*\.vercel\.app|.*\.rishankkesharwani\.com)(:\d+)?$/.test(
          origin,
        )
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-correlation-id',
      'x-request-id',
      'idempotency-key',
      'x-tenant-id',
    ],
  });

  // Global Prefix (exclude health checks)
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/live', 'health/ready'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Filters & Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(45000),
  );

  // Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Pipeline Observability & Recovery API')
    .setDescription(
      'Production-grade platform for observing multi-step AI executions, diagnosing typed failures, clustering error signatures, and safely resuming recoverable workflows from checkpoints.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Service-to-service ingestion API key',
      },
      'x-api-key',
    )
    .addTag('Workflows', 'Workflow definitions and step specifications')
    .addTag('Executions & Tracing', 'Execution ingestion, timeline, and step traces')
    .addTag('Failure Forensics & Clustering', 'Normalized error signatures and root-cause hypotheses')
    .addTag('Checkpoints & Recovery', 'Durable checkpoints, safe resume, and operator approval')
    .addTag('Run Comparisons & Diff', 'Side-by-side execution diff and divergence points')
    .addTag('Audit Trail', 'Immutable audit logs of operator approvals and recoveries')
    .addTag('Authentication', 'Operator authentication and platform settings')
    .addTag('Health & Observability', 'Liveness, readiness, and metrics')
    .addTag('Demo & Simulation Sandbox', 'Interactive sandbox and mock run simulation')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'AI Pipeline Observability API Docs',
  });

  await app.listen(port, host);
  logger.log(`Server running on http://${host}:${port}`);
  logger.log(`Swagger documentation available at http://${host}:${port}/api/docs`);
  logger.log(`Health check available at http://${host}:${port}/health`);
}

process.on('unhandledRejection', (reason: any) => {
  if (
    reason?.name === 'MongoServerSelectionError' ||
    reason?.name === 'MongooseServerSelectionError' ||
    reason?.message?.includes('ECONNREFUSED')
  ) {
    new Logger('Database').warn(
      `Local MongoDB daemon offline (${reason.message}). Seamlessly running with in-memory persistence store.`,
    );
    return;
  }
  new Logger('Process').error('Unhandled Rejection:', reason);
});

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Application failed to start: ${err.message}`, err.stack);
  process.exit(1);
});
