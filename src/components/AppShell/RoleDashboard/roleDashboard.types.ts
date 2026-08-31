// src/components/AppShell/RoleDashboard/roleDashboard.types.ts
//
// Role-based dashboard variants — shared contract.
//
// Three dashboard variants (Investor / Issuer / Admin) share the same AppShell
// and the same 12-column responsive grid, but compose different widget sets.
// This file defines the contract those variants are built on:
//
//   - UserRole                  – the three platform roles
//   - DASHBOARD_ROLES           – canonical role list (single source of truth)
//   - isUserRole()              – runtime guard used for authorization boundary
//   - DashboardSlot             – grid placement (primary / secondary / tertiary)
//   - DashboardWidgetStatus     – the shared widget state machine
//                                (loading → error | empty | ready)
//   - DashboardWidget           – one cell in the dashboard grid
//   - DashboardWidgetContent    – the ready-state body payloads
//   - RoleDashboardConfig       – full per-role composition
//
// Design system notes (WCAG 2.1 AA):
//   - Widget titles render as <h2> under the single <h1> dashboard heading.
//   - Loading surfaces expose aria-busy; error surfaces use role="alert".
//   - Interactive widgets are keyboard operable and focus-visible styled.

export type UserRole = 'investor' | 'issuer' | 'admin';

/** Canonical role list — single source of truth for role enumeration. */
export const DASHBOARD_ROLES: readonly UserRole[] = [
  'investor',
  'issuer',
  'admin',
];

/** Runtime guard: only the three known roles are ever rendered as dashboards. */
export function isUserRole(value: unknown): value is UserRole {
  return value === 'investor' || value === 'issuer' || value === 'admin';
}

export type DashboardSlot = 'primary' | 'secondary' | 'tertiary';

/**
 * Shared widget state machine. Every dashboard widget renders through this
 * contract so header/loading/empty/error chrome stays consistent across roles.
 */
export type DashboardWidgetStatus = 'loading' | 'error' | 'empty' | 'ready';

/** Every widget the three variants can compose. */
export type DashboardWidgetId =
  | 'portfolio-value'
  | 'allocation-snapshot'
  | 'performance-trend'
  | 'fundraising-progress'
  | 'revenue-reports'
  | 'upcoming-payouts'
  | 'oversight-incidents'
  | 'kyc-queue'
  | 'network-health';

/** A single prominent number with optional % delta and sparkline. */
export interface DashboardMetric {
  label: string;
  value: string;
  /** Percent change vs prior period. Positive/negative tinted via `tone`. */
  delta?: number;
  tone?: 'neutral' | 'positive' | 'negative';
  /** Sparkline values (last → first is drawn left → right). */
  sparkline?: number[];
}

/** Tone used by row-style widgets. */
export type DashboardRowTone = 'neutral' | 'positive' | 'negative';

/**
 * Ready-state bodies a widget can render. Keeping the body vocabulary small
 * (metrics / rows / progress) makes the widget ID → content mapping closed and
 * easy to audit, while giving each role distinct composition.
 */
export type DashboardWidgetContent =
  | {
    kind: 'metrics';
    metrics: DashboardMetric[];
  }
  | {
    kind: 'rows';
    rows: Array<{
      label: string;
      value: string;
      tone?: DashboardRowTone;
    }>;
  }
  | {
    kind: 'progress';
    label: string;
    value: string;
    /** 0..100 */
    progress: number;
    note?: string;
  };

/** One cell in the dashboard grid. */
export interface DashboardWidget {
  id: DashboardWidgetId;
  title: string;
  slot: DashboardSlot;
  /** Default status; callers may override per-widget at render time. */
  status: DashboardWidgetStatus;
  /** Shown when `status === 'empty'`. */
  emptyMessage?: string;
}

/** Per-role first-run onboarding hint (dismissible, persisted per role). */
export interface RoleOnboarding {
  title: string;
  body: string;
}

/** The full layout + composition for one role. */
export interface RoleDashboardConfig {
  role: UserRole;
  /** <h1> text (single heading per dashboard). */
  heading: string;
  description: string;
  /** Short eyebrow shown above the heading. */
  summary: string;
  onboarding: RoleOnboarding;
  widgets: DashboardWidget[];
}

/** Shared grid: 12 columns, widgets span by slot. */
export const GRID_COLUMNS = 12;

/** Slot → column span on the shared grid (mobile reflows to 12). */
export const SLOT_SPAN: Record<DashboardSlot, number> = {
  primary: 7,
  secondary: 3,
  tertiary: 2,
};

export const WIDGET_SLOTS = Object.keys(SLOT_SPAN) as DashboardSlot[];