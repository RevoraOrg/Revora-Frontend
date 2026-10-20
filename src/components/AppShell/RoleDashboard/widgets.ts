// src/components/AppShell/RoleDashboard/widgets.ts
//
// Recommended widget composition for the three role-based dashboard variants.
//
// Compose this registry with <RoleDashboard> to render the same AppShell and
// 12-column grid with different widget sets per role:
//
//   Investor – portfolio widget set
//     portfolio-value      (primary)   Portfolio value + delta
//     allocation-snapshot  (secondary) Top allocations
//     performance-trend    (tertiary)  Performance trend
//
//   Issuer – fundraising widget set
//     fundraising-progress (primary)   Raised vs target progress bar
//     revenue-reports      (secondary) Latest revenue report statuses
//     upcoming-payouts     (tertiary)  Next scheduled payouts
//
//   Admin – oversight widget set
//     oversight-incidents  (primary)   Active incidents by severity
//     kyc-queue            (secondary) KYC queue health
//     network-health       (tertiary)  Network/chain status
//
// `status: 'ready'` defaults render sample content so composition/design can be
// reviewed without wiring; supply `widgetStatus`/`widgetData` props to drive
// real loading/error/empty states and live data.

import type {
  DashboardWidget,
  DashboardWidgetContent,
  DashboardWidgetId,
  RoleDashboardConfig,
  UserRole,
} from './roleDashboard.types';

export const INVESTOR_WIDGETS: DashboardWidget[] = [
  {
    id: 'portfolio-value',
    title: 'Portfolio value',
    slot: 'primary',
    status: 'ready',
    emptyMessage: 'No portfolio activity yet.',
  },
  {
    id: 'allocation-snapshot',
    title: 'Allocation snapshot',
    slot: 'secondary',
    status: 'ready',
    emptyMessage: 'No allocations yet.',
  },
  {
    id: 'performance-trend',
    title: 'Performance trend',
    slot: 'tertiary',
    status: 'ready',
    emptyMessage: 'No performance data available yet.',
  },
];

export const ISSUER_WIDGETS: DashboardWidget[] = [
  {
    id: 'fundraising-progress',
    title: 'Fundraising progress',
    slot: 'primary',
    status: 'ready',
    emptyMessage: 'No fundraising round started yet.',
  },
  {
    id: 'revenue-reports',
    title: 'Revenue reports',
    slot: 'secondary',
    status: 'ready',
    emptyMessage: 'No revenue reports submitted yet.',
  },
  {
    id: 'upcoming-payouts',
    title: 'Upcoming payouts',
    slot: 'tertiary',
    status: 'ready',
    emptyMessage: 'No payouts scheduled.',
  },
];

export const ADMIN_WIDGETS: DashboardWidget[] = [
  {
    id: 'oversight-incidents',
    title: 'Oversight incidents',
    slot: 'primary',
    status: 'ready',
    emptyMessage: 'No active incidents. Nice work.',
  },
  {
    id: 'kyc-queue',
    title: 'KYC queue',
    slot: 'secondary',
    status: 'ready',
    emptyMessage: 'No pending KYC reviews.',
  },
  {
    id: 'network-health',
    title: 'Network health',
    slot: 'tertiary',
    status: 'ready',
    emptyMessage: 'No network status available.',
  },
];

/**
 * Full recommended composition per role. `getRoleDashboardConfig` assumes the
 * caller has already validated the role with `isUserRole` (see RoleDashboard).
 */
export const ROLE_CONFIGS: Record<UserRole, RoleDashboardConfig> = {
  investor: {
    role: 'investor',
    heading: 'Investor dashboard',
    description:
      'A snapshot of your portfolio, allocations, and performance—updated as the market moves.',
    summary: 'Portfolio',
    onboarding: {
      title: 'Welcome to your investor dashboard',
      body: 'Portfolio value is your baseline. Watch Allocation snapshot for diversification and Performance trend for momentum over time.',
    },
    widgets: INVESTOR_WIDGETS,
  },
  issuer: {
    role: 'issuer',
    heading: 'Issuer dashboard',
    description:
      'Fundraising health and reporting obligations in one view, so you never miss a deadline.',
    summary: 'Fundraising',
    onboarding: {
      title: 'Welcome to your issuer dashboard',
      body: 'Fundraising progress shows how close you are to target. Keep Revenue reports current and watch Upcoming payouts for cash-flow timing.',
    },
    widgets: ISSUER_WIDGETS,
  },
  admin: {
    role: 'admin',
    heading: 'Oversight dashboard',
    description:
      'Platform-wide oversight: incidents, compliance queues, and network health at a glance.',
    summary: 'Oversight',
    onboarding: {
      title: 'Welcome to your oversight dashboard',
      body: 'Resolve Oversight incidents first, then clear the KYC queue and confirm Network health before shipping major changes.',
    },
    widgets: ADMIN_WIDGETS,
  },
};

