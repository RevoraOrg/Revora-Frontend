# UX479: On-Chain Status Badge Tooltip — Copy Feedback & Touch Popover

## Scope

Design-system documentation for the `OnChainStatusBadge` tooltip behaviour shipped for
**Issue #479** ([UI/UX Design] Design an On-Chain Status badge tooltip with block and hash
metadata). Builds on the base pattern documented in
[`ux256-onchain-badge-tooltip.md`](./ux256-onchain-badge-tooltip.md); this document records
the #479-specific decisions: copy actions with polite live-region feedback, copy button
states, the touch-friendly popover variant, and the validated edge cases.

UI/UX only; no API or routing changes.

---

## Behaviour contract

On hover **or** focus (pointer-fine), the “On-chain” badge reveals a two-column metadata
panel: **Block**, **Hash**, **Confirmations**, **Time since**, plus an **Open in explorer**
link when a hash or explicit explorer URL is available.

| Input | Behaviour |
|---|---|
| Pointer-fine hover | Panel fades in (CSS `opacity` transition), pointer events enabled |
| Keyboard focus / `focus-within` | Panel visible and interactive |
| Pointer-coarse (touch) | Badge toggles the panel as a popover; `aria-expanded` on trigger |
| Escape (popover open) | Closes the popover |
| `@media (hover: none)` | Hover-open is disabled so panels never stick on touch |

---

## Copy actions & live region

Each metadata field with a copyable value exposes a copy button:

- **Hash copy** always writes the **full** transaction hash (`navigator.clipboard.writeText`),
  while the UI displays the truncated form (first 6 + `…` + last 4).
- **Block copy** writes the raw block/ledger sequence.
- On success the button flips to a check icon for ~2 s and the field is announced.

**Polite live region (WCAG 2.1 AA):** a visually hidden `role="status"` + `aria-live="polite"`
region announces `"Block number copied to clipboard."` / `"Transaction hash copied to clipboard."`
so assistive technology users get non-interruptive feedback.

| Copy state | Trigger | Button UI | Announcement |
|---|---|---|---|
| Idle | — | Copy icon, `aria-label` “Copy hash”/“Copy block” | — |
| Copied | Success | Check icon ~2 s, `aria-label` “… copied to clipboard” | Polite live region |
| Unavailable | Missing value | Disabled button, `aria-label` “… unavailable” | — |

---

## Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|---|---|
| Accessible name | `aria-label` on the badge trigger (default: “On-chain confirmation details”) |
| Tooltip association | Panel `role="tooltip"` linked via `aria-controls` **and** `aria-describedby` on the trigger |
| Popover state | `aria-expanded` toggled on the trigger in coarse-pointer mode |
| Copy feedback | `role="status"` + `aria-live="polite"` (never `assertive`) |
| Keyboard | Focus-visible rings on badge and copy buttons; Escape closes popover |
| Explorer link | `rel="noopener noreferrer"`, `target="_blank"`, visible link text |
| Motion | Transitions disabled under `prefers-reduced-motion` |
| Contrast | High-contrast friendly tokens (`--ocb-*`), colour never the only cue (icons + text) |

### axe

`OnChainStatusBadge.test.tsx` runs `jest-axe` against a fully populated badge and asserts
zero violations.

---

## Edge cases

| Case | Behaviour |
|---|---|
| Missing block/hash/confirmations/time | Em dash (`—`) placeholder; copy button disabled |
| Very long block numbers | `BigInt`-safe grouping via `toLocaleString`; `overflow-wrap: anywhere` |
| Zero confirmations | Rendered as `0` (not an em dash) |
| Future/invalid timestamp | Clamped to `0s ago` / em dash |
| RTL (`dir="rtl"`) | Logical positioning for the panel anchor and arrow |
| No explorer URL/hash | Static “Explorer link unavailable” text (no dead link) |

---

## Design tokens (`index.css`)

| Token | Usage |
|---|---|
| `--ocb-badge-*` | Badge colours, padding, focus ring |
| `--ocb-panel-width` | Max tooltip width (18rem) |
| `--success` | Copied-state icon colour |

Styles: `OnChainStatusBadge.css`

---

## Files

| File | Purpose |
|---|---|
| `OnChainStatusBadge.tsx` | Component (tooltip + popover + copy + live region) |
| `OnChainStatusBadge.css` | Layout, responsive, touch, RTL, reduced-motion variants |
| `onChainMetadataUtils.ts` | Truncation, formatting, explorer URL resolution |
| `OnChainStatusBadge.test.tsx` | Component + axe tests (copy flows, popover, edge cases) |
| `onChainMetadataUtils.test.ts` | Formatter unit tests |

---

## Before / after (visual)

**Before:** Milestone labels showed no ledger context; users copied hashes from devtools or
external tools.

**After:** A compact “On-chain” pill beside the label opens a two-column metadata panel with
copy actions, polite live-region feedback, and a Stellar Expert link; touch devices get a
tap-to-toggle popover instead of a stuck hover tooltip.
