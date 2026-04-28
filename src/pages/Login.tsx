import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Mail, Lock, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
    // In a real app, this would hit /api/auth/login
  };

  return (
    <AuthLayout 
      title="Welcome to Revora" 
      subtitle="Sign in to manage your RevenueShare offerings or track your portfolio."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="input-group">
          <label className="input-label" htmlFor="email">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-muted" size={18} />
            <input 
              id="email"
              type="email" 
              className="input-field pl-10" 
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-label="Email Address"
            />
          </div>
        </div>

        <div className="input-group">
          <div className="flex justify-between mb-1">
            <label className="input-label" htmlFor="password">Password</label>
            <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Forgot Password?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-muted" size={18} />
            <input 
              id="password"
              type="password" 
              className="input-field pl-10" 
              placeholder="••••••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              aria-label="Password"
            />
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
          Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 500 }}>Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
};
