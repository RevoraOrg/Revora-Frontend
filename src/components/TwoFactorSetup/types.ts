import type { VerifyTwoFactorCode } from '../twoFactorVerification';

export type Method = 'totp' | 'sms';
export type Step = 1 | 2 | 3 | 4 | 5;

export interface TwoFactorSetupProps {
  /** Called when the wizard completes successfully */
  onComplete: () => void;
  /** Called when the user cancels / closes the wizard */
  onCancel: () => void;
  /** Pre-generated TOTP secret (base32); callers should generate server-side */
  totpSecret?: string;
  /** Pre-generated recovery codes (8 codes recommended) */
  recoveryCodes?: string[];
  /**
   * Optional verification boundary for server-backed TOTP/SMS validation.
   * When omitted, TOTP codes are verified locally against `totpSecret` using
   * RFC 6238. SMS verification requires callers to provide this handler.
   */
  verifyCode?: VerifyTwoFactorCode;
  /**
   * Rotates the recovery codes server-side and resolves with the new set.
   * The previous codes are invalidated by the backend. When omitted, the
   * Regenerate action is hidden.
   */
  onRegenerateCodes?: () => Promise<string[]>;
}

export { type VerifyTwoFactorCode };
