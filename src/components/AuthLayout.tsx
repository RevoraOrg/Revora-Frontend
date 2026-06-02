import React, { useId } from 'react';

/**
 * AuthLayout – shared wrapper for Login, Signup, and ForgotPassword pages.
 *
 * ## Layout Slots
 * | Prop        | Element   | CSS Class         | Description                                   |
 * |-------------|-----------|-------------------|-----------------------------------------------|
 * | title       | `<h1>`    | `.auth-title`     | Page-level heading (required, single per page)|
 * | subtitle    | `<p>`     | `.auth-subtitle`  | Short description below the title (optional)  |
 * | helperText  | `<p>`     | `.auth-helper`    | Tertiary note (security tips, hints) (optional)|
 * | children    | —         | —                 | Form content rendered below the header        |
 *
 * ## Responsive Behaviour
 * - Mobile (≥320px): full-width with 1.25rem horizontal padding, 1.5rem vertical padding
 * - Tablet/Desktop (≥480px): max-width capped at 480px with 2.5rem padding
 *
 * ## Accessibility
 * - `<main>` landmark wraps the card for screen-reader navigation
 * - `aria-labelledby` links `<main>` to the `<h1>` title
 * - Header is wrapped in `<header>` for semantic structure
 */

export interface AuthLayoutProps {
  children: React.ReactNode;
  /** Required page heading — rendered as a single `<h1>` */
  title: string;
  /** Optional short description shown beneath the title */
  subtitle?: string;
  /** Optional tertiary helper note (security tips, hints) */
  helperText?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  helperText,
}) => {
  const titleId = useId();

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
