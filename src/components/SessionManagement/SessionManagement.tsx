import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  LogOut,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import "./SessionManagement.css";

interface SessionDevice {
  id: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

const MOCK_SESSIONS: SessionDevice[] = [
  {
    id: "sess-1",
    deviceName: "MacBook Pro 16",
    deviceType: "desktop",
    browser: "Chrome 125",
    os: "macOS 15.2",
    ipAddress: "192.168.1.42",
    location: "San Francisco, CA",
    lastActive: "2026-06-26T10:30:00Z",
    isCurrent: true,
  },
  {
    id: "sess-2",
    deviceName: "iPhone 16 Pro",
    deviceType: "mobile",
    browser: "Safari 18",
    os: "iOS 19.0",
    ipAddress: "203.0.113.45",
    location: "San Francisco, CA",
    lastActive: "2026-06-25T22:15:00Z",
    isCurrent: false,
  },
  {
    id: "sess-3",
    deviceName: "Windows Desktop",
    deviceType: "desktop",
    browser: "Firefox 128",
    os: "Windows 11",
    ipAddress: "198.51.100.88",
    location: "New York, NY",
    lastActive: "2026-06-24T14:45:00Z",
    isCurrent: false,
  },
  {
    id: "sess-4",
    deviceName: "iPad Air",
    deviceType: "tablet",
    browser: "Safari 18",
    os: "iPadOS 19.0",
    ipAddress: "203.0.113.102",
    location: "Los Angeles, CA",
    lastActive: "2026-06-20T09:00:00Z",
    isCurrent: false,
  },
];

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DeviceIcon({ type }: { type: SessionDevice["deviceType"] }) {
  switch (type) {
    case "mobile":
      return <Smartphone size={20} aria-hidden="true" />;
    case "tablet":
      return <Laptop size={20} aria-hidden="true" />;
    default:
      return <Monitor size={20} aria-hidden="true" />;
  }
}

function SROnly({ children }: { children: React.ReactNode }) {
  return <span className="sm-sr-only">{children}</span>;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const FOCUSABLE_SELECTOR =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus({ preventScroll: true });
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key === "Tab" && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="sm-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={handleOverlayClick}
    >
      <div className="sm-dialog glass-card" ref={dialogRef}>
        <div className="sm-dialog-icon-wrap">
          <AlertTriangle size={24} aria-hidden="true" />
        </div>
        <h2 id={titleId} className="sm-dialog-title">{title}</h2>
        <p id={descriptionId} className="sm-dialog-message">{message}</p>
        <div className="sm-dialog-actions">
          <button
            className="sm-btn sm-btn--secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="sm-btn sm-btn--danger"
            onClick={onConfirm}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? "Revoking..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SessionManagementProps {
  __initialSessions?: SessionDevice[];
  __onRevokeSingle?: (sessionId: string) => Promise<void>;
  __onRevokeAll?: () => Promise<void>;
}

export function SessionManagement({
  __initialSessions = MOCK_SESSIONS,
  __onRevokeSingle,
  __onRevokeAll,
}: SessionManagementProps) {
  const [sessions, setSessions] = useState<SessionDevice[]>(__initialSessions);
  const [dialogState, setDialogState] = useState<{
    type: "single" | "all";
    sessionId?: string;
    deviceName?: string;
  } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => setAnnouncement(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    };
  }, []);

  const handleRevokeSingle = useCallback(async () => {
    if (!dialogState || dialogState.type !== "single" || !dialogState.sessionId) return;

    const sessionId = dialogState.sessionId;
    setRevokingId(sessionId);

    if (__onRevokeSingle) {
      await __onRevokeSingle(sessionId);
    } else {
      await new Promise((r) => setTimeout(r, 800));
    }

    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setRevokingId(null);
    setDialogState(null);
    announce(`Session for ${dialogState.deviceName || "device"} revoked`);
  }, [dialogState, __onRevokeSingle, announce]);

  const handleRevokeAll = useCallback(async () => {
    setRevokingAll(true);

    if (__onRevokeAll) {
      await __onRevokeAll();
    } else {
      await new Promise((r) => setTimeout(r, 1200));
    }

    setSessions((prev) => prev.filter((s) => !s.isCurrent));
    setRevokingAll(false);
    setDialogState(null);
    announce("Signed out of all other devices");
  }, [__onRevokeAll, announce]);

  const hasOtherSessions = sessions.some((s) => !s.isCurrent);

  return (
    <div className="sm-container animate-fade-in" data-testid="session-management">
      {/* ── Live region for screen-reader announcements ── */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sm-sr-only"
      >
        {announcement}
      </div>

      {/* ── Page header ── */}
      <div className="sm-header">
        <Link
          to="/"
          className="sm-back-link"
          aria-label="Back to Home"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to Home
        </Link>
        <h1 className="sm-title">Session Management</h1>
        <p className="sm-subtitle">
          View and manage your active sessions across all devices.
        </p>
      </div>

      {/* ── Sessions list ── */}
      <section aria-label="Active sessions">
        {sessions.length === 0 ? (
          <div className="sm-empty" role="status">
            <ShieldCheck size={48} aria-hidden="true" />
            <h2 className="sm-empty-title">No active sessions</h2>
            <p className="sm-empty-text">
              All sessions have been signed out. Sign in again to create a new session.
            </p>
          </div>
        ) : (
          <>
            {sessions.length > 1 && hasOtherSessions && (
              <div className="sm-bulk-action">
                <button
                  className="sm-btn sm-btn--destructive"
                  onClick={() => setDialogState({ type: "all" })}
                  disabled={revokingAll}
                  aria-busy={revokingAll}
                >
                  {revokingAll ? (
                    "Signing out..."
                  ) : (
                    <>
                      <LogOut size={16} aria-hidden="true" />
                      Sign out of all other devices
                    </>
                  )}
                </button>
              </div>
            )}

            <ul className="sm-session-list" role="list">
              {sessions.map((session) => {
                const isRevoking = revokingId === session.id;
                const canRevoke = !session.isCurrent && !isRevoking && !revokingAll;

                return (
                  <li
                    key={session.id}
                    className={`sm-session-card glass-card${session.isCurrent ? " sm-session-card--current" : ""}`}
                    data-testid={`session-${session.id}`}
                  >
                    <div className="sm-session-main">
                      <div className="sm-session-icon" aria-hidden="true">
                        <DeviceIcon type={session.deviceType} />
                      </div>

                      <div className="sm-session-info">
                        <div className="sm-session-name-row">
                          <span className="sm-session-name">{session.deviceName}</span>
                          {session.isCurrent && (
                            <span className="sm-current-badge">
                              Current session
                            </span>
                          )}
                        </div>

                        <div className="sm-session-meta">
                          <span className="sm-meta-item">
                            <Monitor size={12} aria-hidden="true" />
                            {session.browser} on {session.os}
                          </span>
                          <span className="sm-meta-item">
                            <Globe size={12} aria-hidden="true" />
                            {session.location}
                          </span>
                          <span className="sm-meta-item">
                            <Clock size={12} aria-hidden="true" />
                            <span
                              aria-label={`Last active ${formatFullDate(session.lastActive)}`}
                            >
                              {formatRelativeTime(session.lastActive)}
                            </span>
                          </span>
                        </div>

                        <div className="sm-session-ip sm-meta-item">
                          IP: {session.ipAddress}
                        </div>
                      </div>

                      <div className="sm-session-action">
                        {session.isCurrent ? (
                          <span className="sm-current-hint" aria-label="This is your current session">
                            <ShieldCheck size={16} aria-hidden="true" />
                          </span>
                        ) : (
                          <button
                            className="sm-btn sm-btn--ghost-destructive"
                            onClick={() =>
                              setDialogState({
                                type: "single",
                                sessionId: session.id,
                                deviceName: session.deviceName,
                              })
                            }
                            disabled={!canRevoke}
                            aria-label={`Revoke session for ${session.deviceName}`}
                          >
                            {isRevoking ? (
                              "Revoking..."
                            ) : (
                              <>
                                <LogOut size={14} aria-hidden="true" />
                                <span className="sm-hide-mobile">Revoke</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {!hasOtherSessions && sessions.length === 1 && (
              <p className="sm-single-session-note text-muted text-sm mt-4 text-center">
                Only your current session is active.
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Confirm Dialog ── */}
      {dialogState?.type === "single" && (
        <ConfirmDialog
          isOpen
          title="Revoke session?"
          message={`This will sign out "${dialogState.deviceName}" immediately. You may need to sign in again on that device.`}
          confirmLabel="Revoke"
          onConfirm={handleRevokeSingle}
          onCancel={() => setDialogState(null)}
          isLoading={revokingId !== null}
        />
      )}

      {dialogState?.type === "all" && (
        <ConfirmDialog
          isOpen
          title="Sign out everywhere?"
          message="This will sign out all other active sessions. Your current session will remain active."
          confirmLabel="Sign out everywhere"
          onConfirm={handleRevokeAll}
          onCancel={() => setDialogState(null)}
          isLoading={revokingAll}
        />
      )}
    </div>
  );
}
