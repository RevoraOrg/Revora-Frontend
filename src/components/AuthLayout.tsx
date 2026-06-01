import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  helperText?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle, helperText }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 sm:p-6 animate-fade-in">
      <div className="w-full max-w-[480px] glass-card px-5 py-8 sm:p-8 md:p-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{title}</h1>
          {subtitle && <p className="text-muted text-sm leading-relaxed">{subtitle}</p>}
          {helperText && <p className="text-muted text-xs mt-3 leading-relaxed">{helperText}</p>}
        </div>
        {children}
      </div>
    </div>
  );
};
