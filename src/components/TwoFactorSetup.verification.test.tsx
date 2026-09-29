import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TwoFactorSetup } from './TwoFactorSetup';
import type { VerifyTwoFactorCode } from './twoFactorVerification';

const SECRET = 'JBSWY3DPEHPK3PXP';
const RECOVERY_CODES = ['one', 'two'];

async function reachVerification(
  verifyCode: VerifyTwoFactorCode,
  method: 'totp' | 'sms' = 'totp',
) {
  const user = userEvent.setup();
  render(
    <TwoFactorSetup
      onComplete={vi.fn()}
      onCancel={vi.fn()}
      totpSecret={SECRET}
      recoveryCodes={RECOVERY_CODES}
      verifyCode={verifyCode}
    />,
  );

  await user.click(
    screen.getByRole('button', {
      name: method === 'totp' ? /authenticator app/i : /sms backup/i,
    }),
  );
  await user.click(
    screen.getByRole('button', {
      name: method === 'totp' ? /i've added the account/i : /send verification code/i,
    }),
  );

  return user;
}

describe('TwoFactorSetup verification contract', () => {
  it('advances only after the verifier accepts the code', async () => {
    const verifyCode = vi.fn(async () => true);
    const user = await reachVerification(verifyCode);

    await user.type(screen.getByRole('textbox', { name: /verification code/i }), '654321');
    await user.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /save your recovery codes/i })).toBeInTheDocument();
    });
    expect(verifyCode).toHaveBeenCalledWith({
      method: 'totp',
      code: '654321',
      secret: SECRET,
    });
  });

  it('keeps the user on verification and exposes an invalid-code error', async () => {
    const verifyCode = vi.fn(async () => false);
    const user = await reachVerification(verifyCode);

    await user.type(screen.getByRole('textbox', { name: /verification code/i }), '654321');
    await user.click(screen.getByRole('button', { name: /^verify$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
    expect(screen.getByRole('heading', { name: /enter verification code/i })).toBeInTheDocument();
  });

  it('turns verifier failures into a deterministic retryable error', async () => {
    const verifyCode = vi.fn(async () => {
      throw new Error('network down');
    });
    const user = await reachVerification(verifyCode);

    await user.type(screen.getByRole('textbox', { name: /verification code/i }), '654321');
    await user.click(screen.getByRole('button', { name: /^verify$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify the code right now/i);
    expect(screen.getByRole('textbox', { name: /verification code/i })).not.toBeDisabled();
  });

  it('rejects incomplete input before invoking the verifier', async () => {
    const verifyCode = vi.fn(async () => true);
    const user = await reachVerification(verifyCode);

    await user.type(screen.getByRole('textbox', { name: /verification code/i }), '12345');
    await user.click(screen.getByRole('button', { name: /^verify$/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/6-digit code/i);
    expect(verifyCode).not.toHaveBeenCalled();
  });

  it('passes the SMS method through to a caller-provided verifier', async () => {
    const verifyCode = vi.fn(async () => false);
    const user = await reachVerification(verifyCode, 'sms');

    await user.type(screen.getByRole('textbox', { name: /verification code/i }), '111222');
    await user.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() => expect(verifyCode).toHaveBeenCalled());
    expect(verifyCode).toHaveBeenCalledWith({ method: 'sms', code: '111222', secret: SECRET });
  });
});
