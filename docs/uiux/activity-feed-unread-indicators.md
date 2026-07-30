# Activity Feed Unread Indicators & Mark-All-Read Affordance

Design for the unread indicator glyph on each activity item, a top-level "Mark all read" button, and an inline undo banner with a polite live-region announcement.

> Implementation: [`ActivityFeed`](../../src/components/ActivityFeed.tsx),
> [`ActivityItem`](../../src/components/ActivityItem.tsx),
> [`ActivityFeed.css`](../../src/components/ActivityFeed.css),
> [`ActivityItem.css`](../../src/components/ActivityItem.css).

## Why this affordance over a plain list

- **Scannability** — the unread dot offers an immediate visual cue for new content since the investor's last visit.
- **Batch efficiency** — "Mark all read" spares the user from manually clicking through many items.
- **Safety net** — the inline undo banner provides a short reversible window in case of accidental marking.
- **Consistency** — mirrors the notification bell's unread-count badge pattern already in the design system.

## Anatomy

```
┌─────────────────────────────────────────────────────────┐
│  Activity Feed                            Mark all read  │  ← Feed Header
│                           ◉ 5                            │     w/ unread badge
├─────────────────────────────────────────────────────────┤
│  All activities marked as read.        [ Undo ]  [ ✕ ]  │  ← Undo Banner
│                                                          │     (shown after mark-all)
├─────────────────────────────────────────────────────────┤
│  ● Payout Event 1                    Today, 2:30 PM     │  ← Unread Item
│    Description for payout event 1        [ Read ]        │     (blue dot + left border)
├─────────────────────────────────────────────────────────┤
│  ○ Payout Event 6                    Today, 2:00 PM     │  ← Read Item
│    Description for payout event 6                        │     (empty circle indicator)
└─────────────────────────────────────────────────────────┘
```

### Unread dot glyph
- **Position**: Leftmost column, 14px wide, centered vertically with the title.
- **Style**: 8px filled circle, `var(--primary)` blue background, soft `box-shadow` glow, subtle pulse animation (`2s ease-in-out`).
- **Read state**: Replaced by a 8px empty circle (`1.5px` border, `var(--text-muted)` at 40% opacity).
- **High contrast**: Solid `Highlight` background for the dot; `GrayText` border for the read indicator.

### Unread item background
- **Left border accent**: 3px solid `var(--primary)` on the left edge.
- **Background**: 4% blue tint (`rgba(59, 130, 246, 0.04)`), deepening to 7% on hover.

### Mark-all-read button
- **Placement**: Far right of the feed header, aligned with the title.
- **Label**: "Mark all read" with a `CheckCheck` (double-check) icon.
- **Visibility**: Only rendered when `hasUnread` is `true`.
- **Hover**: Blue-tinted background and border-highlight.
- **Pressing**: Triggers the undo banner and marks every visible and non-visible activity as read.

### Undo banner
- **Placement**: Immediately below the feed header, above the activity list.
- **Message**: "All activities marked as read."
- **CTAs**: "Undo" (primary) and dismiss "✕" (secondary).
- **Auto-dismiss**: 10 seconds; cleared on undo, dismiss, or any individual mark-read action.
- **Animation**: `slideDown` — fades in with a downward translation (300ms `ease-out`).
- **Reduced motion**: Animation disabled when `prefers-reduced-motion: reduce` is active.

## Per-item hover mark-read control

Each unread item exposes a **"Read"** button on hover / focus-within:

- **Trigger**: `.activity-item:hover .mark-read-btn`, `.activity-item:focus-within .mark-read-btn`
- **Fallback**: On touch devices (`@media (hover: none)`), the button is always visible.
- **Label**: `Mark "<title>" as read` (dynamic `aria-label`).
- **Icon**: `CheckCheck` (12px) + "Read" label.

## Unread count badge

A pill-shaped badge next to the "Activity Feed" heading showing the total count of unread items. Uses `role="status"` for screen-reader announcements.

| State | Behaviour |
| --- | --- |
| 0 unread | Badge is hidden entirely |
| 1–9 | Number is displayed directly |
| 10+ | "9+" is displayed (truncation) |

## Keyboard interactions

