/**
 * SecuritySettingsPage — /settings/security
 *
 * Combines:
 *   - Two-factor authentication setup (TwoFactorSetup wizard)
 *   - Recovery codes view/regeneration (TwoFactorBackupCodesPage)
 *   - Active session management (SessionManagement)
 *
 * All three panels share state through TwoFactorProvider so that completing
 * the setup wizard immediately makes codes visible in the codes panel, and
 * revoking a session is reflected in both the session list and the aria-live
 * announcement region.
 */

import React, { useState, useId, useCallback } from 'react';
import { ShieldCheck, KeyRound, Smartphone } from 'lucide-react';
import { TwoFactorProvider, useTwoFactorState } from '../hooks/useTwoFactorState';
import { TwoFactorSetup } from '../components/TwoFactorSetup';
import TwoFactorBackupCodesPage from './TwoFactorBackupCodesPage';
import { SessionManagement } from '../components/SessionManagement/SessionManagement';
import { DEFAULT_RECOVERY_CODES } from '../components/TwoFactorSetup/constants';

/* ─── Tab ids ────────────────────────────────────────────────────── */

type SecurityTab = '2fa' | 'codes' | 'sessions';

/* ─── Inner page (uses context) ──────────────────────────────────── */

function SecuritySettingsInner() {
  const [activeTab, setActiveTab] = useState<SecurityTab>('2fa');
  const tabGroupId = useId();
  const {
    enabled,
    recoveryCodes,
    sessions,
    enable,
    setRecoveryCodes,
    revokeSession,
    revokeAllSessions,
  } = useTwoFactorState();

  // ── Announcement region ───────────────────────────────────────────
  const [announcement, setAnnouncement] = useState('');
  const announcementId = `${tabGroupId}-announcement`;

  const announce = useCallback((msg: string) => {
    setAnnouncement(msg);
    setTimeout(() => setAnnouncement(''), 3000);
  }, []);

  // ── 2FA setup completion ──────────────────────────────────────────
  const handleSetupComplete = useCallback(() => {
    // The TwoFactorSetup wizard calls onComplete when the user clicks "Done"
    // on step 5. At that point we can't pass back the method / codes because
    // the existing TwoFactorSetup API only exposes onComplete():void.
    // We use the defaults for a fresh setup and treat codes from prop.
    enable('totp', DEFAULT_RECOVERY_CODES);
    announce('Two-factor authentication enabled');
    setActiveTab('codes');
  }, [enable, announce]);

  // ── Regenerate codes ──────────────────────────────────────────────
  const handleRegenerateCodes = useCallback(async (): Promise<string[]> => {
    // In production this would call a server endpoint. Here we generate a
    // fresh set of placeholder codes for demo purposes.
    const timestamp = Date.now().toString(36).toUpperCase();
    const newCodes = Array.from({ length: 10 }, (_, i) =>
      `REVR-${timestamp.slice(0, 4)}-${String(i + 1).padStart(4, '0')}`,
    );
    setRecoveryCodes(newCodes);
    announce('Recovery codes regenerated');
    return newCodes;
  }, [setRecoveryCodes, announce]);

  // ── Session revocation ────────────────────────────────────────────
  const handleRevoke = useCallback(
    async (sessionId: string): Promise<void> => {
      revokeSession(sessionId);
      announce('Session revoked');
    },
    [revokeSession, announce],
  );

  const handleRevokeAll = useCallback(async (): Promise<void> => {
    revokeAllSessions();
    announce('Signed out of all other devices');
  }, [revokeAllSessions, announce]);

  // ── Tab config ────────────────────────────────────────────────────
  const tabs: { id: SecurityTab; label: string; icon: React.ReactNode }[] = [
    {
      id: '2fa',
      label: 'Two-Factor Auth',
      icon: <ShieldCheck size={18} aria-hidden="true" />,
    },
    {
      id: 'codes',
      label: 'Backup Codes',
      icon: <KeyRound size={18} aria-hidden="true" />,
    },
    {
      id: 'sessions',
      label: 'Active Sessions',
      icon: <Smartphone size={18} aria-hidden="true" />,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* ── Aria-live announcement region ── */}
      <div
        id={announcementId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="security-announcement"
      >
        {announcement}
      </div>

      {/* ── Page header ── */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-primary" size={28} aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-main">Security Settings</h1>
            <p className="text-sm text-muted mt-1">
              Manage two-factor authentication, backup recovery codes, and active sessions.
            </p>
          </div>
        </div>
        {enabled && (
          <div
            className="mt-4 flex items-center gap-2 text-sm text-success"
            aria-label="Two-factor authentication is active"
          >
            <ShieldCheck size={16} aria-hidden="true" />
            Two-factor authentication is active
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex border-b border-slate-800 gap-2"
        role="tablist"
        aria-label="Security settings tabs"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${tabGroupId}-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`${tabGroupId}-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-main'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab panels ── */}
      <div>
        {/* Two-Factor Auth panel */}
        <div
          id={`${tabGroupId}-panel-2fa`}
          role="tabpanel"
          aria-labelledby={`${tabGroupId}-tab-2fa`}
          hidden={activeTab !== '2fa'}
        >
          {activeTab === '2fa' && (
            enabled ? (
              <div className="glass-card p-6 text-center space-y-4">
                <ShieldCheck size={48} className="text-success mx-auto" aria-hidden="true" />
                <h2 className="text-xl font-bold">Two-Factor Authentication Enabled</h2>
                <p className="text-muted text-sm">
                  Your account is protected. Use the Backup Codes tab to view or regenerate
                  your recovery codes.
                </p>
              </div>
            ) : (
              <div className="glass-card p-6">
                <TwoFactorSetup
                  onComplete={handleSetupComplete}
                  onCancel={() => {/* no-op — user stays on the page */}}
                />
              </div>
            )
          )}
        </div>

        {/* Backup Codes panel */}
        <div
          id={`${tabGroupId}-panel-codes`}
          role="tabpanel"
          aria-labelledby={`${tabGroupId}-tab-codes`}
          hidden={activeTab !== 'codes'}
        >
          {activeTab === 'codes' && (
            <TwoFactorBackupCodesPage
              codes={enabled && recoveryCodes.length > 0 ? recoveryCodes : undefined}
              onRegenerateCodes={enabled ? handleRegenerateCodes : undefined}
            />
          )}
        </div>

        {/* Active Sessions panel */}
        <div
          id={`${tabGroupId}-panel-sessions`}
          role="tabpanel"
          aria-labelledby={`${tabGroupId}-tab-sessions`}
          hidden={activeTab !== 'sessions'}
        >
          {activeTab === 'sessions' && (
            <SessionManagement
              sessions={sessions}
              onRevoke={handleRevoke}
              onRevokeAll={handleRevokeAll}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Public page component ──────────────────────────────────────── */

export const SecuritySettingsPage: React.FC = () => (
  <TwoFactorProvider>
    <SecuritySettingsInner />
  </TwoFactorProvider>
);
