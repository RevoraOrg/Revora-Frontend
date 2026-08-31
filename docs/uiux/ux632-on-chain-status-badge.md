# UX632: On-Chain Status Badge Component

Issues #256 → #632. Design-system pattern for surfacing on-chain
transaction/token status with a paired **icon + text** label (never colour
alone) and an accessible confirmation tooltip.

## Scope

- Implemented across `src/components/ActivityItem.tsx` (the `TransactionReceipt`
  status row now renders the reusable badge).
- The badge itself lives in `src/components/OnchainBadge` and is reusable
  anywhere an on-chain status pill is needed (governance receipts, tables, etc.).
- No API, storage, or routing changes.

---

## Status variants

Each variant pairs an icon with an explicit text label; colour is decorative
only and never the sole cue. All foreground colours meet WCAG 2.1 AA ≥4.5:1
contrast on the app's dark surfaces.

| Variant | Label | Icon | Semantics |
|---|---|---|---|
| `pending` | Pending | Clock | Queued, waiting for inclusion |
| `confirming` | Confirming | ArrowUpCircle | Included, gathering confirmations (counter shown) |
| `confirmed` | Confirmed | CheckCircle2 | Final, with confirmation counter |
| `failed` | Failed | XCircle | On-chain operation did not succeed |
| `reorged` | Reorged | RotateCcw | Removed/changed by a chain reorganization |

Added to the existing `retrying` (RefreshCw) variant from #256.

> **Usage rule:** never render a bare colour chip. Always pass `variant` so the
> icon + label pair is emitted.

---

## Confirmation tooltip

When block/hash/confirmations metadata is present, hovering or keyboard-focusing
the badge opens a compact tooltip:

- **Block** (ledger sequence, thousands-grouped; omitted when absent)
- **Confirmations** (`current / target`)
- **Time since** (relative, ISO input; omitted when absent)
- **Open in explorer** link — explicit `explorerUrl` wins, otherwise resolved to
  Stellar Expert from `transactionHash` + `network`.

Tooltip behaviour follows the `PayoutStatusPill` pattern:

| Input | Behaviour |
|---|---|
| `(pointer: fine)` hover / keyboard focus | Opens |
| Escape | Closes and suppresses until hover/focus fully clears |
| Blur / mouse leave | Closes |

Trigger is wired to the tooltip via `aria-describedby`; the status pill keeps
`role="status"` with a plain-language `aria-label`. Supports reduced motion and
`prefers-contrast: high`.

> **Usage rule:** the explorer link is revealed only while the tooltip is open so
> hidden interactive content never lands in the tab order.

---

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'pending' \| 'retrying' \| 'confirming' \| 'confirmed' \| 'failed' \| 'reorged'` | — | Required status |
| `currentConfirmations` | `number` | `0` | Shown in pill counter + tooltip |
| `targetConfirmations` | `number` | `0` | Shown in tooltip |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Pill density |
| `transactionHash` | `string` | `''` | Resolves default explorer link |
| `explorerUrl` | `string` | `''` | Overrides explorer link |
| `metadata` | `{ blockNumber?, confirmedAt?, network? }` | — | Tooltip ledger data |
| `showTooltip` | `boolean` | `true` | Set `false` to suppress tooltip |
| `className` | `string` | `''` | Extra classes |

### Status mapping from legacy values

`ActivityItem.normalizeTxStatus` maps legacy statuses so existing callers keep
working: `completed`/`success` → `confirmed`, `error` → `failed`,
`reorg` → `reorged`. Unknown or empty input yields `undefined` and the
`TransactionReceipt` renders a neutral `—` while preserving the legacy
`status-badge status-{raw}` classes and `tx-status` data-testid.

---

## Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|---|---|
| Not colour-only | Icon + text label for every variant |
| Contrast | ≥4.5:1 foreground on dark surfaces (verified across variants) |
| Name / description | `role="status"` + `aria-label`; tooltip `role="tooltip"` via `aria-describedby` |
| Keyboard | Focusable trigger (tooltip opens on focus), Escape dismisses |
| Explorer | `rel="noopener noreferrer"`, visible text |
| Reduced motion | Pulse/rotate/bob animations disabled; static fallback shown |
| Touch | Tap gives focus → tooltip opens (coarse pointer) |
| RTL | Logical positioning for tooltip + arrow |

`jest-axe` runs against the badge with the tooltip open and reports no
violations.

---

## Edge cases

| Case | Behaviour |
|---|---|
| No metadata / `showTooltip=false` | No tooltip, no `tabindex`, no `aria-describedby` |
| Missing block / time | Rows omitted; confirmations always shown |
| No explorer URL / hash | "Explorer link unavailable" (non-interactive) when open |
| Legacy status (`completed`, `success`, `error`) | Mapped to canonical variant |
| Empty/whitespace/unknown status | Neutral `—` placeholder, legacy classes kept |
| Long block numbers | Tabular nums + `overflow-wrap: anywhere` |
| Reorged | Warning-style violet pill + icon; static under reduced motion |

---

## Files

| File | Purpose |
|---|---|
| `src/components/OnchainBadge/OnchainBadge.tsx` | Badge + tooltip component |
| `src/components/OnchainBadge/OnchainBadge.css` | Variants, tooltip, reduced-motion, high-contrast |
| `src/components/OnchainBadge/index.ts` | Public exports incl. `OnchainBadgeMetadata` |
| `src/components/OnchainBadge/OnchainBadge.test.tsx` | Variant + tooltip tests (incl. axe) |
| `src/components/ActivityItem.tsx` | `TransactionReceipt` integration + `normalizeTxStatus` |
| `src/components/ActivityItem.css` | Neutralised legacy `status-badge` wrapper |
| `src/index.css` | `--ob-failed-*` / `--ob-reorged-*` tokens |

---

## Example

```tsx
import { OnchainBadge } from '../OnchainBadge';

<OnchainBadge
  variant="confirming"
  currentConfirmations={3}
  targetConfirmations={12}
  transactionHash="a1b2c3d4e5f6…"
  metadata={{
    blockNumber: 55001234,
    confirmedAt: new Date().toISOString(),
    network: 'public',
  }}
/>
```

## Before / after

**Before:** `TransactionReceipt` showed a colour-only text pill
(`status-completed`, `status-pending`, `status-failed`) with no icon, no
confirmations data, and no explorer link on the status itself.

**After:** Every status shows a paired icon + text badge; `confirming`/`confirmed`
display a live confirmations counter and hover/focus reveals block,
confirmations, time-since, and a one-click explorer link.