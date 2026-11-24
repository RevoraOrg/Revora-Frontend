import React from 'react';
import { Smartphone, MessageSquare, ChevronRight } from 'lucide-react';
import type { Method } from './types';

interface Step1Props {
  onSelect: (method: Method) => void;
}

export const Step1: React.FC<Step1Props> = ({ onSelect }) => (
  <div className="space-y-4 animate-fade-in">
    <p className="text-muted text-sm">
      Choose how you'd like to verify your identity each time you sign in.
    </p>
    <div className="grid gap-3">
      <button
        type="button"
        className="tfa-method-card"
        onClick={() => onSelect('totp')}
        aria-describedby="totp-desc"
      >
        <div className="tfa-method-card__icon" aria-hidden="true">
          <Smartphone size={22} />
        </div>
        <div className="tfa-method-card__body">
          <span className="tfa-method-card__title">Authenticator App</span>
          <span id="totp-desc" className="tfa-method-card__desc">
            Use Google Authenticator, Authy, or any TOTP-compatible app.
          </span>
        </div>
        <ChevronRight size={18} className="text-muted flex-shrink-0 icon-rtl" aria-hidden="true" />
      </button>

      <button
        type="button"
        className="tfa-method-card"
        onClick={() => onSelect('sms')}
        aria-describedby="sms-desc"
      >
        <div className="tfa-method-card__icon" aria-hidden="true">
          <MessageSquare size={22} />
        </div>
        <div className="tfa-method-card__body">
          <span className="tfa-method-card__title">SMS Backup</span>
          <span id="sms-desc" className="tfa-method-card__desc">
            Receive a one-time code via text message. Requires a mobile number.
          </span>
        </div>
        <ChevronRight size={18} className="text-muted flex-shrink-0 icon-rtl" aria-hidden="true" />
      </button>
    </div>
  </div>
);
