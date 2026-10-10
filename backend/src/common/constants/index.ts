export const HEADERS = {
  API_KEY: 'x-api-key',
  CORRELATION_ID: 'x-correlation-id',
  REQUEST_ID: 'x-request-id',
  IDEMPOTENCY_KEY: 'idempotency-key',
  TENANT_ID: 'x-tenant-id',
};

export const QUEUES = {
  EXECUTION_INGESTION: 'execution-ingestion',
  FAILURE_DIAGNOSTICS: 'failure-diagnostics',
  NOTIFICATION_DISPATCH: 'notification-dispatch',
};

export const JOBS = {
  PROCESS_TRACE_STEP: 'process-trace-step',
  ANALYZE_FAILURE: 'analyze-failure',
  DISPATCH_NOTIFICATION: 'dispatch-notification',
  PRUNE_RETENTION: 'prune-retention',
};

export const DEFAULT_CONFIG = {
  TRACE_RETENTION_DAYS: 30,
  MAX_TRACE_PAYLOAD_BYTES: 1048576, // 1MB
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_TIMEOUT_MS: 30000,
  FAILURE_CONFIDENCE_THRESHOLD: 0.7,
};
