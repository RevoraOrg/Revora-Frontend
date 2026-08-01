import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bookmark, Check, ChevronDown, Copy, Pencil, Star, Trash2, X } from 'lucide-react';
import './BlacklistSavedViews.css';
import type { BlacklistSavedView, BlacklistSavedViewsProps } from './BlacklistSavedViews.types';

export const BlacklistSavedViews: React.FC<BlacklistSavedViewsProps> = ({
  views,
  activeViewId,
  currentFilters,
  hasActiveFilters = false,
  hasError = false,
  onApplyView,
  onSaveView,
  onRenameView,
  onDeleteView,
  onSetDefaultView,
  onShareView,
}) => {
  const [open, setOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setRenamingId(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingId]);

  const handleSaveNew = () => {
    const name = newViewName.trim();
    if (!name) return;
    onSaveView(name, currentFilters);
    setNewViewName('');
    setOpen(false);
  };

  const handleRenameConfirm = () => {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (name) {
      onRenameView(renamingId, name);
    }
    setRenamingId(null);
  };

  const handleShare = (view: BlacklistSavedView) => {
    onShareView(view);
    setCopiedId(view.id);
    window.setTimeout(() => {
      setCopiedId((id) => (id === view.id ? null : id));
    }, 2000);
  };

  const canSave = hasActiveFilters && newViewName.trim().length > 0;

  return (
    <div className="blacklist-saved-views" ref={containerRef} data-testid="blacklist-saved-views">
      <button
        type="button"
        className={`blacklist-saved-views-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid="blacklist-saved-views-trigger"
      >
        <Bookmark size={14} aria-hidden="true" />
        <span>Saved Views</span>
        <span className="blacklist-saved-views-count" aria-label={`${views.length} saved views`}>
          {views.length}
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="blacklist-saved-views-panel"
          role="dialog"
          aria-label="Saved blacklist views"
          data-testid="blacklist-saved-views-panel"
        >
          <div className="blacklist-saved-views-header">
            <span className="blacklist-saved-views-title">Saved Views</span>
            <button
              type="button"
              className="blacklist-saved-views-close"
              onClick={() => setOpen(false)}
              aria-label="Close saved views"
              data-testid="blacklist-saved-views-close"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          {hasError ? (
            <div className="blacklist-saved-views-error" data-testid="blacklist-saved-views-error">
              <AlertTriangle size={18} aria-hidden="true" />
              <p>Couldn't load your saved views.</p>
              <p className="blacklist-saved-views-error-hint">
                Try refreshing the page, or save your current filters again.
              </p>
            </div>
          ) : views.length === 0 ? (
            <div className="blacklist-saved-views-empty" data-testid="blacklist-saved-views-empty">
              <Star size={18} aria-hidden="true" />
              <p>No saved views yet.</p>
              <p className="blacklist-saved-views-empty-hint">
                Save your current filters below to reuse them.
              </p>
            </div>
          ) : (
            <ul className="blacklist-saved-views-list" data-testid="blacklist-saved-views-list">
              {views.map((view) => {
                const isActive = view.id === activeViewId;
                const isRenaming = renamingId === view.id;
                const isCopied = copiedId === view.id;
                return (
                  <li
                    key={view.id}
                    className={`blacklist-saved-view-row ${isActive ? 'is-active' : ''}`}
                    data-testid={`saved-view-row-${view.id}`}
                  >
                    {isRenaming ? (
                      <div className="blacklist-saved-view-rename">
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') handleRenameConfirm();
                            if (event.key === 'Escape') setRenamingId(null);
                          }}
                          aria-label="Rename saved view"
                          data-testid="saved-view-rename-input"
                        />
                        <button
                          type="button"
                          onClick={handleRenameConfirm}
                          aria-label="Confirm rename"
                          data-testid="saved-view-rename-confirm"
                        >
                          <Check size={14} aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="blacklist-saved-view-name"
                          onClick={() => onApplyView(view)}
                          aria-label={`Apply saved view ${view.name}`}
                          data-testid={`saved-view-apply-${view.id}`}
                        >
                          <span>{view.name}</span>
                          {view.isDefault && (
                            <span className="blacklist-saved-view-default-badge">Default</span>
                          )}
                        </button>
                        <div className="blacklist-saved-view-actions">
                          <button
                            type="button"
                            className={view.isDefault ? 'is-default' : ''}
                            onClick={() => onSetDefaultView(view.id)}
                            aria-label={
                              view.isDefault ? 'Remove default view' : 'Set as default view'
                            }
                            aria-pressed={!!view.isDefault}
                            title="Set as default"
                            data-testid={`saved-view-default-${view.id}`}
                          >
                            <Star size={13} fill={view.isDefault ? 'currentColor' : 'none'} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingId(view.id);
                              setRenameValue(view.name);
                            }}
                            aria-label={`Rename ${view.name}`}
                            title="Rename"
                            data-testid={`saved-view-rename-${view.id}`}
                          >
                            <Pencil size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShare(view)}
                            aria-label={`Share ${view.name}`}
                            title="Share via URL"
                            data-testid={`saved-view-share-${view.id}`}
                          >
                            {isCopied ? (
                              <Check size={13} aria-hidden="true" />
                            ) : (
                              <Copy size={13} aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="is-danger"
                            onClick={() => onDeleteView(view.id)}
                            aria-label={`Delete ${view.name}`}
                            title="Delete"
                            data-testid={`saved-view-delete-${view.id}`}
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        </div>
                        {isCopied && (
                          <span
                            className="blacklist-saved-view-copied"
                            data-testid={`saved-view-copied-${view.id}`}
                          >
                            Link copied!
                          </span>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="blacklist-saved-views-footer">
            <input
              type="text"
              className="blacklist-saved-views-new-input"
              placeholder="Save current filters as…"
              value={newViewName}
              onChange={(event) => setNewViewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSaveNew();
              }}
              aria-label="New saved view name"
              data-testid="blacklist-saved-views-new-input"
            />
            <button
              type="button"
              className="blacklist-saved-views-save-btn"
              onClick={handleSaveNew}
              disabled={!canSave}
              data-testid="blacklist-saved-views-save-btn"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
