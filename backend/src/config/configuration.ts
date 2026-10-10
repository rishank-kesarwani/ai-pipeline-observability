import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  publicAccessEnabled: process.env.PUBLIC_ACCESS_ENABLED !== 'false',

  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_pipeline_observability',
    useMemoryFallback: process.env.DB_USE_MEMORY_FALLBACK !== 'false',
  },

  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    useMemoryFallback: process.env.REDIS_USE_MEMORY_FALLBACK !== 'false',
  },

  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      'dev-access-secret-replace-in-prod-min-32-characters-secure',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'dev-refresh-secret-replace-in-prod-min-32-characters-secure',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  serviceAuth: {
    apiKey: process.env.SERVICE_API_KEY || 'dev-service-api-key',
  },

  aiPlatform: {
    baseUrl: process.env.AI_PLATFORM_BASE_URL || 'https://ai-platform.rishankkesharwani.com/api/v1',
    apiKey: process.env.AI_PLATFORM_OBSERVABILITY_API_KEY || 'dev-ai-platform-obs-key',
    timeoutMs: parseInt(process.env.AI_PLATFORM_TIMEOUT_MS || '30000', 10),
  },

  notificationService: {
    baseUrl: process.env.NOTIFICATION_SERVICE_BASE_URL || 'https://notifications.rishankkesharwani.com/api/v1',
    apiKey: process.env.NOTIFICATION_OBSERVABILITY_API_KEY || 'dev-notification-obs-key',
    timeoutMs: parseInt(process.env.NOTIFICATION_TIMEOUT_MS || '10000', 10),
    alertsEmail: process.env.ALERTS_RECIPIENT_EMAIL || 'alerts@observability.local',
  },

  modelRegression: {
    baseUrl: process.env.MODEL_REGRESSION_BASE_URL || 'https://model-regression.rishankkesharwani.com/api/v1',
    apiKey: process.env.MODEL_REGRESSION_API_KEY || 'dev-model-regression-key',
    timeoutMs: parseInt(process.env.MODEL_REGRESSION_TIMEOUT_MS || '15000', 10),
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
  },

  retention: {
    traceRetentionDays: parseInt(process.env.TRACE_RETENTION_DAYS || '30', 10),
    maxPayloadBytes: parseInt(process.env.MAX_PAYLOAD_BYTES || '1048576', 10),
  },

  recovery: {
    requireApprovalForNonIdempotent: process.env.REQUIRE_APPROVAL_NON_IDEMPOTENT !== 'false',
    maxAutomaticRetries: parseInt(process.env.MAX_AUTOMATIC_RETRIES || '3', 10),
  },
}));
