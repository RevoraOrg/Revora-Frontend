import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Mail, Lock, Wallet, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
    // Mock login failure for UI demonstration
    setError('Invalid email or password. Please try again.');
  };

  return (
    <AuthLayout 
      title="Welcome to Revora" 
      subtitle="Sign in to manage your revenue-share offerings or track your portfolio."
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
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              required 
            />
          </div>
        </div>

        <div className="input-group">
          <div className="flex justify-between mb-1">
            <label className="input-label" htmlFor="password">Password</label>
            <Link to="/forgot-password" style={{ fontSize: '0.8rem' }} className="text-primary hover:underline">Forgot Password?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-muted" size={18} />
            <input 
              id="password"
              type={showPassword ? "text" : "password"} 
              className={`input-field pl-10 pr-10 ${error ? 'input-error' : ''}`} 
              placeholder="••••••••••••" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              required 
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-muted hover:text-main transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary mt-2">Sign In</button>

        <div className="relative my-6 py-2 flex items-center">
          <div className="flex-grow border-t border-[rgba(148,163,184,0.1)]"></div>
          <span className="flex-shrink mx-4 text-muted text-xs uppercase tracking-wider font-medium">Or continue with</span>
          <div className="flex-grow border-t border-[rgba(148,163,184,0.1)]"></div>
        </div>

        <button type="button" className="btn-secondary">
          <Wallet size={18} />
          Connect Stellar Wallet
        </button>

        <p className="mt-8 text-center text-sm text-muted">
          Don't have an account? <Link to="/signup" style={{ fontWeight: 500 }} className="text-primary hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
};
