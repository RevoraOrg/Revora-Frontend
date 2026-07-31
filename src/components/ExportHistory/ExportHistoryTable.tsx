import React, { useState, useRef, useEffect } from 'react';
import { EmptyState } from '../designSystem/EmptyState';
import { ShareLinkDialog } from './ShareLinkDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Share2, RefreshCw, Trash2, FileDown, MoreHorizontal } from 'lucide-react';

export interface ExportHistoryEntry {
  id: string;
  timestamp: string; // ISO
  type: string; // 'CSV', 'PDF', etc.
  scope: string; // e.g. "Payouts in Q2"
  sizeBytes: number;
}

export const MOCK_EXPORTS: ExportHistoryEntry[] = [
  { id: 'exp1', timestamp: '2026-07-25T14:20:00Z', type: 'CSV', scope: 'All payouts in July', sizeBytes: 1024 * 45 },
  { id: 'exp2', timestamp: '2026-07-24T09:15:00Z', type: 'PDF', scope: 'Compliance audit report', sizeBytes: 1024 * 1024 * 2.4 },
  { id: 'exp3', timestamp: '2022-01-10T10:00:00Z', type: 'CSV', scope: 'Very old export', sizeBytes: 1024 * 12 },
];

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const ExportRowActions: React.FC<{
  entry: ExportHistoryEntry;
  onRerun: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ entry, onRerun, onShare, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const handleFocusOut = (event: React.FocusEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} onBlur={handleFocusOut} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn--secondary btn--sm"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`More actions for export ${entry.scope}`}
        title="More actions"
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '0.25rem 0.5rem' }}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      
      {isOpen && (
        <div 
          role="menu"
          className="glass-card"
          style={{ 
            position: 'absolute', 
            right: 0, 
            top: '100%', 
            marginTop: '0.25rem', 
            zIndex: 50,
            minWidth: '160px',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <button 
            role="menuitem"
            className="btn btn--secondary btn--sm" 
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => { setIsOpen(false); onRerun(entry.id); }}
          >
            <RefreshCw size={14} aria-hidden="true" style={{ marginRight: '0.5rem' }} />
            Rerun Export
          </button>
          <button 
            role="menuitem"
            className="btn btn--secondary btn--sm" 
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => { setIsOpen(false); onShare(entry.id); }}
          >
            <Share2 size={14} aria-hidden="true" style={{ marginRight: '0.5rem' }} />
            Share Link
          </button>
          <button 
            role="menuitem"
            className="btn btn--secondary btn--sm" 
            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-danger, #ef4444)' }}
            onClick={() => { setIsOpen(false); onDelete(entry.id); }}
          >
            <Trash2 size={14} aria-hidden="true" style={{ marginRight: '0.5rem' }} />
            Delete Export
          </button>
        </div>
      )}
    </div>
  );
};


export const ExportHistoryTable: React.FC = () => {
  const [exports, setExports] = useState<ExportHistoryEntry[]>(MOCK_EXPORTS);
  const [shareDialogId, setShareDialogId] = useState<string | null>(null);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setExports((prev) => prev.filter((e) => e.id !== id));
    setDeleteDialogId(null);
  };

  const handleRerun = (id: string) => {
    // In a real app, this would trigger an API call to re-generate the export
    const entry = exports.find(e => e.id === id);
    if (!entry) return;
    const newEntry = {
      ...entry,
      id: `exp-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setExports((prev) => [newEntry, ...prev]);
  };

  if (exports.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '2rem' }}>
        <EmptyState
          variant="audit-trail"
          title="No export history"
          description="Your past exports will appear here. You can easily rerun, share, or download them again."
          primaryAction={{ label: 'Back to Audit Trail', onClick: () => window.location.hash = '' }}
        />
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <h2 className="text-xl font-bold mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FileDown size={20} />
        Export History
      </h2>
      <div className="atf-results" style={{ overflowX: 'auto' }}>
        <table className="atf-table" style={{ width: '100%', textAlign: 'left', minWidth: '600px' }}>
          <caption className="sr-only">Past exports table</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Type</th>
              <th scope="col">Scope Summary</th>
              <th scope="col">Size</th>
              <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {exports.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.timestamp).toLocaleString()}</td>
                <td>
                  <span style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    {entry.type}
                  </span>
                </td>
                <td>{entry.scope}</td>
                <td>{formatBytes(entry.sizeBytes)}</td>
                <td style={{ textAlign: 'right' }}>
                  <ExportRowActions 
                    entry={entry}
                    onRerun={handleRerun}
                    onShare={(id) => setShareDialogId(id)}
                    onDelete={(id) => setDeleteDialogId(id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ShareLinkDialog
        open={shareDialogId !== null}
        exportId={shareDialogId}
        onClose={() => setShareDialogId(null)}
      />

      <DeleteConfirmDialog
        open={deleteDialogId !== null}
        exportId={deleteDialogId}
        onConfirm={handleDelete}
        onClose={() => setDeleteDialogId(null)}
      />
    </div>
  );
};
