import { ConnectWalletButton } from '../components/WalletConnection/ConnectWalletButton';
import React, { useEffect, useRef, useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import {
  type AuthRole,
  AUTH_ROLES,
  inferRoleFromIdentifier,
  inferRoleFromTargetPath,
  sanitizeNextPath,
  useOptionalAuth,
  writeStoredAuthSession,
} from '../components/AuthProvider';
import { TwoFactorSetup } from '../components/TwoFactorSetup';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { useI18n } from '../i18n/I18nProvider';

const ROLE_LABELS: Record<AuthRole, string> = {
  startup: 'Startup',
  investor: 'Investor',
  admin: 'Admin',
};

export const Login: React.FC = () => {
  const { t } = useI18n();
  const auth = useOptionalAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AuthRole>(() => inferRoleFromTargetPath(nextParam) ?? 'startup');
  const [roleExplicitlySelected, setRoleExplicitlySelected] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.includes('@')) {
      setError(t('auth.login.email-invalid'));
      return;
    }

    const targetRole = inferRoleFromTargetPath(nextParam);
    const effectiveRole: AuthRole = roleExplicitlySelected
      ? role
      : targetRole ?? inferRoleFromIdentifier(email);

    setIsSubmitting(true);

    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!isMountedRef.current) return;

    const userId = email.trim().toLowerCase();
    if (auth) {
      auth.signIn({ id: userId, role: effectiveRole });
    } else {
      writeStoredAuthSession({ id: userId, role: effectiveRole });
    }

    setIsSubmitting(false);
    setIsSuccess(true);

    await new Promise(resolve => setTimeout(resolve, 800));
    if (!isMountedRef.current) return;

    setIsSuccess(false);
    navigate(sanitizeNextPath(nextParam, effectiveRole), { replace: true });
  };

  if (show2FASetup) {
    return (
      <AuthLayout title={t('auth.login.two-factor-title')} subtitle={t('auth.login.two-factor-subtitle')}>
        <TwoFactorSetup
          onComplete={() => setShow2FASetup(false)}
          onCancel={() => setShow2FASetup(false)}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
    >
      <form
        onSubmit={handleSubmit}
        className={`space-y-4 ${error ? "animate-shake" : ""}`}
        noValidate
      >
        <ConnectWalletButton disabled={isSubmitting} />

        <div className="relative my-6 py-2 flex items-center">
          <div className="flex-grow border-t border-[rgba(148,163,184,0.1)]"></div>
          <span className="flex-shrink mx-4 text-muted text-xs uppercase tracking-wider font-medium">
            {t('auth.login.or-email')}
          </span>
          <div className="flex-grow border-t border-[rgba(148,163,184,0.1)]"></div>
        </div>

        <FormError message={error} id="login-error" />

        <div className="input-group">
          <label className="input-label" htmlFor="email">
            {t('auth.login.email-label')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-muted" size={18} />
            <input
              id="email"
              type="email"
              className={`input-field pl-10 ${error ? "input-error" : ""}`}
              placeholder={t('auth.login.email-placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-label={t('auth.login.email-label')}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="input-group">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-2">
            <label className="input-label" style={{ marginBottom: 0 }} htmlFor="password">{t('auth.login.password-label')}</label>
            <div className="flex gap-3">
              <Link
                to="/forgot-password"
                aria-label={t('auth.login.forgot-password-aria')}
                className="link-styled text-sm py-1 px-1"
              >
                {t('auth.login.forgot-password')}
              </Link>
              <Link
                to="/recover-2fa"
                aria-label={t('auth.login.lost-device-aria')}
                className="link-styled text-sm py-1 px-1"
              >
                {t('auth.login.lost-device')}
              </Link>
            </div>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-muted" size={18} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className={`input-field pl-10 pr-10 ${error ? "input-error" : ""}`}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              aria-label={t('auth.login.password-label')}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-muted hover:text-main transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('auth.login.hide-password') : t('auth.login.show-password')}
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="role">
            Account Role
          </label>
          <select
            id="role"
            aria-label="Account Role"
            className="input-field"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as AuthRole);
              setRoleExplicitlySelected(true);
            }}
            disabled={isSubmitting}
          >
            {AUTH_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" loading={isSubmitting} success={isSuccess} variant="secondary" className="mt-2 w-full">
          {isSuccess ? t('auth.login.signed-in') : t('auth.login.sign-in')}
        </Button>

        <p className="text-center text-xs text-muted mt-1">
          <button
            type="button"
            className="link-styled text-xs"
            onClick={() => setShow2FASetup(true)}
          >
            {t('auth.login.setup-two-factor')}
          </button>
        </p>

        <p className="mt-8 text-center text-sm text-muted">
          {t('auth.login.no-account')}{" "}
          <Link to="/signup" className="link-styled">
            {t('auth.login.create-account')}
          Don't have an account?{" "}
          <Link to={nextParam ? `/signup?next=${encodeURIComponent(nextParam)}` : "/signup"} className="link-styled">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};
