import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, RefreshCw, Trash2, Check, AlertTriangle } from 'lucide-react';
import { Button } from '../Button';
import './CalendarExportDialog.css';

interface CalendarExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Scope = 'single' | 'issuer' | 'all';
type ClientTab = 'google' | 'outlook' | 'apple';

export const CalendarExportDialog: React.FC<CalendarExportDialogProps> = ({ isOpen, onClose }) => {
  const [scope, setScope] = useState<Scope>('all');
  const [token, setToken] = useState('a1b2c3d4e5f6g7h8');
  const [copied, setCopied] = useState(false);
  const [lastUsed, setLastUsed] = useState<string | null>('Today at 10:42 AM');
  const [clientTab, setClientTab] = useState<ClientTab>('google');
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const url = `https://api.revora.co/v1/calendar/payouts/${scope}/${token}.ics`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      if (inputRef.current) {
        inputRef.current.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('Failed to copy text', err);
        }
      }
    }
  };

  const handleRegenerate = () => {
    setToken(Math.random().toString(36).substring(2, 18));
    setLastUsed(null);
    setShowRevokeConfirm(false);
  };

  const handleRevoke = () => {
    setToken('');
    setLastUsed(null);
    setShowRevokeConfirm(false);
  };

  const preventAutoClose = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className="calendar-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-dialog-title"
      onClick={onClose}
    >
      <div 
        className="calendar-dialog-content" 
        onClick={preventAutoClose}
        role="document"
      >
        <div className="calendar-dialog-header">
          <div>
            <h2 className="calendar-dialog-title" id="calendar-dialog-title">Subscribe to Calendar</h2>
            <p className="calendar-dialog-desc">Sync upcoming payout dates to your calendar application.</p>
          </div>
          <button
            className="calendar-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="calendar-tabs" role="tablist" aria-label="Subscription scope">
          <button
            role="tab"
            aria-selected={scope === 'single'}
            className={`calendar-tab ${scope === 'single' ? 'calendar-tab-active' : ''}`}
            onClick={() => setScope('single')}
          >
            Single Payout
          </button>
          <button
            role="tab"
            aria-selected={scope === 'issuer'}
            className={`calendar-tab ${scope === 'issuer' ? 'calendar-tab-active' : ''}`}
            onClick={() => setScope('issuer')}
          >
            Per Issuer
          </button>
          <button
            role="tab"
            aria-selected={scope === 'all'}
            className={`calendar-tab ${scope === 'all' ? 'calendar-tab-active' : ''}`}
            onClick={() => setScope('all')}
          >
            All Payouts
          </button>
        </div>

        <div className="calendar-url-group">
          <label htmlFor="calendar-url" className="calendar-url-label">Subscription URL</label>
          <div className="calendar-url-wrapper">
            <input
              ref={inputRef}
              id="calendar-url"
              type="text"
              readOnly
              value={token ? url : 'URL Revoked'}
              className="calendar-url-input"
              dir="ltr"
            />
            <Button
              type="button"
              onClick={handleCopy}
              disabled={!token}
              variant="primary"
              style={{ width: 'auto' }}
              aria-label="Copy URL"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          {lastUsed && token && (
            <p className="text-muted" style={{ fontSize: '0.75rem' }}>
              Last used: {lastUsed}
            </p>
          )}
        </div>

        <div className="calendar-actions-group">
          {!showRevokeConfirm ? (
            <div className="calendar-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={handleRegenerate}
                style={{ flex: 1 }}
              >
                <RefreshCw size={18} />
                Regenerate
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowRevokeConfirm(true)}
                disabled={!token}
                className="text-error"
                style={{ flex: 1 }}
              >
                <Trash2 size={18} />
                Revoke
              </Button>
            </div>
          ) : (
            <div className="calendar-revoke-confirm" role="alert">
              <div className="calendar-revoke-confirm-msg">
                <AlertTriangle size={16} className="text-error" />
                <span className="text-sm font-medium">Are you sure? Existing calendar syncs will break.</span>
              </div>
              <div className="calendar-revoke-confirm-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowRevokeConfirm(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleRevoke}
                  className="bg-error hover:bg-error/90 text-white border-error"
                  style={{ flex: 1 }}
                >
                  Confirm Revoke
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="calendar-instructions">
          <div className="calendar-instructions-header">
            <h3 className="calendar-instructions-title" id="calendar-instructions-title">Instructions</h3>
            <div className="calendar-instructions-tabs" role="tablist" aria-label="Calendar Client">
              <button
                role="tab"
                aria-selected={clientTab === 'google'}
                className={`calendar-client-tab ${clientTab === 'google' ? 'calendar-client-tab-active' : ''}`}
                onClick={() => setClientTab('google')}
              >
                Google
              </button>
              <button
                role="tab"
                aria-selected={clientTab === 'outlook'}
                className={`calendar-client-tab ${clientTab === 'outlook' ? 'calendar-client-tab-active' : ''}`}
                onClick={() => setClientTab('outlook')}
              >
                Outlook
              </button>
              <button
                role="tab"
                aria-selected={clientTab === 'apple'}
                className={`calendar-client-tab ${clientTab === 'apple' ? 'calendar-client-tab-active' : ''}`}
                onClick={() => setClientTab('apple')}
              >
                Apple
              </button>
            </div>
          </div>
          
          <div className="calendar-instructions-content" role="tabpanel" aria-labelledby="calendar-instructions-title">
            {clientTab === 'google' && (
              <ol className="calendar-instructions-list">
                <li>Go to Google Calendar on the web.</li>
                <li>Next to "Other calendars" on the left, click <strong>+</strong> &gt; <strong>From URL</strong>.</li>
                <li>Paste the URL above and click <strong>Add calendar</strong>.</li>
              </ol>
            )}
            {clientTab === 'outlook' && (
              <ol className="calendar-instructions-list">
                <li>Go to Outlook Calendar on the web.</li>
                <li>Click <strong>Add calendar</strong> &gt; <strong>Subscribe from web</strong>.</li>
                <li>Paste the URL above, name the calendar, and click <strong>Import</strong>.</li>
              </ol>
            )}
            {clientTab === 'apple' && (
              <ol className="calendar-instructions-list">
                <li>Open the Calendar app on your Mac.</li>
                <li>Choose <strong>File</strong> &gt; <strong>New Calendar Subscription</strong>.</li>
                <li>Paste the URL above and click <strong>Subscribe</strong>.</li>
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
