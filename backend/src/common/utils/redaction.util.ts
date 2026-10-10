/**
 * High-performance, deep sensitive data redaction utility.
 * Recursively redacts passwords, API keys, tokens, PII, and credentials
 * before persistence or logging.
 */

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth(orization)?/i,
  /bearer/i,
  /private[_-]?key/i,
  /credit[_-]?card/i,
  /cvv/i,
  /ssn/i,
  /cookie/i,
];

const PATTERN_REPLACEMENTS: Array<{ regex: RegExp; replacement: string }> = [
  // JWT tokens (3 base64url segments separated by dots)
  {
    regex: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
    replacement: '[REDACTED_JWT_TOKEN]',
  },
  // Bearer tokens in headers or strings
  {
    regex: /Bearer\s+([A-Za-z0-9\-_.~+/]+=*)/gi,
    replacement: 'Bearer [REDACTED_TOKEN]',
  },
  // OpenAI / Anthropic / Google / Generic API Keys
  {
    regex: /sk-[a-zA-Z0-9_-]{20,}/g,
    replacement: '[REDACTED_API_KEY]',
  },
  {
    regex: /AIza[0-9A-Za-z-_]{35}/g,
    replacement: '[REDACTED_GOOGLE_API_KEY]',
  },
  // Email addresses (PII)
  {
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g,
    replacement: '[REDACTED_EMAIL]',
  },
  // Credit card numbers (13-19 digits with optional hyphens/spaces)
  {
    regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    replacement: '[REDACTED_CREDIT_CARD]',
  },
];

export function redactString(value: string): string {
  if (!value || typeof value !== 'string') return value;
  let redacted = value;
  for (const { regex, replacement } of PATTERN_REPLACEMENTS) {
    redacted = redacted.replace(regex, replacement);
  }
  return redacted;
}

export function isSensitiveKey(key: string): boolean {
  if (!key) return false;
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function redactData<T>(data: T, maxDepth = 10, currentDepth = 0): T {
  if (data === null || data === undefined) return data;
  if (currentDepth > maxDepth) return '[TRUNCATED_MAX_DEPTH]' as any;

  if (typeof data === 'string') {
    return redactString(data) as any;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactData(item, maxDepth, currentDepth + 1)) as any;
  }

  if (typeof data === 'object') {
    // Handle Date, RegExp, Error instances
    if (data instanceof Date) return data as any;
    if (data instanceof RegExp) return data as any;
    if (data instanceof Error) {
      return {
        name: data.name,
        message: redactString(data.message),
        stack: data.stack ? redactString(data.stack) : undefined,
      } as any;
    }

    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (isSensitiveKey(key)) {
        result[key] = '[REDACTED_SENSITIVE_FIELD]';
      } else {
        result[key] = redactData(val, maxDepth, currentDepth + 1);
      }
    }
    return result as any;
  }

  return data;
}
