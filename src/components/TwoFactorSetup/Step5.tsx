import React, { useRef, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../Button';

interface Step5Props {
  onComplete: () => void;
}

export const Step5: React.FC<Step5Props> = ({ onComplete }) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  return (
    <div className="text-center space-y-5 animate-fade-in">
      <div className="tfa-success-icon" aria-hidden="true">
        <ShieldCheck size={36} />
      </div>
      <div>
        <h3 className="font-semibold text-main text-lg">Two-factor authentication enabled</h3>
        <p className="text-muted text-sm mt-1">
          Your account is now protected. You'll be asked for a code at each sign-in.
        </p>
      </div>
      <Button ref={btnRef} type="button" onClick={onComplete}>
        Done
      </Button>
    </div>
  );
};
