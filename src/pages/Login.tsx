import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Mail, Lock, Wallet, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setIsSuccess(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    setIsSuccess(false);
  };

  return (
    <AuthLayout 
      title="Welcome to Revora" 
      subtitle="Sign in to manage your RevenueShare offerings or track your portfolio."
    >
      <form onSubmit={handleSubmit} className={`space-y-4 ${error ? 'animate-shake' : ''}`} noValidate>
        {error && (
          <div 
            className="p-3 mb-4 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-error text-sm flex items-start"
            role="alert"
            id="login-error"
          >
            <AlertCircle size={16} className="mt-0.5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="input-group">
          <label className="input-label" htmlFor="email">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-muted" size={18} />
            <input 
              id="email"
              type="email" 
              className={`input-field pl-10 ${error ? 'input-error' : ''}`} 
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-label="Email Address"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="input-group">
          <div className="flex flex-wrap gap-y-2 justify-between items-baseline mb-2">
            <label className="input-label" style={{ marginBottom: 0 }} htmlFor="password">Password</label>
            <Link
              to="/forgot-password"
              aria-label="Forgot your password? Go to account recovery"
              className="link-styled text-sm"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-muted" size={18} />
            <input 
              id="password"
              type={showPassword ? "text" : "password"} 
              className={`input-field pl-10 pr-10 ${error ? 'input-error' : ''}`} 
              placeholder="••••••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              aria-label="Password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-muted hover:text-main transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button type="submit" loading={isSubmitting} success={isSuccess} className="mt-2">
          {isSuccess ? 'Signed In!' : 'Sign In'}
        </Button>

        <div className="relative my-6 py-2 flex items-center">
          <div className="flex-grow border-t border-[rgba(148,163,184,0.1)]"></div>
          <span className="flex-shrink mx-4 text-muted text-xs uppercase tracking-wider font-medium">Or continue with</span>
          <div className="flex-grow border-t border-[rgba(148,163,184,0.1)]"></div>
        </div>

        <button type="button" className="btn-secondary" disabled={isSubmitting}>
          <Wallet size={18} />
          Connect Stellar Wallet
        </button>

        <p className="mt-8 text-center text-sm text-muted">
          Don't have an account? <Link to="/signup" className="link-styled">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
};
