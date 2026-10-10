import * as crypto from 'crypto';
import { FailureCategory } from '../types';

/**
 * Normalizes error strings across executions to identify clusters of recurring failures.
 * Strips out variable parts like timestamps, UUIDs, numeric IDs, IP addresses, URLs, and memory pointers.
 */
export function normalizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') return 'Unknown error';

  let normalized = message
    // Strip ISO timestamps and common datetime formats
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/gi, '[DATETIME]')
    // Strip standard UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID]')
    // Strip 24-character MongoDB ObjectId hex strings
    .replace(/\b[0-9a-fA-F]{24}\b/g, '[OBJECT_ID]')
    // Strip IPv4 addresses and port numbers
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/g, '[IP_ADDR]')
    // Strip URLs or hostnames
    .replace(/https?:\/\/[^\s$.?#].[^\s]*/gi, '[URL]')
    // Strip memory hex addresses (e.g. 0x7ffee123)
    .replace(/0x[0-9a-fA-F]+/g, '[HEX_ADDR]')
    // Strip standalone numbers / IDs
    .replace(/\b\d{4,}\b/g, '[NUMERIC_ID]')
    // Trim extra spaces and newlines
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Computes deterministic SHA-256 signature hash from normalized message and failure category.
 */
export function generateErrorSignatureHash(
  category: FailureCategory,
  normalizedMessage: string,
): string {
  const content = `${category}:${normalizedMessage.toLowerCase()}`;
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Classifies raw error message or status code into standard typed FailureCategory.
 */
export function classifyFailure(
  errorMessage: string,
  statusCode?: number,
  stepType?: string,
): FailureCategory {
  const msg = (errorMessage || '').toLowerCase();

  // 1. Timeout
  if (
    statusCode === 408 ||
    statusCode === 504 ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('deadline exceeded') ||
    msg.includes('etimedout')
  ) {
    return FailureCategory.TIMEOUT;
  }

  // 2. Policy denial / safety / guardrail
  if (
    statusCode === 403 ||
    msg.includes('safety') ||
    msg.includes('policy') ||
    msg.includes('content filter') ||
    msg.includes('blocked by policy') ||
    msg.includes('moderation') ||
    msg.includes('denied')
  ) {
    return FailureCategory.POLICY_DENIAL;
  }

  // 3. Schema failure (JSON parse, invalid response format, missing fields)
  if (
    statusCode === 422 ||
    msg.includes('schema') ||
    msg.includes('json') ||
    msg.includes('unexpected token') ||
    msg.includes('failed to parse') ||
    msg.includes('validation failed') ||
    msg.includes('missing required field') ||
    msg.includes('zoderror')
  ) {
    return FailureCategory.SCHEMA_FAILURE;
  }

  // 4. Retrieval failure (RAG, vector store, embedding)
  if (
    stepType === 'RAG_RETRIEVAL' ||
    msg.includes('retriev') ||
    msg.includes('qdrant') ||
    msg.includes('pinecone') ||
    msg.includes('vector') ||
    msg.includes('similarity threshold') ||
    msg.includes('no documents found') ||
    msg.includes('embedding')
  ) {
    return FailureCategory.RETRIEVAL_FAILURE;
  }

  // 5. Tool failure
  if (
    stepType === 'TOOL_EXECUTION' ||
    stepType === 'EXTERNAL_WEBHOOK' ||
    msg.includes('tool') ||
    msg.includes('webhook') ||
    msg.includes('api call failed') ||
    msg.includes('stripe') ||
    msg.includes('github api') ||
    msg.includes('database error')
  ) {
    return FailureCategory.TOOL_FAILURE;
  }

  // 6. Model failure (LLM quota, 500, 503, provider crash, context length)
  if (
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('gemini') ||
    msg.includes('openai') ||
    msg.includes('anthropic') ||
    msg.includes('model overload') ||
    msg.includes('context length exceeded') ||
    msg.includes('tokens per minute')
  ) {
    return FailureCategory.MODEL_FAILURE;
  }

  return FailureCategory.UNKNOWN;
}
