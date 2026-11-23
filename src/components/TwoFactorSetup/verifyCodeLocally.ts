import { verifyTotpCode, type VerifyTwoFactorCode } from '../twoFactorVerification';

/**
 * Fallback verifier used when the caller does not supply a `verifyCode` prop.
 * Only supports TOTP; SMS requires a server-side handler.
 */
export const verifyCodeLocally: VerifyTwoFactorCode = ({ method, code, secret }) => {
  if (method !== 'totp' || !secret) {
    throw new Error('A server verification handler is required for this method.');
  }
  return verifyTotpCode(secret, code);
};
