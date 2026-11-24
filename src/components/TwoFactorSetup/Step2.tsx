import React, { useState, useEffect, useId, useMemo } from 'react';
import { Key, Copy, Check } from 'lucide-react';
import { Button } from '../Button';
import { buildTotpUri } from './buildTotpUri';
import QRCode from 'qrcode';
import type { Method } from './types';

interface Step2Props {
  method: Method;
  secret: string;
  /** Account label (usually the user's email) embedded in the otpauth URI */
  accountLabel?: string;
  onNext: () => void;
  onBack: () => void;
}

export const Step2: React.FC<Step2Props> = ({ method, secret, accountLabel, onNext, onBack }) => {
  const [showManual, setShowManual] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const secretId = useId();

  const otpauthUri = useMemo(
    () => buildTotpUri(secret, accountLabel),
    [secret, accountLabel]
  );

  // Render the QR code locally to a data URL — never send the secret off-device.
  useEffect(() => {
    let cancelled = false;
    setQrError(null);
    QRCode.toDataURL(otpauthUri, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          setQrError('Could not generate the QR code. Use the manual key below.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [otpauthUri]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text for manual copy
      const el = document.getElementById(secretId);
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  };

  if (method === 'sms') {
    return (
      <div className="space-y-4 animate-fade-in">
        <p className="text-muted text-sm">
          We'll send a 6-digit code to your registered mobile number each time you sign in.
        </p>
        <div className="input-group">
          <label className="input-label" htmlFor="phone">Mobile number</label>
          <input
            id="phone"
            type="tel"
            className="input-field"
            placeholder="+1 555 000 0000"
            autoComplete="tel"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
          <Button type="button" onClick={onNext}>Send verification code</Button>
        </div>
      </div>
    );
  }

  // TOTP QR flow
  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-muted text-sm">
        Open your authenticator app and scan the QR code below to add your Revora account.
      </p>

      {/* QR code */}
      <div className="tfa-qr-wrapper" role="img" aria-label="QR code for authenticator app setup. Use the manual key below if you cannot scan.">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt=""
            aria-hidden="true"
            width={180}
            height={180}
            className="tfa-qr-img"
          />
        ) : (
          <div className="tfa-qr-img tfa-qr-placeholder" aria-hidden="true" />
        )}
      </div>
      {qrError && (
        <p className="text-error text-xs" role="alert">
          {qrError}
        </p>
      )}

      {/* Manual key toggle */}
      <button
        type="button"
        className="tfa-toggle-link"
        onClick={() => setShowManual((v) => !v)}
        aria-expanded={showManual}
        aria-controls="manual-key-section"
      >
        <Key size={14} aria-hidden="true" />
        {showManual ? 'Hide manual key' : "Can't scan? Enter key manually"}
      </button>

      {showManual && (
        <div id="manual-key-section" className="tfa-manual-key">
          <p className="text-muted text-xs mb-2">
            Type this key into your authenticator app instead of scanning the QR code.
          </p>
          <div className="tfa-manual-key__row">
            <code
              id={secretId}
              className="tfa-manual-key__code"
              aria-label={`Manual setup key: ${secret.split('').join(' ')}`}
            >
              {secret}
            </code>
            <button
              type="button"
              className="tfa-icon-btn"
              onClick={handleCopy}
              aria-label={copied ? 'Key copied to clipboard' : 'Copy key to clipboard'}
            >
              {copied ? (
                <Check size={16} className="text-success" aria-hidden="true" />
              ) : (
                <Copy size={16} aria-hidden="true" />
              )}
              <span className="sr-only">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          {copied && (
            <p className="text-success text-xs mt-1" role="status" aria-live="polite">
              Key copied to clipboard.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
        <Button type="button" onClick={onNext}>I've added the account</Button>
      </div>
    </div>
  );
};
