# Role-Based Dashboard Variants (Investor, Issuer, Admin)

**Issue:** #636  
**Module:** `src/components/AppShell/RoleDashboard/`  
**Mountable inside:** `AppShell` (children portal)  
**Tests:** colocated `.test.tsx` + `.test.ts` (59 assertions), jest-axe suites per role and state

---

## Purpose

Three dashboard variants — **Investor**, **Issuer**, **Admin** — that share the same
`AppShell` chrome and the same 12-column responsive grid, but compose different
widget sets. The module is a self-contained design-system pattern:

| Role | Heading | Widget set (primary → secondary → tertiary) |
|---|---|---|
| `investor` | Investor dashboard | `portfolio-value` · `allocation-snapshot` · `performance-trend` |
| `issuer` | Issuer dashboard | `fundraising-progress` · `revenue-reports` · `upcoming-payouts` |
| `admin` | Oversight dashboard | `oversight-incidents` · `kyc-queue` · `network-health` |

It is presentational by design (no auth/role store exists in the app yet — see
[Contract](#contract)); wiring to a role provider or `/dashboard` route is a
follow-up for whoever lands the Role/auth feature.

---

## Quick Start

```tsx
import { RoleDashboard } from './AppShell/RoleDashboard';

<AppShell>
  <RoleDashboard role="investor" />
</AppShell>

// Live data + per-widget states:
<RoleDashboard
  role="issuer"
  widgetData={{ 'fundraising-progress': { kind: 'progress', label: 'Raised vs target', value: '$1.9M / $2.5M', progress: 76 } }}
  widgetStatus={{ 'revenue-reports': 'loading' }}
/>
```

---

## Contract

```tsx
interface RoleDashboardProps {
  role?: UserRole;                       // default 'investor'
  roles?: UserRole[];                    // multi-role whitelist (optional)
  widgetStatus?: Partial<Record<DashboardWidgetId, DashboardWidgetStatus>>;
  widgetData?: Partial<Record<DashboardWidgetId, DashboardWidgetContent>>;
  storage?: DashboardHintStorage;        // onboarding persistence (default localStorage)
  dismissOnboarding?: boolean;
}
```

### Authorization boundary

- `role` must be `'investor' | 'issuer' | 'admin'` — anything else renders the
  **"Dashboard unavailable"** `role="alert"` panel and **never** another role's widgets.
- `roles` is a whitelist for multi-role users:
  - a requested `role` **not in the whitelist is downgraded** to the first whitelisted role,
  - a whitelist of ≥ 2 roles renders a native radio **"Dashboard role"** switcher,
  - role selection is component-local; onboarding dismissal is the only persisted state.

### Widget state machine

Every widget renders through one shared shell (`WidgetCard`):

```
loading ──> error     (role="alert" surface)
         ──> empty    ("Nothing here yet" + optional emptyMessage)
         ──> ready    (DashboardWidgetContent body)
```

`DashboardWidgetContent` is the closed ready-state vocabulary:
`metrics` (value + delta + inline-SVG sparkline), `rows` (toned label/value rows), and
`progress` (accessible `<div role="progressbar">`).

---

## Layout — Shared 12-Column Grid

```
desktop (≥ 768px):    primary = span 7 | secondary = span 3 | tertiary = span 2
mobile  (< 768px):    all widgets single-column stack
```

Grid gap uses `--spacing-xl`; each widget is a `.rd-widget` glass card with
`--glass-bg` / `--glass-border` / `--glass-blur`.

---

## Accessibility Notes (WCAG 2.1 AA)

- Single `<h1>` per dashboard; widget titles are `<h2>`s (heading order 1 → 2).
- Loading surfaces: `aria-busy="true"` + `role="status"` labels.
- Error surfaces: `role="alert"`.
- Progress bar: native `<div role="progressbar">` with `aria-valuemin/now/max`.
- Sparklines: `role="img"` + descriptive `aria-label` (numeric values remain in text).
- Onboarding hint: top-level `<aside>` landmark (never nested in another landmark).
- Multi-role switcher: native radio group `role="radiogroup"` labelled "Dashboard role".
- Skeleton animation disabled under `prefers-reduced-motion`.
- All interactive controls expose `:focus-visible` outlines.
- Tested with `jest-axe` per role (investor / issuer / admin) + loading/error states — **all pass**.

---

## Edge Cases Covered

| Scenario | Behaviour |
|---|---|
| `role` unrecognised | "Dashboard unavailable" alert; no widget set rendered |
| `role` outside whitelist | Downgraded to first whitelisted role |
| 3× role whitelist with switcher | Radio group switches heading + widgets atomically |
| Per-widget `loading` / `error` / `empty` | Respective surfaces via shared `WidgetCard` |
| Widget with no `emptyMessage` | Falls back to "No data available yet." |
| Corrupt / unavailable localStorage | Hint storage returns `null` → hint shows; never throws |
| Non-finite / out-of-range progress | Clamped to 0..100 |
| Unknown content kind | Renders nothing (closed vocabulary default) |

---

## Design Tokens Used

All tokens from `src/index.css` `:root` without modification:

```
--glass-bg / --glass-border / --glass-blur / --glass-bg-accent
--text-main / --text-muted / --text-accent
--primary / --primary-hover / --success / --error
--spacing-* / --radius-* / --font-size-*
```

Tones: `positive → --success`, `negative → --error`, `neutral → --text-muted`.

---

## Files

```
src/components/AppShell/RoleDashboard/
├── RoleDashboard.tsx            # orchestrator (grid, switcher, boundary, onboarding)
├── RoleDashboard.css
├── WidgetCard.tsx               # shared shell: header + loading/error/empty/ready
├── WidgetCard.css
├── DashboardWidgetContent.tsx   # ready-state bodies (metrics/rows/progress)
├── DashboardWidgetContent.css
├── widgets.ts                   # ROLE_CONFIGS + DEFAULT_WIDGET_CONTENT registry
├── onboardingHints.ts           # per-role dismissal persistence (injectable)
├── roleDashboard.types.ts       # contract types + isUserRole guard
└── index.ts                     # public barrel
```

Coverage: all six source files registered in `vite.config.ts` (95% per-file
thresholds) — currently **100%** statements/branches/functions/lines.