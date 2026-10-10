import { redactData, redactString, isSensitiveKey } from './redaction.util';

describe('RedactionUtil', () => {
  it('should detect sensitive object keys', () => {
    expect(isSensitiveKey('password')).toBe(true);
    expect(isSensitiveKey('api_key')).toBe(true);
    expect(isSensitiveKey('apiKey')).toBe(true);
    expect(isSensitiveKey('authorization')).toBe(true);
    expect(isSensitiveKey('secretToken')).toBe(true);
    expect(isSensitiveKey('credit_card')).toBe(true);
    expect(isSensitiveKey('username')).toBe(false);
    expect(isSensitiveKey('stepKey')).toBe(false);
  });

  it('should redact sensitive keys in nested objects', () => {
    const input = {
      stepKey: 'llm_generate',
      config: {
        apiKey: 'sk-abcdef12345678901234567890',
        temperature: 0.7,
      },
      headers: {
        authorization: 'Bearer secret-jwt-payload',
      },
      safeField: 'This is public knowledge',
    };

    const redacted = redactData(input);
    expect(redacted.config.apiKey).toBe('[REDACTED_SENSITIVE_FIELD]');
    expect(redacted.headers.authorization).toBe('[REDACTED_SENSITIVE_FIELD]');
    expect(redacted.config.temperature).toBe(0.7);
    expect(redacted.safeField).toBe('This is public knowledge');
  });

  it('should redact API keys and Bearer tokens inside raw text strings', () => {
    const rawString =
      'Request failed with Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.secretKey and OpenAI key sk-abcdef12345678901234567890';
    const redacted = redactString(rawString);

    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(redacted).not.toContain('sk-abcdef12345678901234567890');
    expect(redacted).toContain('[REDACTED_JWT_TOKEN]');
    expect(redacted).toContain('[REDACTED_API_KEY]');

    const simpleBearer = redactString('Authorization: Bearer my-custom-opaque-token-12345');
    expect(simpleBearer).toContain('Bearer [REDACTED_TOKEN]');
  });

  it('should redact email PII and credit card sequences', () => {
    const payload = {
      user: 'alice@example.com',
      card: '4111-2222-3333-4444',
    };

    const redacted = redactData(payload);
    expect(redacted.user).toBe('[REDACTED_EMAIL]');
    expect(redacted.card).toBe('[REDACTED_CREDIT_CARD]');
  });
});