| Key | Context | Action |
| --- | --- | --- |
| `Enter` / `Space` | Focus on "Mark all read" | Marks all as read, shows undo banner |
| `Enter` / `Space` | Focus on "Undo" button | Reverts mark-all-read action |
| `Enter` / `Space` | Focus on individual "Read" button | Marks that single item as read |
| `Escape` | Focus on dismiss button | Closes the undo banner (commits mark-all-read) |

## Accessibility (WCAG 2.1 AA)

### ARIA mapping

| Element | Role | Attributes | Rationale |
| --- | --- | --- | --- |
| Feed container | `section` | `aria-label="In-app activity feed"` | Landmark for navigation |
| Activity items | `article` | `aria-current` = `"true"` when unread, `aria-label` includes read/unread suffix | Conveys current/read state to AT |
| Unread dot | N/A | `aria-hidden="true"` on parent container | Purely decorative; state conveyed via `aria-current` |
| Unread count badge | `status` | `aria-label="{n} unread items"` | Announces count without interruption |
| Live region | `status` | `aria-live="polite"`, `aria-atomic="true"`, CSS `sr-only` | Announces mark-read actions without interrupting |
| Undo banner | `alert` | `aria-live="polite"` (overrides implicit `assertive`) | Announces the action politely; explicit `aria-live` takes precedence per WAI-ARIA |
| Mark-all-read button | `button` | `aria-label="Mark all {n} unread items as read"` | Specific label for screen readers |
| Mark-read button | `button` | `aria-label='Mark "{title}" as read'` | Contextual label |

### Live region announcements

| Action | Announcement |
| --- | --- |
| Mark all read | "All activities marked as read." |
| Undo mark all read | "Mark all read undone." |
| Mark single item read | "Activity marked as read." |

### Reduced motion

- `.unread-dot` pulse animation disabled via `@media (prefers-reduced-motion: reduce)`.
- Undo banner `slideDown` animation disabled.
- All item transitions disabled.

### High contrast / forced colors

`@media (forced-colors: active)` overrides:
- Unread dot uses `Highlight` system colour.
- Unread left border uses `Highlight`.
- Buttons use `ButtonText`, `ButtonFace`, `Highlight`, `HighlightText`.
- Read indicator uses `GrayText`.

### axe expectations

Points verified during design:

- **Contrast**: Blue `#3b82f6` on dark backgrounds meets AA for normal text (4.5:1+). Badge white-on-blue meets AA.
- **Decorative elements**: The unread dot, read indicator, and icons carry `aria-hidden="true"`.
- **Interactive elements**: All buttons expose an accessible name (text content or `aria-label`).
- **Live region**: `role="status"` with `aria-live="polite"` ensures announcements are queued, not interrupting.

## Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| ≥768px | Standard layout: header row with title + mark-all-read button aligned right |
| <768px | Header wraps: title and badge on one row, button wraps below if needed |
| Touch devices | Mark-read button is always visible (no hover dependency) |

## Edge cases

### Very long lists

- Pagination (10 items per page) keeps the list manageable.
- "Mark all read" operates on the **entire dataset**, not just the visible page.
- Unread count badge reflects the total unread count across all pages.

### Zero unread items

- "Mark all read" button is hidden.
- Unread count badge is hidden.
- All items show the read indicator (empty circle).
- `aria-current` is removed from all items.

### Undo timing

- The undo banner auto-dismisses after **10 seconds**.
- Performing any individual mark-read action also dismisses the undo banner.
- Clicking "Undo" restores the exact previous state (captured via `useRef`).
- Clicking "✕" dismiss commits the mark-all-read (banner disappears, items stay marked).

### Loading state

- A centered polite live region announces "Loading activity feed…".
- No header, badge, or undo banner is rendered during loading.

### Empty state

- The existing `EmptyState` variant "audit-trail" with a "Refresh" CTA is shown when the feed has 0 items.
- No header, badge, or undo banner is rendered.

## Test coverage

- [`ActivityFeed.test.tsx`](../../src/components/ActivityFeed.test.tsx) — loading state, renders feed, unread indicators (badge count, dots, `aria-current`), mark all read flow (marks items, shows banner, undo, dismiss, auto-dismiss), per-item mark read, live region announcement, accessible badge labels.
