import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyTotpCode } from './twoFactorVerification';

const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('verifyTotpCode', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts a valid six-digit RFC 6238 code', async () => {
    // RFC 6238 SHA-1 vector at 59 seconds is 94287082 for 8 digits,
    // therefore the equivalent six-digit token is 287082.
    await expect(
      verifyTotpCode(RFC_SECRET, '287082', { now: 59_000, window: 0 }),
    ).resolves.toBe(true);
  });

  it('rejects an incorrect six-digit code deterministically', async () => {
    await expect(
      verifyTotpCode(RFC_SECRET, '287083', { now: 59_000, window: 0 }),
    ).resolves.toBe(false);
  });

  it.each(['', '12345', '1234567', '12ab56'])('rejects malformed code %j', async (code) => {
    await expect(verifyTotpCode(RFC_SECRET, code, { now: 59_000 })).resolves.toBe(false);
  });

  it('surfaces malformed base32 secrets as configuration errors', async () => {
    await expect(
      verifyTotpCode('not-a-valid-secret!', '123456', { now: 59_000 }),
    ).rejects.toThrow(/base32/i);
  });

  it('rejects invalid timing options instead of silently normalizing them', async () => {
    await expect(
      verifyTotpCode(RFC_SECRET, '123456', { now: -1 }),
    ).rejects.toThrow(/time/i);
    await expect(
      verifyTotpCode(RFC_SECRET, '123456', { period: 0 }),
    ).rejects.toThrow(/period/i);
    await expect(
      verifyTotpCode(RFC_SECRET, '123456', { window: -1 }),
    ).rejects.toThrow(/window/i);
  });
});