export function getRoleDashboardConfig(role: UserRole): RoleDashboardConfig {
  return ROLE_CONFIGS[role];
}

/**
 * Sample ready-state content (design defaults). Kept in the registry so the
 * widget ID → body mapping is explicit and documented; page-level callers can
 * inject their own live data via RoleDashboard `widgetData`.
 */
export const DEFAULT_WIDGET_CONTENT: Record<
  DashboardWidgetId,
  DashboardWidgetContent
> = {
  'portfolio-value': {
    kind: 'metrics',
    metrics: [
      {
        label: 'Total value',
        value: '$84,320',
        delta: 12.4,
        tone: 'positive',
        sparkline: [20, 26, 22, 28, 24, 30, 34],
      },
    ],
  },
  'allocation-snapshot': {
    kind: 'rows',
    rows: [
      { label: 'Equity', value: '46%', tone: 'positive' },
      { label: 'Fixed income', value: '31%' },
      { label: 'Cash & equivalents', value: '23%' },
    ],
  },
  'performance-trend': {
    kind: 'metrics',
    metrics: [
      { label: '30-day return', value: '+4.2%', delta: 4.2, tone: 'positive' },
      { label: 'YTD return', value: '+18.9%', delta: 18.9, tone: 'positive' },
    ],
  },
  'fundraising-progress': {
    kind: 'progress',
    label: 'Raised vs target',
    value: '$1.2M / $2.5M',
    progress: 48,
    note: '12 active commitments',
  },
  'revenue-reports': {
    kind: 'rows',
    rows: [
      { label: 'June', value: 'Accepted', tone: 'positive' },
      { label: 'May', value: 'Accepted', tone: 'positive' },
      { label: 'April', value: 'Overdue', tone: 'negative' },
    ],
  },
  'upcoming-payouts': {
    kind: 'rows',
    rows: [
      { label: 'Investor pool', value: 'Sep 12' },
      { label: 'Fees', value: 'Sep 30' },
    ],
  },
  'oversight-incidents': {
    kind: 'rows',
    rows: [
      { label: 'Critical', value: '1', tone: 'negative' },
      { label: 'High', value: '2', tone: 'negative' },
      { label: 'Medium', value: '4' },
      { label: 'Low', value: '7' },
    ],
  },
  'kyc-queue': {
    kind: 'metrics',
    metrics: [
      { label: 'Pending reviews', value: '23' },
      { label: 'SLA breaches', value: '0', tone: 'negative' },
    ],
  },
  'network-health': {
    kind: 'rows',
    rows: [
      { label: 'Ethereum', value: 'Operational', tone: 'positive' },
      { label: 'Polygon', value: 'Degraded', tone: 'negative' },
      { label: 'Base', value: 'Operational', tone: 'positive' },
    ],
  },
};

/** Ordered widget IDs for each role — used to keep composition stable. */
export const ROLE_WIDGET_IDS: Record<UserRole, DashboardWidgetId[]> = {
  investor: ['portfolio-value', 'allocation-snapshot', 'performance-trend'],
  issuer: ['fundraising-progress', 'revenue-reports', 'upcoming-payouts'],
  admin: ['oversight-incidents', 'kyc-queue', 'network-health'],
};

/** Title lookup for a widget ID (used by error/empty fallbacks). */
export function widgetTitle(id: DashboardWidgetId): string {
  return ROLE_CONFIGS.investor.widgets
    .concat(ROLE_CONFIGS.issuer.widgets, ROLE_CONFIGS.admin.widgets)
    .find((w) => w.id === id)?.title ?? '';
}