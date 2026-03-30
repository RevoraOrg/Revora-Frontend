import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-[480px] glass-card p-8 md:p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
          {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
};
