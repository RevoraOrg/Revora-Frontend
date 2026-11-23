import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Copy as CopyIcon,
  Check,
  Download,
  Printer,
  Eye,
  EyeOff,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../Button';
import { RegenerateCodesDialog } from '../RegenerateCodesDialog';
import { CODE_PLACEHOLDER, CODES_PER_ROW } from './constants';

interface Step4Props {
  codes: string[];
  onRegenerateCodes?: () => Promise<string[]>;
  onNext: () => void;
  onBack: () => void;
}

export const Step4: React.FC<Step4Props> = ({ codes: initialCodes, onRegenerateCodes, onNext, onBack }) => {
  const [codes, setCodes] = useState<string[]>(initialCodes);
  const [acknowledged, setAcknowledged] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>(() => new Array(initialCodes.length).fill(false));
  const [allRevealed, setAllRevealed] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const codesGridRef = useRef<HTMLDivElement>(null);
  const regenerateTriggerRef = useRef<HTMLButtonElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle reveal toggle for individual codes
  const toggleReveal = useCallback((index: number) => {
    setRevealed(prev => {
      const next = [...prev];
      next[index] = !prev[index];
      setAllRevealed(next.every(v => v));
      return next;
    });
  }, []);

  // Toggle all codes
  const toggleAllReveal = () => {
    const newAllRevealed = !allRevealed;
    setAllRevealed(newAllRevealed);
    setRevealed(prev => prev.map(() => newAllRevealed));
  };

  // Copy all codes to clipboard with feedback
  const copyAllCodes = async () => {
    const revealedCodes = codes.filter((_, idx) => revealed[idx]);
    if (revealedCodes.length === 0) return;

    const codesText = revealedCodes.join('\n');
    try {
      await navigator.clipboard.writeText(codesText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback: select text from grid
      codesGridRef.current?.focus();
    }
  };

  // Download codes as text file
  const downloadCodes = () => {
    const revealedCodes = codes.filter((_, idx) => revealed[idx]);
    if (revealedCodes.length === 0) return;

    const content = `Revora Recovery Codes\nGenerated: ${new Date().toISOString()}\n\n${revealedCodes.join('\n')}\n\n⚠️ IMPORTANT: These are your recovery codes. Store them safely and use them only for account recovery. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revora-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print codes with print stylesheet
  const printCodes = () => {
    const revealedCodes = codes.filter((_, idx) => revealed[idx]);
    if (revealedCodes.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Revora Recovery Codes - Print</title>
        <style>
          @media print {
            @page {
              margin: 2cm;
              @bottom-center {
                content: "Page " counter(page);
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 0;
              background: white !important;
              color: black !important;
            }
            .print-container {
              max-width: 100%;
              margin: 0;
            }
            .warning-banner {
              background: #fef3c7;
              border: 2px solid #f59e0b;
              padding: 1rem;
              margin-bottom: 1.5rem;
              border-radius: 0.5rem;
            }
            .codes-grid {
              display: grid;
              grid-template-columns: repeat(${CODES_PER_ROW}, 1fr);
              gap: 0.75rem;
              margin: 1.5rem 0;
            }
            .code-card {
              border: 2px solid #e5e7eb;
              padding: 1rem;
              text-align: center;
              background: #f9fafb;
              border-radius: 0.5rem;
            }
            .code-card.revealed {
              border-color: #10b981;
              background: #ecfdf5;
            }
            .code-value {
              font-family: 'Courier New', Monaco, monospace;
              font-size: 1.25rem;
              font-weight: bold;
              color: #111827;
              letter-spacing: 0.1em;
            }
            .code-placeholder {
              color: #9ca3af;
              font-style: italic;
            }
            .header {
              margin-bottom: 2rem;
              text-align: center;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 1rem;
            }
            .footer {
              margin-top: 2rem;
              text-align: center;
              font-size: 0.875rem;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
              padding-top: 1rem;
            }
            .no-print {
              display: none;
            }
          }
          @media screen {
            body {
              background: var(--bg-gradient);
              color: var(--text-main);
              padding: 2rem;
              max-width: 1200px;
              margin: 0 auto;
            }
            .no-screen {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="header">
            <h1>Revora Recovery Codes</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="warning-banner">
            <h2>⚠️ IMPORTANT SECURITY NOTICE</h2>
            <p><strong>Save these codes now.</strong> They are the only way to recover your account if you lose access to your authenticator. Each code can be used once and expires after 30 minutes of deactivation.</p>
            <p><strong>For security, print this page immediately and store it in a safe location.</strong></p>
          </div>

          <div class="codes-grid">
            ${revealedCodes.map((code, idx) => `
              <div class="code-card ${revealed[idx] ? 'revealed' : ''}">
                <div class="text-xs text-muted mb-1">Code ${idx + 1}</div>
                <div class="code-value ${revealed[idx] ? '' : 'code-placeholder'}">
                  ${revealed[idx] ? code : CODE_PLACEHOLDER}
                </div>
              </div>
            `).join('')}
          </div>

          <div class="footer">
            <p>⚠️ These codes provide access to your account. Keep them secret and safe.</p>
            <p>Regenerated: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Handle regenerate codes with confirmation
  const handleRegenerate = () => {
    setShowRegenerateConfirm(true);
  };

  const closeRegenerateDialog = useCallback(() => {
    setShowRegenerateConfirm(false);
    setRegenerateError(null);
    regenerateTriggerRef.current?.focus();
  }, []);

  const confirmRegenerate = async () => {
    if (!onRegenerateCodes || isRegenerating) return;
    setIsRegenerating(true);
    setRegenerateError(null);
    try {
      const newCodes = await onRegenerateCodes();
      if (!isMountedRef.current) return;
      setCodes(newCodes);
      setRevealed(new Array(newCodes.length).fill(false));
      setAllRevealed(false);
      setIsCopied(false);
      setAcknowledged(false);
      setIsRegenerating(false);
      closeRegenerateDialog();
    } catch {
      if (!isMountedRef.current) return;
      setIsRegenerating(false);
      setRegenerateError('Could not regenerate recovery codes. Your existing codes are unchanged. Please try again.');
    }
  };

  const cancelRegenerate = () => {
    if (isRegenerating) return;
    closeRegenerateDialog();
  };

  // Count of revealed codes for status indicators
  const revealedCount = revealed.filter(Boolean).length;
  const allCodesRevealed = revealed.length > 0 && revealed.every(Boolean);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Critical Warning Banner */}
      <div className="tfa-warning-banner" role="alert" aria-live="polite">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} aria-hidden="true" className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1">
              🚨 SAVE THESE CODES NOW - ACCOUNT RECOVERY DEPENDENCY
            </p>
            <p className="text-sm">
              <strong>These are your last line of defense.</strong> If you lose access to your authenticator app, these recovery codes are the <strong>ONLY</strong> way to get back into your account.
              Each code can be used once and <strong>expires after 30 minutes of deactivation.</strong>
            </p>
            <p className="text-xs mt-2 opacity-90">
              📱肩-surfing安全: Codes are hidden by default. Click to reveal.
            </p>
          </div>
        </div>
      </div>

      {/* Status and Actions Bar */}
      <div className="bg-glass-bg-accent rounded-lg p-4 border border-glass-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-medium">Revealed:</span> {revealedCount}/{codes.length}
            </div>
            {allCodesRevealed && (
              <div className="flex items-center gap-1 text-success">
                <CheckCircle2 size={16} aria-hidden="true" />
                <span className="text-sm font-medium">All codes visible</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleAllReveal}
              className="btn-secondary text-sm"
              aria-label={allRevealed ? 'Hide all recovery codes' : 'Show all recovery codes'}
            >
              {allRevealed ? (
                <><EyeOff size={16} className="mr-1" aria-hidden="true" /> Hide All</>
              ) : (
                <><Eye size={16} className="mr-1" aria-hidden="true" /> Reveal All</>
              )}
            </button>

            <button
              type="button"
              onClick={copyAllCodes}
              disabled={revealedCount === 0}
              className={`btn-secondary text-sm ${isCopied ? 'bg-success/20' : ''}`}
              aria-label="Copy all revealed recovery codes to clipboard"
            >
              {isCopied ? (
                <><Check size={16} className="mr-1" aria-hidden="true" /> Copied!</>
              ) : (
                <><CopyIcon size={16} className="mr-1" aria-hidden="true" /> Copy All</>
              )}
            </button>

            <button
              type="button"
              onClick={downloadCodes}
              disabled={revealedCount === 0}
              className="btn-secondary text-sm"
              aria-label="Download revealed recovery codes as text file"
            >
              <Download size={16} className="mr-1" aria-hidden="true" /> Download
            </button>

            <button
              type="button"
              onClick={printCodes}
              disabled={revealedCount === 0}
              className="btn-secondary text-sm"
              aria-label="Print recovery codes"
            >
              <Printer size={16} className="mr-1" aria-hidden="true" /> Print
            </button>

            {onRegenerateCodes && (
              <button
                ref={regenerateTriggerRef}
                type="button"
                onClick={handleRegenerate}
                className="btn-secondary text-sm text-error hover:bg-error/10"
                aria-label="Regenerate recovery codes"
              >
                <RotateCcw size={16} className="mr-1" aria-hidden="true" /> Regenerate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Codes Grid with Reveal-on-Click */}
      <div
        ref={codesGridRef}
        className="tfa-recovery-grid"
        role="grid"
        aria-label="Recovery codes grid"
        style={{ gridTemplateColumns: `repeat(${Math.min(CODES_PER_ROW, codes.length)}, 1fr)` }}
      >
        {codes.map((code, idx) => (
          <button
            key={code}
            type="button"
            onClick={() => toggleReveal(idx)}
            className={`
              tfa-recovery-card
              ${revealed[idx] ? 'revealed' : 'hidden'}
              ${allRevealed ? 'all-revealed' : ''}
              ${!acknowledged ? 'cursor-pointer' : 'cursor-default'}
            `}
            aria-pressed={revealed[idx]}
            aria-label={`Code ${idx + 1}: ${revealed[idx] ? 'visible, click to hide' : 'hidden, click to reveal'}`}
            disabled={!acknowledged}
          >
            <div className="tfa-recovery-card__content">
              <div className="tfa-recovery-card__index" aria-hidden="true">
                {idx + 1}
              </div>
              <div className={`tfa-recovery-card__code ${revealed[idx] ? '' : 'placeholder'}`}>
                {revealed[idx] ? code : CODE_PLACEHOLDER}
              </div>
              {revealed[idx] && (
                <div className="tfa-recovery-card__status" aria-hidden="true">
                  👁️
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="text-center text-xs text-muted">
        💡 Click on any code to toggle visibility for shoulder-surfing safety
      </div>

      {/* Acknowledgment Checkbox */}
      <label className="tfa-acknowledge-stack relative group">
        <div className="flex items-start gap-3 p-4 bg-glass-bg-accent rounded-lg border border-glass-border hover:border-primary/30 transition-colors">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            aria-required="true"
            className="mt-1 w-5 h-5 rounded border-2 border-glass-border text-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex-1">
            <span className="font-medium block mb-1">I have saved my recovery codes in a safe place.</span>
            <span className="text-xs text-muted block">
              I understand that these codes provide account recovery access and I have stored them securely.
            </span>
          </div>
          {acknowledged && (
            <CheckCircle2 size={20} className="text-success flex-shrink-0" aria-hidden="true" />
          )}
        </div>
      </label>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          className="btn-secondary"
          onClick={onBack}
        >
          Back
        </button>
        <Button
          type="button"
          disabled={!acknowledged}
          onClick={onNext}
          className="flex-1"
        >
          Continue
        </Button>
      </div>

      {/* Regenerate Confirmation Modal */}
      {onRegenerateCodes && showRegenerateConfirm && (
        <RegenerateCodesDialog
          isPending={isRegenerating}
          error={regenerateError}
          onConfirm={confirmRegenerate}
          onCancel={cancelRegenerate}
        />
      )}

      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {revealedCount === codes.length && allRevealed &&
          "All recovery codes are now visible. Click any code to hide it."
        }
        {revealedCount === 0 &&
          "No recovery codes are currently visible. Click any code to reveal it."
        }
        {isCopied &&
          "Codes copied to clipboard successfully!"
        }
      </div>
    </div>
  );
};
