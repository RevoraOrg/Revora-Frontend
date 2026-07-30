import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface CopyToastProps {
  rowCount: number | null;
  onDismiss: () => void;
}

const DISMISS_MS = 3000;

export function CopyToast({ rowCount, onDismiss }: CopyToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (rowCount === null) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, DISMISS_MS);
    return () => clearTimeout(t);
  }, [rowCount, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="copy-toast"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '0.5rem'})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        background: '#1f2937',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff',
        fontSize: '0.875rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <Check size={16} aria-hidden="true" style={{ color: '#34d399' }} />
      <span>
        {rowCount} row{rowCount !== 1 ? 's' : ''} copied to clipboard
      </span>
    </div>
  );
}
