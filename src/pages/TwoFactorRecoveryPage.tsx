import React from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { TwoFactorRecoveryFlow } from '../components/TwoFactorRecoveryFlow';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * DEMO ONLY: This page wires the recovery flow to an in-memory demo backend.
 * Replace the demo handlers below with real API calls before shipping to production.
 */

const DEMO_VALID_CODE = '123456';

export const TwoFactorRecoveryPage: React.FC = () => {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('/login');
  };

  const handleCancel = () => {
    navigate('/login');
  };

  // DEMO HANDLERS: simulate network latency and validate against a fixed code.
  // Replace with real API calls (e.g. `POST /api/2fa/recovery/request`).
  const handleRequestCode = async (_email: string): Promise<void> => {
    await new Promise((r) => setTimeout(r, 800));
  };

  const handleVerify = async (code: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 600));
    return code === DEMO_VALID_CODE;
  };

  const handleResend = async (_email: string): Promise<void> => {
    await new Promise((r) => setTimeout(r, 800));
  };

  return (
    <AuthLayout
      title="Two-factor recovery"
      subtitle="Lost your authenticator device? Use your recovery email to regain access."
    >
      <TwoFactorRecoveryFlow
        onComplete={handleComplete}
        onCancel={handleCancel}
        onRequestCode={handleRequestCode}
        onVerify={handleVerify}
        onResend={handleResend}
      />
      <Link
        to="/login"
        className="flex items-center justify-center text-sm text-muted hover:text-main transition-colors focus-ring mt-6"
        style={{ padding: '0.25rem', borderRadius: '0.25rem' }}
        aria-label="Back to sign in page"
      >
        <ArrowLeft size={16} className="mr-2 icon-rtl" />
        Back to Sign In
      </Link>
    </AuthLayout>
  );
};
