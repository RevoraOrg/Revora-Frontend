// src/components/AppShell/RoleDashboard/RoleDashboard.tsx
//
// RoleDashboard — shared AppShell content for the three role-based dashboard
// variants (Investor / Issuer / Admin).
//
// One AppShell, one 12-column responsive grid, three widget sets:
//
//   <AppShell>
//     <RoleDashboard role="investor" />
//   </AppShell>
//
// Contract:
//   - `role`: the active role (defaults to 'investor').
//   - `roles`: optional whitelist for multi-role users. When provided, exactly
//     the whitelisted roles can ever be rendered: a requested `role` that is
//     not in the whitelist is downgraded to the first whitelisted role, and an
//     unrecognised role renders the "Dashboard unavailable" boundary — never
//     another role's widgets.
//   - `widgetStatus` / `widgetData`: per-widget status/data overrides that
//     drive the shared loading / error / empty / ready contract and live data.
//   - `storage` / `dismissOnboarding`: injectable persistence for the per-role
//     first-run onboarding hint (defaults to localStorage).
//
// Accessibility (WCAG 2.1 AA):
//   - Single <h1> per dashboard; widget titles are <h2> wired via
//     aria-labelledby; the grid is an aria-label region.
//   - Multi-role users get a native radio group labelled "Dashboard role".
//   - The onboarding hint is a labelled <aside> with a clear dismiss action;
//     loading surfaces expose aria-busy and error surfaces use role="alert".

import React, { useEffect, useMemo, useState } from 'react';
import './RoleDashboard.css';
import {
  isUserRole,
  type DashboardWidget,
  type DashboardWidgetContent,
  type DashboardWidgetId,
  type UserRole,
} from './roleDashboard.types';
import {
  DEFAULT_WIDGET_CONTENT,
  getRoleDashboardConfig,
} from './widgets';
import { WidgetCard } from './WidgetCard';
import { DashboardWidgetContent as WidgetBody } from './DashboardWidgetContent';
import {
  DEFAULT_HINT_STORAGE,
  useOnboardingHint,
  type DashboardHintStorage,
} from './onboardingHints';

const ROLE_LABELS: Record<UserRole, string> = {
  investor: 'Investor',
  issuer: 'Issuer',
  admin: 'Admin',
};

export interface RoleDashboardProps {
  role?: UserRole;
  /** Optional whitelist for multi-role users (see contract above). */
  roles?: UserRole[];
  widgetStatus?: Partial<Record<DashboardWidgetId, DashboardWidget['status']>>;
  widgetData?: Partial<Record<DashboardWidgetId, DashboardWidgetContent>>;
  storage?: DashboardHintStorage;
  dismissOnboarding?: boolean;
}

/**
 * Resolve the effective role from the request + whitelist.
 * Returns null when no dashboard may be rendered.
 */
export function resolveActiveRole(
  role: UserRole | undefined,
  roles: UserRole[] | undefined
): UserRole | null {
  const requested = role !== undefined && isUserRole(role) ? role : null;
  const whitelist = Array.isArray(roles) ? roles.filter(isUserRole) : [];
  const available = whitelist.length > 0 ? whitelist : requested ? [requested] : [];

  if (available.length === 0) return null;
  if (requested && available.includes(requested)) return requested;
  return available[0];
}

export const RoleDashboard: React.FC<RoleDashboardProps> = ({
  role = 'investor',
  roles,
  widgetStatus,
  widgetData,
  storage = DEFAULT_HINT_STORAGE,
  dismissOnboarding = false,
}) => {
  const activeRole = useMemo(
    () => resolveActiveRole(role, roles),
    [role, roles]
  );
  const whitelist = useMemo(
    () => (Array.isArray(roles) ? roles.filter(isUserRole) : []),
    [roles]
  );

  const [selected, setSelected] = useState<UserRole>('investor');
  useEffect(() => {
    if (activeRole) setSelected(activeRole);
  }, [activeRole]);

  const showSwitcher = whitelist.length > 1;

  if (!activeRole) {
    return (
      <section
        className="rd-unavailable"
        role="alert"
        aria-label="Dashboard unavailable"
      >
        <h1 className="rd-unavailable__title">Dashboard unavailable</h1>
        <p className="rd-unavailable__body">
          Your session does not include a recognised role. Please contact
          support if you believe this is an error.
        </p>
      </section>
    );
  }

  const config = getRoleDashboardConfig(selected);
  const hint = useOnboardingHint(selected, storage, dismissOnboarding);

  const statusFor = (widget: DashboardWidget): DashboardWidget['status'] =>
    widgetStatus?.[widget.id] ?? widget.status;

  const contentFor = (id: DashboardWidgetId): DashboardWidgetContent =>
    widgetData?.[id] ?? DEFAULT_WIDGET_CONTENT[id];

  return (
    <section className="role-dashboard" data-role={selected}>
      <header className="rd-head">
        <p className="rd-head__summary">{config.summary}</p>
        <h1 className="rd-head__title">
          {config.heading}
        </h1>
        <p className="rd-head__desc">{config.description}</p>
      </header>

      {hint.show && (
        <aside className="rd-onboarding" aria-label="Getting started">
          <p className="rd-onboarding__title">{config.onboarding.title}</p>
          <p className="rd-onboarding__body">{config.onboarding.body}</p>
          <button
            type="button"
            className="rd-onboarding__dismiss"
            aria-label={`Dismiss ${ROLE_LABELS[selected]} onboarding hint`}
            onClick={hint.dismiss}
          >
            Dismiss
          </button>
        </aside>
      )}

      {showSwitcher && (
        <div className="rd-switcher" role="radiogroup" aria-label="Dashboard role">
          {whitelist.map((roleOption) => (
            <label key={roleOption} className="rd-switcher__option">
              <input
                type="radio"
                name="dashboard-role"
                value={roleOption}
                checked={selected === roleOption}
                onChange={() => setSelected(roleOption)}
              />
              <span>{ROLE_LABELS[roleOption]}</span>
            </label>
          ))}
        </div>
      )}

      <div
        className="rd-grid"
        data-testid="role-dashboard-grid"
        aria-label={`${ROLE_LABELS[selected]} dashboard grid`}
      >
        {config.widgets.map((widget) => (
          <WidgetCard
            key={widget.id}
            id={widget.id}
            title={widget.title}
            slot={widget.slot}
            status={statusFor(widget)}
            emptyMessage={widget.emptyMessage}
          >
            <WidgetBody content={contentFor(widget.id)} />
          </WidgetCard>
        ))}
      </div>
    </section>
  );
};

export default RoleDashboard;