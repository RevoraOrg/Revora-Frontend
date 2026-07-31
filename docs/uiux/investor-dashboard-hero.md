# Investor Dashboard Hero

**Route:** `/investor/portfolio` (Investor Portfolio Summary)  
**Component:** `src/components/DashboardHero.tsx`  
**Page:** `src/pages/InvestorPortfolioSummary.tsx`  
**Tests:** `src/components/DashboardHero.test.tsx`, `src/pages/InvestorPortfolioSummary.test.tsx`

---

## Purpose

The investor hero is the first thing an investor sees when they land on their portfolio summary. It answers four questions at a glance:

1. **What is my portfolio worth?** — Total Value (with trend)
2. **What have I actually made?** — Realized Gains
3. **When is money coming?** — Upcoming Payouts
4. **What needs my attention?** — Pending Actions

…and always offers a path forward: the **Explore Offerings** primary CTA plus the **Account Settings** secondary link.

---

## Component Anatomy

```
┌────────────────────────────────────────────────────────────────────┐
│  <section aria-labelledby="hero-heading">                          │
│                                                                    │
│  Header row (flex-col on mobile, row on md+)                       │
│  ┌──────────────────────────────┐  ┌───────────────────────────┐   │
│  │ h1  Portfolio Overview       │  │ [Explore Offerings]  ▸    │   │
│  │ p   Track your returns…      │  │ Account Settings          │   │
│  │     ▁▂▂▃▅▆  sparkline (svg) │  └───────────────────────────┘   │
│  └──────────────────────────────┘                                  │
│                                                                    │
│  KPI grid (1 → 2 → 4 columns)                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Total    │ │ Realized │ │ Upcoming │ │ Pending  │             │
│  │ Value    │ │ Gains    │ │ Payouts  │ │ Actions  │             │
│  │ $103,000 │ │  $3,000  │ │    3     │ │    1     │             │
│  │ ▲ 3.0%   │ │          │ │ Calendar │ │ Review   │             │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
└────────────────────────────────────────────────────────────────────┘
```

Each KPI tile is a `glass-card` containing:

- **Icon** (decorative, `aria-hidden`) + uppercase **label**
- **Value** (currency or number), with a descriptive `aria-label`
- Optional **trend** (▲/▼ + `%`) or **action link** (`View calendar`, `Review now`)

---

## Component API

```tsx
interface KPIData {
  value?: number | null;
  label: string;
  status: 'loading' | 'error' | 'empty' | 'success';
  type: 'currency' | 'number' | 'date';
  trend?: number;          // percentage change vs prior period
  actionText?: string;     // e.g. "View calendar"
  actionLink?: string;     // e.g. "/investor/calendar"
  emptyText?: string;      // contextual empty message, e.g. "No payouts scheduled"
  onRetry?: () => void;    // per-tile retry handler
}

interface DashboardHeroProps {
  totalValue: KPIData;
  realizedGains: KPIData;
  upcomingPayouts: KPIData;
  pendingActions: KPIData;
  sparklineData?: number[];
  isNewInvestor?: boolean;
  onRetry?: () => void;    // hero-level retry (used when a tile has no own handler)
}
```

---

## Layout — Desktop vs Mobile

### Desktop (≥ 1024px)

| Zone | Behaviour |
|---|---|
| Hero title | `h1` (text-3xl/4xl) + supporting copy, left-aligned |
| Sparkline | Fixed `w-40` (160px) inline next to the title |
| CTA area | Right-aligned row: primary button + secondary text link |
| KPI row | 4-column grid `lg:grid-cols-4`, `gap-6` |

### Mobile (< 640px)

| Zone | Behaviour |
|---|---|
| Header | Stacked (`flex-col`) — title → sparkline → CTAs |
| Sparkline | Full-width (`w-full`), `preserveAspectRatio="none"` scales horizontally |
| CTA | Remains prominent: primary button full-width of its flex item, stacked above the secondary link |
| KPI row | Single column `grid-cols-1` (2 columns on `sm`) |

Breakpoints reuse the Tailwind default scale already used across the app
(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, `flex-col md:flex-row`).

---

## KPI Tile Variants

| Status | Rendering | ARIA |
|---|---|---|
| **Normal** (`success`) | Value + optional trend / action link | Value wrapped in an `aria-label` describing label + value |
| **Empty** (`empty` or `value == null`) | Dash icon (`Minus`) + contextual `emptyText` | `role="status"` + `aria-label="{label}: {emptyText}"` |
| **Error** (`error`) | Red-tinted card, `AlertTriangle` icon, friendly message, optional **Try again** button | `role="status"` + `aria-label="{label} failed to load"` |
| **Loading** (`loading`) | Animated skeleton (`animate-pulse`) | `role="status"` + `aria-busy="true"` + `aria-label="{label} loading"` |

### Empty states

| Tile | Message |
|---|---|
| Total Value | "No investments yet" |
| Realized Gains | "No investments yet" |
| Upcoming Payouts | "No payouts scheduled" |
| Pending Actions | "No pending actions" |

When `emptyText` is omitted the tile falls back to the generic "No data yet".
Empty text uses `text-slate-400` (~6.96:1 on the glass surface) to stay WCAG AA.

### Error states

Error tiles show a friendly, non-technical message — "Couldn't load this data." —
with an icon and an optional **Try again** button. The retry button is wired by
the caller:

