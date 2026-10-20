/**
 * DensityToggle — Issue #174
 *
 * A three-way toggle (comfortable / cozy / compact) rendered as a
 * labelled radio group so keyboard users can navigate with arrow keys
 * and all states are announced by screen readers (WCAG 2.1 AA).
 *
 * Usage:
 *   <DensityToggle />            — standalone, reads/writes global density
 *   <DensityToggle compact />    — icon-only variant for tight header bars
 */

import React from 'react';
import { useDensity } from '../../hooks/useDensity';
import type { DensityMode } from '../../hooks/useDensity';
import './DensityToggle.css';

const OPTIONS: { value: DensityMode; label: string; icon: string; title: string }[] = [
  { value: 'comfortable', label: 'Comfortable', icon: '▬', title: 'Comfortable density (spacious rows)' },
  { value: 'cozy',        label: 'Cozy',        icon: '▭', title: 'Cozy density (normal rows)' },
  { value: 'compact',     label: 'Compact',     icon: '▫', title: 'Compact density (dense rows)' },
];

interface DensityToggleProps {
  /** When true, labels are visually hidden (icon only). Default: false */
  compact?: boolean;
}

export function DensityToggle({ compact = false }: DensityToggleProps) {
  const { density, setDensity } = useDensity();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = OPTIONS.findIndex((o) => o.value === density);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setDensity(OPTIONS[(idx + 1) % OPTIONS.length].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setDensity(OPTIONS[(idx - 1 + OPTIONS.length) % OPTIONS.length].value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="View density"
      className="density-toggle"
      onKeyDown={handleKeyDown}
    >
      {OPTIONS.map((opt) => {
        const checked = density === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={checked}
            aria-label={opt.title}
            title={opt.title}
            tabIndex={checked ? 0 : -1}
            className={`density-toggle__btn density-touch-target${checked ? ' density-toggle__btn--active' : ''}`}
            onClick={() => setDensity(opt.value)}
            type="button"
          >
            <span className="density-toggle__icon" aria-hidden="true">{opt.icon}</span>
            {!compact && (
              <span className="density-toggle__label">{opt.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
