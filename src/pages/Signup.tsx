import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Mail, Lock, User, Briefcase, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

type Step = 'persona' | 'form' | 'success';

export const Signup: React.FC = () => {
  const [step, setStep] = useState<Step>('persona');
  const [persona, setPersona] = useState<'startup' | 'investor' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handlePersonaSelect = (type: 'startup' | 'investor') => {
    setPersona(type);
    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Signup attempt:', { persona, email, password });
    setStep('success');
  };

  if (step === 'success') {
    return (
      <AuthLayout title="Check your inbox">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center text-success border border-[rgba(16,185,129,0.2)]">
              <Mail size={32} />
            </div>
          </div>
          <p className="text-muted">
            We've sent a verification link to <span className="text-main font-medium">{email}</span>. 
            Please click the link to verify your account and get started.
          </p>
          <button onClick={() => setStep('persona')} className="btn-secondary w-full">
            Back to persona selection
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title={step === 'persona' ? "Choose your account type" : "Create your account"}
      subtitle={step === 'persona' ? "Select how you'll be using Revora to tailor your experience." : `Setting up your ${persona} profile.`}
    >
      {step === 'persona' ? (
        <div className="grid gap-4">
          <button 
            type="button"
            onClick={() => handlePersonaSelect('startup')}
            className="flex items-center gap-4 p-5 glass-card text-left hover:border-primary transition-colors group"
          >
            <div className="p-3 rounded-xl bg-[rgba(59,130,246,0.1)] text-primary">
              <Briefcase size={24} />
            </div>
            <div>
              <div className="font-semibold text-main">Startup Founder</div>
              <div className="text-xs text-muted">Create offerings and manage revenue sharing.</div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => handlePersonaSelect('investor')}
            className="flex items-center gap-4 p-5 glass-card text-left hover:border-primary transition-colors group"
          >
            <div className="p-3 rounded-xl bg-[rgba(59,130,246,0.1)] text-primary">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="font-semibold text-main">Investor</div>
              <div className="text-xs text-muted">Discover and invest in tokenized offerings.</div>
            </div>
          </button>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account? <Link to="/login" style={{ fontWeight: 500 }} className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="input-group">
            <label className="input-label" htmlFor="name">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-muted" size={18} />
              <input 
                id="name"
                className="input-field pl-10" 
                placeholder="John Doe" 
                required 
              />
            </div>
          </div>

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
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
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
              />
            </div>
            <p className="mt-2 text-[0.7rem] text-muted">Must be at least 12 characters with special characters.</p>
          </div>

          <button type="submit" className="btn-primary mt-4">Create Account</button>
          
          <button 
            type="button" 
            onClick={() => setStep('persona')}
            className="btn-secondary w-full"
          >
            Back
          </button>
        </form>
      )}
    </AuthLayout>
  );
};
