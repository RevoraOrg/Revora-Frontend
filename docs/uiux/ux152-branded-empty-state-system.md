# UX152: Branded Reusable Empty-State System

## Scope

All major investor views in the Revora Frontend that previously used generic text-only empty states or ad-hoc empty/error state styling.

## Problem Statement

The application had inconsistent empty states across views:

| View | Previous Treatment |
|---|---|
| Distribution Dashboard | Inline error state with lucide icon |
| Payout Schedule | No dedicated view |
| Ledger | No dedicated view |
| Audit Trail | Plain text "No recent activity." |
| Notifications | Plain text "No notifications" |
| Revenue Reports | No dedicated view |

There was no single reusable component, no branded illustrations, and no consistent design-token usage.

---

## Solution

A single [`EmptyState`](src/components/designSystem/EmptyState.tsx) component that accepts:

| Prop | Type | Required | Description |
|---|---|---|---|
| `variant` | `EmptyStateVariant` | ✅ | Selects the branded SVG illustration |
| `severity` | `'default' \| 'error'` | ❌ | Default: `'default'`. Use `'error'` for error states. |
| `title` | `string` | ✅ | Heading text |
| `description` | `string` | ✅ | Supporting body copy |
| `primaryAction` | `EmptyStateAction` | ✅ | Primary CTA button/link |
| `secondaryAction` | `EmptyStateAction` | ❌ | Optional secondary CTA |
| `size` | `number` | ❌ | SVG size in px (default: `96`) |
| `className` | `string` | ❌ | Additional CSS class on root |
| `context` | `ReactNode` | ❌ | Optional context (e.g. echoed search query) |

### `EmptyStateAction` shape

```ts
type EmptyStateAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  ariaLabel?: string;
};
```

When `href` is provided, the action renders as an `<a>` link; otherwise it renders as a `<button>`.

---

## Illustration Variants

Six branded SVG illustrations, all decorative (`aria-hidden="true"`):

| Variant | Glyph | Use Case |
|---|---|---|
| `distribution-dashboard` | Bar chart + trend line | Distribution Dashboard, Discovery empty/filtered |
| `payout-schedule` | Calendar + check/X | Payout Schedule |
| `ledger` | Open book with lines | Ledger |
| `audit-trail` | Magnifying glass + trail dots | Audit Trail, Activity Feed |
| `notifications` | Bell + notification dot | Notifications panel |
| `revenue-reports` | Document + mini chart + `$` | Revenue Reports |

### SVG Color Strategy

- **Strokes**: Use `currentColor` or CSS custom properties (`var(--primary)`, `var(--error)`) so icons inherit parent text colour.
- **Fills**: Use CSS custom properties with alpha channels for subtlety on both light and dark backgrounds.
- **Error severity**: When `severity="error"`, the outer badge stroke, icon well stroke, and accent ring all switch to `var(--error)`.

### SVG Sizing

- Default: `96px` (matches existing `SuccessFailureIllustration` default).
- Configurable via the `size` prop.
- ViewBox is always `0 0 96 96` — the SVG scales cleanly at any size.

---

## Design Tokens Consumed

| Token | Purpose |
|---|---|
| `--ds-state-gap` | Vertical gap between illustration, text, and actions |
| `--ds-state-pad-y` | Top/bottom padding inside the state container |
| `--ds-state-pad-x` | Side padding inside the state container |
| `--ds-state-max-w` | Max-width of the body text column |
| `--ds-state-icon-size` | Diameter of the circular icon well |
| `--text-main` | Title colour |
| `--text-muted` | Body copy colour |
| `--text-accent` | Context/query highlight colour |
| `--primary` | Primary CTA background, illustration accent |
| `--primary-hover` | Primary CTA hover state |
| `--error` | Error severity title, CTA, and illustration accent |
| `--glass-bg` | Container background |
| `--glass-border` | Container border |
| `--glass-blur` | Container backdrop-filter |
| `--shadow-xl` | Container box-shadow |
| `--radius-2xl` | Container border-radius |

---

## Accessibility (WCAG 2.1 AA)

| Feature | Implementation |
|---|---|
| **Decorative illustrations** | `aria-hidden="true"`, `role="presentation"` |
| **Status announcement** | `role="status"`, `aria-live="polite"` on root |
| **Heading association** | `aria-labelledby` points to the `<h2>` id |
| **Keyboard focus** | All actions are `<button>` or `<a>` with visible `:focus-visible` rings |
| **Contrast** | Body copy uses `--text-muted` which passes ≥4.5:1 on dark backgrounds |
| **RTL** | Uses logical properties where possible; `dir` inherited from parent |
| **Copy expansion** | Text containers use `overflow-wrap: break-word` and flexible widths |

