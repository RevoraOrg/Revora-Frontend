import React, { useId, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { KEYBOARD_SHORTCUT_GROUPS } from './shortcutsData';
import { formatKeyLabels, shortcutAriaLabel } from '../../utils/keyLabels';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import './KeyboardShortcutsOverlay.css';

interface KeyboardShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isMac: boolean;
  isMobile: boolean;
}

export function KeyboardShortcutsOverlay({
  isOpen,
  onClose,
  isMac,
  isMobile,
}: KeyboardShortcutsOverlayProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, isOpen && !isMobile);

  // Escape close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  if (!isOpen || isMobile) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="shortcuts-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={handleOverlayClick}
    >
      <div
        className="shortcuts-dialog glass-card"
        ref={dialogRef}
      >
        {/* Header */}
        <div className="shortcuts-header">
          <h2 id={titleId} className="shortcuts-title">
            Keyboard Shortcuts
          </h2>
          <p id={descriptionId} className="shortcuts-sr-only">
            Use keyboard shortcuts to navigate the application efficiently.
            Press Escape to close this dialog.
          </p>
          <button
            className="shortcuts-close-btn"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="shortcuts-body">
          {KEYBOARD_SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} className="shortcut-group">
              <h3 className="shortcut-group-title">{group.title}</h3>
              <ul className="shortcut-list">
                {group.shortcuts.map((shortcut) => (
                  <li key={shortcut.label} className="shortcut-item">
                    <span className="shortcut-label">{shortcut.label}</span>
                    <span
                      className="shortcut-combo"
                      aria-label={shortcutAriaLabel(
                        shortcut.keys,
                        isMac,
                      )}
                    >
                      {formatKeyLabels(shortcut.keys, isMac).map((key, i) => (
                        <kbd key={i} className="shortcut-key">
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Footer hint */}
        <div className="shortcuts-footer">
          <p className="shortcuts-footer-text">
            Press{' '}
            <kbd className="shortcut-key">?</kbd> or{' '}
            <kbd className="shortcut-key">
              {isMac ? '\u2318/' : 'Ctrl+/'}
            </kbd>{' '}
            to toggle at any time
          </p>
        </div>
      </div>

      {/* Invisible backdrop click target — the overlay itself */}
    </div>
  );
}
