import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Password reset request:', email);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <AuthLayout title="Reset link sent">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[rgba(59,130,246,0.1)] flex items-center justify-center text-primary border border-[rgba(59,130,246,0.2)]">
              <Mail size={32} />
            </div>
          </div>
          <p className="text-muted">
            If an account exists for <span className="text-main font-medium">{email}</span>, 
            you'll receive an email with instructions to reset your password shortly.
          </p>
          <Link to="/login" className="btn-secondary w-full inline-flex">
            <ArrowLeft size={18} className="mr-2" />
            Back to Sign In
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Forgot Password?" 
      subtitle="Enter your email address and we'll send you a link to reset your password."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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

        <button type="submit" className="btn-primary">Send Reset Link</button>

        <Link to="/login" className="flex items-center justify-center text-sm text-muted hover:text-main transition-colors">
          <ArrowLeft size={16} className="mr-2" />
          Back to Sign In
        </Link>
      </form>
    </AuthLayout>
  );
};