- `KPIData.onRetry` (per-tile) wins over the hero-level `onRetry`
- When neither is provided the tile renders the message without a button
- The button carries an explicit `aria-label` (`Retry loading {label}`) and `focus-ring`

---

## Primary CTA

| Action | Type | Route | Style |
|---|---|---|---|
| **Explore Offerings** | Primary | `/investor/portal` | `btn btn-primary` |
| **Account Settings** | Secondary link | `/investor/settings` | `text-primary` link + `focus-ring` |

Both follow existing dashboard navigation conventions — no new navigation
concepts were introduced.

---

## Accessibility (WCAG 2.1 AA)

- **Landmark**: `<section aria-labelledby="hero-heading">` labelled by the `h1`.
- **Semantic headings**: single `h1` per page; widget cards below use `h2`.
- **Status announcements**: loading/empty/error tiles use `role="status"` so
  state changes are announced politely.
- **Keyboard navigation**: all interactive elements are native links/buttons;
  logical tab order (CTA row → tile action links → retry buttons).
- **Visible focus**: every interactive element carries `focus-ring`
  (2px `var(--primary)` outline + offset).
- **Accessible names**: sparkline is `role="img"` with a descriptive
  `aria-label` (e.g. "Portfolio performance sparkline trending up"); icons are
  `aria-hidden`; values/trends expose `aria-label`s.
- **Contrast** (on dark surface `#0f172a` / `#020617`):

| Element | Colours | Ratio |
|---|---|---|
| Primary CTA text | `#ffffff` on `--primary-btn-bg` `#2563eb` | **5.17:1** ✓ |
| Primary CTA hover | `#ffffff` on `#1d4ed8` | **6.70:1** ✓ |
| Secondary link | `--primary` `#3b82f6` on dark | **4.86:1** ✓ |
| Body / muted text | `--text-main` / `--text-muted` | **12:1+** ✓ |
| Empty state text | `text-slate-400` `#94a3b8` | **6.96:1** ✓ |
| Trend up / down | `#4ade80` / `#f87171` | **6.8:1+** ✓ |

- **Reduced motion**: `animate-pulse` / `animate-fade-in` pause under
  `prefers-reduced-motion` via the global stylesheet.

> **Primary button contrast fix.** The CTA previously used `--primary`
> (`#3b82f6`) as its background, which gives **3.68:1** with white text —
> below the 4.5:1 AA threshold. `--primary` was left unchanged for text links
> (where it passes at 4.86:1) and two new tokens were added for button fills:
> `--primary-btn-bg: #2563eb` and `--primary-btn-bg-hover: #1d4ed8`.
> `.btn-primary` now uses these, so every primary button in the app meets AA.

---

## Dark Mode

The app is dark-first (default `--bg-color: #020617`). The hero is verified
against the dark theme:

- KPI cards use `glass-card` surfaces + `text-main`/`text-muted` tokens.
- Sparkline uses `var(--success)` / `var(--error)` — both dark-safe.
- Empty/error tiles use translucent overlays that read correctly on dark glass.
- The `data-theme="dark"` render path is exercised in tests with `jest-axe`.

---

## Test Coverage

`DashboardHero.test.tsx` (29 tests) and `InvestorPortfolioSummary.test.tsx` (21 tests) cover:

- Existing investor (nominal) and **new investor** (no positions)
- **Negative returns** → red trend + down-trending sparkline label
- **Error state** → friendly message + retry wiring (hero + per-tile)
- **Empty state** → contextual messages per tile
- **Loading state** → `role="status"` + `aria-busy`
- **Dark mode** rendering
- **Responsive layout** classes (1→2→4 grid, mobile sparkline, stacked header)
- **Accessibility** — `jest-axe` on nominal, loading, error, empty, and dark-mode states

> Visual/snapshot tests are **not present** in this repo (no Storybook or
> Playwright configuration). Layout behaviour is asserted structurally via
> responsive class checks. Before/after rendering should be screenshotted
> manually at 360px, 768px, and 1280px viewports and attached to the PR.

---

## Design Tokens Used

All tokens come from `src/index.css` `:root`:

```
--glass-bg / .glass-card / --shadow-xl
--primary / --primary-hover
--primary-btn-bg / --primary-btn-bg-hover   (new, CTA AA contrast)
--success / --error / --text-accent
--text-main / --text-muted
btn-primary / btn-secondary / focus-ring / animate-fade-in / animate-pulse
--spacing-* / --radius-*
```

---

## Before / After

**Before:** the hero rendered generic "No data yet" empty tiles, hid the
sparkline entirely on mobile, offered no retry affordance on error, and the
primary CTA failed WCAG AA contrast (3.68:1).

**After:**

| Aspect | Before | After |
|---|---|---|
| Empty tiles | "No data yet" (generic) | Contextual: "No investments yet", "No payouts scheduled" |
| Error tiles | Static "Failed to load data" | Friendly message + optional "Try again" with accessible label |
| Loading tiles | Skeleton, no semantics | `role="status"` + `aria-busy="true"` + label |
| Sparkline | Hidden on mobile | Visible at all breakpoints, scales (full-width → 160px) |
| CTA contrast | 3.68:1 (fails AA) | 5.17:1 (passes AA) |
| a11y verification | — | `jest-axe` green on all states; dark-mode verified |
