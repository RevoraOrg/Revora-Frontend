import React, { useState, useRef, useEffect } from 'react';
import { StepIndicator } from './StepIndicator';
import { Step1 } from './Step1';
import { Step2 } from './Step2';
import { Step3 } from './Step3';
import { Step4 } from './Step4';
import { Step5 } from './Step5';
import { DEFAULT_SECRET, DEFAULT_RECOVERY_CODES, TOTAL_STEPS } from './constants';
import { verifyCodeLocally } from './verifyCodeLocally';
import type { TwoFactorSetupProps, Method, Step } from './types';
import '../TwoFactorSetup.css';

export { buildTotpUri } from './buildTotpUri';

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  onComplete,
  onCancel,
  totpSecret = DEFAULT_SECRET,
  recoveryCodes = DEFAULT_RECOVERY_CODES,
  verifyCode = verifyCodeLocally,
  onRegenerateCodes,
}) => {
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<Method>('totp');
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the section heading whenever the step changes
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS) as Step);
  const back = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const handleMethodSelect = (m: Method) => {
    setMethod(m);
    next();
  };

  const stepTitles: Record<Step, string> = {
    1: 'Choose authentication method',
    2: method === 'totp' ? 'Set up authenticator app' : 'Set up SMS backup',
    3: 'Enter verification code',
    4: 'Save your recovery codes',
    5: 'Setup complete',
  };

  return (
    <section aria-labelledby="tfa-heading" className="tfa-wizard">
      <StepIndicator current={step} />

      <h2
        id="tfa-heading"
        ref={headingRef}
        className="tfa-wizard__title"
        tabIndex={-1}
      >
        {stepTitles[step]}
      </h2>

      {step === 1 && <Step1 onSelect={handleMethodSelect} />}
      {step === 2 && (
        <Step2 method={method} secret={totpSecret} onNext={next} onBack={back} />
      )}
      {step === 3 && (
        <Step3
          method={method}
          secret={totpSecret}
          verifyCode={verifyCode}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 4 && (
        <Step4
          codes={recoveryCodes}
          onRegenerateCodes={onRegenerateCodes}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 5 && <Step5 onComplete={onComplete} />}

      {step < 5 && (
        <button
          type="button"
          className="tfa-cancel"
          onClick={onCancel}
          aria-label="Cancel two-factor authentication setup"
        >
          Cancel setup
        </button>
      )}
    </section>
  );
};
