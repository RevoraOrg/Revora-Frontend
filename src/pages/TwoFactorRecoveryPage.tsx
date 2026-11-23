import React from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { TwoFactorRecoveryFlow } from '../components/TwoFactorRecoveryFlow';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Two-factor recovery page.
 *
 * The simulated in-memory recovery flow is gated behind development mode
 * (`import.meta.env.DEV`) or an explicit `VITE_DEMO_MODE=true` env flag so
 * production builds never ship or accept a hard-coded demo code.
 */

export const TwoFactorRecoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const isDemoMode =
    import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true';

  const handleComplete = () => {
    navigate('/login');
  };

  const handleCancel = () => {
    navigate('/login');
  };

  // DEMO HANDLERS: simulate network latency and validate against a fixed code.
  // Only reachable when `isDemoMode` is true; dead-code-eliminated in prod builds.
  const handleRequestCode = async (_email: string): Promise<void> => {
    await new Promise((r) => setTimeout(r, 800));
  };

  const handleVerify = async (code: string): Promise<boolean> => {
    if (!isDemoMode) {
      return false;
    }
    await new Promise((r) => setTimeout(r, 600));
    return code === '123456';
  };

  const handleResend = async (_email: string): Promise<void> => {
    await new Promise((r) => setTimeout(r, 800));
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
