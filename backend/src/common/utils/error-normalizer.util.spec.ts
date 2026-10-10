import {
  normalizeErrorMessage,
  generateErrorSignatureHash,
  classifyFailure,
} from './error-normalizer.util';
import { FailureCategory } from '../types';

describe('ErrorNormalizerUtil', () => {
  it('should normalize UUIDs, timestamps, ObjectIds, and memory addresses', () => {
    const rawError1 =
      'Connection to 192.168.1.50:6379 failed for job c4b7e802-990a-4b92-9351-4091a1348821 at 2026-10-10T12:00:00.000Z pointer 0x7fff5fbff880';
    const rawError2 =
      'Connection to 10.0.0.1:6379 failed for job ffa01833-1122-3344-5566-778899aabbcc at 2026-10-11T14:30:15.123Z pointer 0x7fff5fbff990';

    const normalized1 = normalizeErrorMessage(rawError1);
    const normalized2 = normalizeErrorMessage(rawError2);

    expect(normalized1).toBe(
      'Connection to [IP_ADDR] failed for job [UUID] at [DATETIME] pointer [HEX_ADDR]',
    );
    expect(normalized2).toBe(
      'Connection to [IP_ADDR] failed for job [UUID] at [DATETIME] pointer [HEX_ADDR]',
    );

    const hash1 = generateErrorSignatureHash(FailureCategory.TIMEOUT, normalized1);
    const hash2 = generateErrorSignatureHash(FailureCategory.TIMEOUT, normalized2);
    expect(hash1).toBe(hash2);
  });

  it('should classify various typed failure categories accurately', () => {
    expect(classifyFailure('Request timed out after 30000ms', 504)).toBe(
      FailureCategory.TIMEOUT,
    );
    expect(
      classifyFailure('Output failed JSON schema parsing: missing required key', 422),
    ).toBe(FailureCategory.SCHEMA_FAILURE);
    expect(
      classifyFailure('Input blocked by safety policy filter: inappropriate content', 403),
    ).toBe(FailureCategory.POLICY_DENIAL);
    expect(
      classifyFailure('Qdrant vector query failed or returned 0 documents', 500, 'RAG_RETRIEVAL'),
    ).toBe(FailureCategory.RETRIEVAL_FAILURE);
    expect(
      classifyFailure('Stripe API error 402: Card declined', 402, 'TOOL_EXECUTION'),
    ).toBe(FailureCategory.TOOL_FAILURE);
    expect(
      classifyFailure('Resource has exhausted its quota (429 Too Many Requests)', 429),
    ).toBe(FailureCategory.MODEL_FAILURE);
  });
});
