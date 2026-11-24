/**
 * Build the otpauth:// URI for authenticator enrolment.
 *
 * The label and issuer are URL-encoded so that special characters (e.g. `@`,
 * `:`, spaces) in the account email cannot break the URI structure. The secret
 * is base32 and safe, but is encoded defensively as well.
 *
 * @param secret      Base32-encoded TOTP secret.
 * @param accountLabel  Account identifier shown in the authenticator app
 *                      (typically the user's email). Defaults to `'Revora'`.
 */
export const buildTotpUri = (secret: string, accountLabel = 'Revora'): string => {
  const issuer = 'Revora';
  const label = `${issuer}:${accountLabel}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
};
