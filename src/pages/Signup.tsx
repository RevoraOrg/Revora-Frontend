import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Mail, Lock, User, Briefcase, TrendingUp, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

type Step = 'persona' | 'form' | 'success';

export const Signup: React.FC = () => {
  const [step, setStep] = useState<Step>('persona');
  const [persona, setPersona] = useState<'startup' | 'investor' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePersonaSelect = (type: 'startup' | 'investor') => {
    setPersona(type);
    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock validation
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!email.includes('@')) newErrors.email = 'Please enter a valid email address';
    if (password.length < 12) newErrors.password = 'Password must be at least 12 characters long';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    console.log('Signup attempt:', { persona, name, email, password });
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
        <form onSubmit={handleSubmit} className={`space-y-4 ${Object.keys(errors).length > 0 ? 'animate-shake' : ''}`} noValidate>
          {Object.keys(errors).length > 0 && (
            <div 
              className="p-3 mb-4 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-error text-sm flex items-start"
              role="alert"
            >
              <AlertCircle size={16} className="mt-0.5 mr-2 flex-shrink-0" />
              <span>Please fix the errors below to continue.</span>
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="name">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-muted" size={18} />
              <input 
                id="name"
                className={`input-field pl-10 ${errors.name ? 'input-error' : ''}`} 
                placeholder="John Doe" 
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                required 
              />
            </div>
            {errors.name && <p id="name-error" className="mt-1 text-xs text-error">{errors.name}</p>}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="email">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-muted" size={18} />
              <input 
                id="email"
                type="email" 
                className={`input-field pl-10 ${errors.email ? 'input-error' : ''}`} 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                required 
              />
            </div>
            {errors.email && <p id="email-error" className="mt-1 text-xs text-error">{errors.email}</p>}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-muted" size={18} />
              <input 
                id="password"
                type={showPassword ? "text" : "password"} 
                className={`input-field pl-10 pr-10 ${errors.password ? 'input-error' : ''}`} 
                placeholder="••••••••••••" 
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                }}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : "password-hint"}
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
            {errors.password ? (
              <p id="password-error" className="mt-1 text-xs text-error">{errors.password}</p>
            ) : (
              <p id="password-hint" className="mt-2 text-[0.7rem] text-muted">Must be at least 12 characters with special characters.</p>
            )}
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
