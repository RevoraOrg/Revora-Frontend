import React, { useEffect, useId, useRef, useState } from 'react';
import { Copy, ExternalLink, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface GovernanceVoteReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalTitle: string;
  voteChoice: 'For' | 'Against' | 'Abstain';
  timestamp: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export const GovernanceVoteReceiptModal: React.FC<GovernanceVoteReceiptModalProps> = ({
  isOpen,
  onClose,
  proposalTitle,
  voteChoice,
  timestamp,
  txHash,
  status,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(txHash);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const truncatedHash = `${txHash.substring(0, 6)}...${txHash.substring(txHash.length - 4)}`;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-xl font-semibold text-slate-900 dark:text-white">
            Vote Cast Successfully
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Close receipt modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p id={descriptionId} className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Your vote has been submitted. Here is your receipt.
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Proposal</div>
            <div className="mt-1 font-medium text-slate-900 dark:text-white">{proposalTitle}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vote</div>
              <div className="mt-1 font-medium text-slate-900 dark:text-white">{voteChoice}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</div>
              <div className="mt-1 font-medium text-slate-900 dark:text-white">{timestamp}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Transaction Hash</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{truncatedHash}</span>
              <div className="flex gap-1">
                <button
                  onClick={handleCopyHash}
                  className="rounded p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
                  aria-label="Copy transaction hash"
                >
                  <Copy size={16} />
                </button>
                <a
                  href={`https://explorer.example.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
                  aria-label="View transaction in explorer"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
            {copyStatus === 'copied' && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block">Copied!</span>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