---

## Responsive Behaviour

| Viewport | Layout |
|---|---|
| 320 px | Full-width card; body text wraps within `--ds-state-max-w`; actions stack vertically |
| 375–480 px | Same single-column; padding `--ds-state-pad-x` clips safely |
| 768 px+ | Card is centred with max-width; actions may sit side-by-side |

---

## Usage Examples

### Basic empty state

```tsx
import { EmptyState } from './components/designSystem/EmptyState';

<EmptyState
  variant="notifications"
  title="No notifications"
  description="You're all caught up! New notifications will appear here when there's activity."
  primaryAction={{
    label: 'Back to Dashboard',
    href: '/',
  }}
/>
```

### Error state

```tsx
<EmptyState
  variant="distribution-dashboard"
  severity="error"
  title="Couldn't load offerings"
  description="Your portfolio and account are unaffected. Please try again."
  primaryAction={{
    label: 'Try again',
    onClick: handleRetry,
    ariaLabel: 'Retry loading offerings',
  }}
  context={
    retryCount > 0 ? (
      <span>Retried {retryCount} {retryCount === 1 ? 'time' : 'times'} — still having trouble?</span>
    ) : undefined
  }
/>
```

### Filtered state with context

```tsx
<EmptyState
  variant="distribution-dashboard"
  title="No offerings match your search"
  description={`We couldn't find any offerings matching your search.`}
  primaryAction={{
    label: 'Clear filters',
    onClick: handleClearFilters,
    ariaLabel: 'Clear all search filters and show all offerings',
  }}
  context={
    <span aria-label={`Search term: ${query}`}>
      Searched for &ldquo;{query}&rdquo;
    </span>
  }
/>
```

---

## Integration Map

| View | Component | Variant | Severity |
|---|---|---|---|
| Distribution Dashboard | [`InvestorDiscovery`](src/components/InvestorDiscovery.tsx) | `distribution-dashboard` | `default` / `error` |
| Payout Schedule | [`PayoutSchedule`](src/pages/PayoutSchedule.tsx) | `payout-schedule` | `default` |
| Ledger | [`Ledger`](src/pages/Ledger.tsx) | `ledger` | `default` |
| Audit Trail | [`AuditTrail`](src/pages/AuditTrail.tsx) + [`ActivityFeed`](src/components/ActivityFeed.tsx) | `audit-trail` | `default` |
| Notifications | [`NotificationPanel`](src/components/Notifications/NotificationPanel.tsx) | `notifications` | `default` |
| Revenue Reports | [`RevenueReports`](src/pages/RevenueReports.tsx) | `revenue-reports` | `default` |

---

## CSS Classes Reference

| Class | Applied to | Purpose |
|---|---|---|
| `.empty-state-container` | Root `<div>` | Centred column flex layout, glass-card styling |
| `.empty-state-container--error` | Root `<div>` (error only) | Red border and title colour |
| `.empty-state-icon-wrap` | Icon container | Circular container, matches `--ds-state-icon-size` |
| `.empty-state-content` | Text wrapper | Column flex, max-width capped |
| `.empty-state-title` | `<h2>` | 20px / semi-bold |
| `.empty-state-body` | `<p>` | 14px, muted |
| `.empty-state-context` | Context `<div>` | Accent colour for echoed queries |
| `.empty-state-actions` | Actions wrapper | Flex column (mobile) / row (≥480px) |
| `.empty-state-action` | `<button>` / `<a>` | Shared sizing, focus-visible ring |

---

## Testing

- [`EmptyState.test.tsx`](src/components/designSystem/EmptyState.test.tsx) — 15 tests covering all variants, severity, actions, links, context, ARIA, and decorative SVG.
- [`InvestorDiscovery.test.tsx`](src/components/InvestorDiscovery.test.tsx) — Updated to test the new `EmptyState` integration across filtered-empty, truly-empty, error, and loaded states.

Run tests:

```bash
npm test
```

---

## Before / After

### Before (generic text-only)

```tsx
{notifications.length === 0 && (
  <li className="p-4 text-center text-gray-500">No notifications</li>
)}
```

### After (branded EmptyState)

```tsx
<EmptyState
  variant="notifications"
  title="No notifications"
  description="You're all caught up! New notifications will appear here when there's activity."
  primaryAction={{ label: 'Back to Dashboard', href: '/' }}
  size={64}
/>
```

---

## Security Notes

- No user-supplied HTML is rendered. All text content is passed as React props (auto-escaped).
- SVG illustrations are purely decorative and contain no external resources or scripts.
- No backend changes; purely frontend UI state.
