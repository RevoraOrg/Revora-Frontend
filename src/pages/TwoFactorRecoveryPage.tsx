import React from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { TwoFactorRecoveryFlow } from '../components/TwoFactorRecoveryFlow';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  requestRecoveryCode,
  verifyRecoveryCode,
  resendRecoveryCode,
} from '../lib/api/twoFactorRecovery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * Two-factor recovery page.
 *
 * Uses the centralized API client (`src/lib/api/twoFactorRecovery.ts`), which
 * defaults to the mock adapter when `VITE_API_BASE_URL` is not configured.
 * The flow is gated behind development mode (`import.meta.env.DEV`) or an
 * explicit `VITE_DEMO_MODE=true` env flag.
 */

export const TwoFactorRecoveryPage: React.FC = () => {
  useDocumentTitle('2FA Recovery');
  const navigate = useNavigate();
  const isDemoMode =
    import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true';

  const handleComplete = () => {
    navigate('/login');
  };

  const handleCancel = () => {
    navigate('/login');
  };

  const handleRequestCode = async (email: string): Promise<void> => {
    await requestRecoveryCode(email);
  };

  const handleVerify = async (code: string): Promise<boolean> => {
    if (!isDemoMode) {
      return false;
    }
    const response = await verifyRecoveryCode(code);
    return response.verified;
  };

  const handleResend = async (email: string): Promise<void> => {
    await resendRecoveryCode(email);
  };

  return (
    <AuthLayout
      title="Two-factor recovery"
      subtitle="Lost your authenticator device? Use your recovery email to regain access."
    >
      {isDemoMode ? (
        <>
          <div
            role="status"
            className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          >
            <strong>Demo mode active:</strong> Two-factor recovery is simulated
            in this environment.
          </div>
          <TwoFactorRecoveryFlow
            onComplete={handleComplete}
            onCancel={handleCancel}
            onRequestCode={handleRequestCode}
            onVerify={handleVerify}
            onResend={handleResend}
          />
        </>
      ) : (
        <div
          role="alert"
          className="rounded-lg border border-border bg-surface px-4 py-4 text-sm text-muted"
        >
          <p className="font-medium text-main mb-1">
            Two-factor recovery is currently unavailable
          </p>
          <p>
            Self-service two-factor recovery is not enabled in this
            environment. Please contact support to regain access to your account.
          </p>
        </div>
      )}
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
