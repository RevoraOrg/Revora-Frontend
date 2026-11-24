/**
 * ThemeToggle — Issue: ThemeProvider
 *
 * A three-way toggle (system / light / dark) rendered as an accessible
 * radio group so keyboard users can navigate with arrow keys and all
 * states are announced by screen readers (WCAG 2.1 AA).
 *
 * Usage:
 *   <ThemeToggle />           — full labels
 *   <ThemeToggle compact />   — icon-only variant for tight header bars
 */

import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import type { ThemeMode } from '../../components/ThemeProvider/ThemeProvider';
import './ThemeToggle.css';

const OPTIONS: { value: ThemeMode; label: string; icon: string; title: string }[] = [
  { value: 'system', label: 'System', icon: '⊙', title: 'Follow system theme' },
  { value: 'light', label: 'Light', icon: '☀', title: 'Light theme' },
  { value: 'dark', label: 'Dark', icon: '☽', title: 'Dark theme' },
];

interface ThemeToggleProps {
  /** When true, labels are visually hidden (icon only). Default: false */
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = OPTIONS.findIndex((o) => o.value === theme);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setTheme(OPTIONS[(idx + 1) % OPTIONS.length].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setTheme(OPTIONS[(idx - 1 + OPTIONS.length) % OPTIONS.length].value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="theme-toggle"
      onKeyDown={handleKeyDown}
    >
      {OPTIONS.map((opt) => {
        const checked = theme === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={checked}
            aria-label={opt.title}
            title={opt.title}
            tabIndex={checked ? 0 : -1}
            className={`theme-toggle__btn${checked ? ' theme-toggle__btn--active' : ''}`}
            onClick={() => setTheme(opt.value)}
            type="button"
          >
            <span className="theme-toggle__icon" aria-hidden="true">{opt.icon}</span>
            {!compact && (
              <span className="theme-toggle__label">{opt.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
