import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../Button';
import { FormError } from '../FormError';
import type { Method, VerifyTwoFactorCode } from './types';

interface Step3Props {
  method: Method;
  secret: string;
  verifyCode: VerifyTwoFactorCode;
  onNext: () => void;
  onBack: () => void;
}

export const Step3: React.FC<Step3Props> = ({ method, secret, verifyCode, onNext, onBack }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    if (error) setError(null);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    let verified: boolean;
    try {
      verified = await verifyCode({ method, code, secret });
    } catch {
      setIsVerifying(false);
      setError('We could not verify the code right now. Please try again.');
      return;
    }

    if (!verified) {
      setIsVerifying(false);
      setError('The verification code is invalid or has expired.');
      return;
    }

    setIsVerifying(false);
    onNext();
  };

  return (
    <form onSubmit={handleVerify} className={`space-y-4 animate-fade-in ${error ? 'animate-shake' : ''}`} noValidate>
      <p className="text-muted text-sm">
        Enter the 6-digit code currently displayed in your authenticator app.
      </p>
      <FormError message={error} id="verify-error" />
      <div className="input-group">
        <label className="input-label" htmlFor="totp-code">
          Verification code
        </label>
        <input
          ref={inputRef}
          id="totp-code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          className={`input-field tfa-code-input ${error ? 'input-error' : ''}`}
          value={code}
          onChange={handleChange}
          placeholder="000000"
          autoComplete="one-time-code"
          aria-required="true"
          aria-describedby={error ? 'verify-error' : undefined}
          disabled={isVerifying}
        />
        <p className="text-muted text-xs mt-1">Code refreshes every 30 seconds.</p>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onBack} disabled={isVerifying}>Back</button>
        <Button type="submit" loading={isVerifying}>Verify</Button>
      </div>
    </form>
  );
};
