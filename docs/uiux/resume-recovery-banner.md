# Resume Recovery Banner Pattern

An inline **"resume where you left off"** pattern for tasks interrupted by an
error — a failed form submission, a dropped upload, a lost session mid-setup.
When users return to the page where the failure happened, the banner appears
with enough context to recognise the situation and **one primary CTA to
continue** from the point of failure instead of starting over.

> Implementation:
> [`ResumeRecoveryBanner`](../../src/components/ResumeRecoveryBanner/ResumeRecoveryBanner.tsx)
> (+ [`index.ts`](../../src/components/ResumeRecoveryBanner/index.ts) barrel).

## When to use this over other patterns

| Situation | Pattern |
| --- | --- |
| User left **after an error** and returns; partial work is recoverable | **Resume Recovery Banner** |
| Destructive action needs a reversible window | [Undo Banner](./undo-banner-pattern.md) |
| User wants to keep an unfinished draft *without* an error | Save-as-draft affordance |
| Errors need surfacing while the app stays open | `ErrorRecoveryPanel` snapshots |

The recovery point is written **at the moment of failure** and only surfaces
**when the user comes back** — it never interrupts a live session.

## Anatomy

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠  Your upload was interrupted          [↻ Resume upload]     │
│    A file upload did not complete. You can   Don't show again │
│    resume without starting over.                            ✕│
│    Saved 2 hours ago · Available for 5 more days             │
└──────────────────────────────────────────────────────────────┘
```

- **Status icon** — decorative (`aria-hidden`) amber warning triangle.
- **Heading + description** — what was interrupted and why resuming helps.
- **Context line** — relative age of the saved state (`Intl.RelativeTimeFormat`)
  plus how long it remains available before expiry.
- **Primary CTA** — variant-specific verb phrase (`Resume form`, `Resume
  upload`, `Resume setup`). Exactly one primary action.
- **"Don't show again"** — permanent opt-out for the page.
- **✕ Dismiss for now** — discards only the current recovery point.

## Storage contract

State lives in `localStorage`, one slot per page key:

| Key | Purpose | Written by |
| --- | --- | --- |
| `recovery_state_<page>` | JSON `RecoveryFrame`: `{ page, timestamp, payload, variant? }` | Pages, on failure/interruption |
| `recovery_dismissed_<page>` | `"true"` after a permanent opt-out | Banner |

Helpers exported from the barrel:

| Helper | Meaning |
| --- | --- |
| `saveRecoveryFrame(frame)` | Persist a recovery point (overwrites the previous one). |
| `readRecoveryFrame(page, days)` | Read a frame; `null` if missing/expired/dismissed. Expired slots are cleaned up eagerly. |
| `clearRecoveryFrame(page)` | Remove the current frame (soft dismissal, success, or consumption). Leaves the opt-out flag untouched. |
| `dismissRecoveryForever(page)` / `isDismissedForever(page)` / `resetDismissedForever(page)` | Permanent opt-out flag management (support/preferences flows). |
| `variantFromPage(path)` | URL-keyword fallback (`upload`, `payout`, otherwise `form`). |
| `formatRelativeAge(ts)` | "2 hours ago"-style context line text. |

### Declared context beats URL sniffing

A frame may carry `variant?: "form" | "upload" | "payout"`. When present it
overrides `variantFromPage`, so pages control their own copy/CTA exactly
(e.g. `/startup/offering-registration` declares `"upload"` even though the path
contains neither keyword). Invalid values fall back to URL inference safely.

## Expiration

- Frames expire after **N days** (default **7**, configurable via the
  `expirationDays` prop).
- Expiry is enforced at read time against the saved `timestamp`; expired frames
  are treated as absent and their storage slot is reclaimed.
- The context line tells users how long the offer remains ("Available for 4
  more days") so silent loss never surprises them.

## Dismissal tiers

| Control | Effect | Can it reappear? |
| --- | --- | --- |
| ✕ **Dismiss for now** | Removes the current frame only | Yes — the next failed attempt saves a fresh frame |
| **Don't show again** | Sets `recovery_dismissed_<page>`, removes the frame | No — not even for future failures; reversible only via `resetDismissedForever` |

The destructive option is explicit text rather than hiding permanence behind
an unlabeled ✕.

## Placement & responsiveness

- Rendered **inline at the top of the page's content** — never as a fixed
  overlay — so it reads as part of the page it belongs to and scrolls away
  naturally.
- Full width with comfortable padding on small screens (`flex-col`);
  switches to icon + copy + actions row at `sm:` and up. The action row wraps
  (`flex-wrap`) so the CTA is always reachable without horizontal scrolling.
- One banner per page: each page key holds a single frame, and the component
  shows only the frame whose `page` matches the active route (strict match,
  `activePage` prop can override the route key).

## Lifecycle rules (for engineers)

1. **Save at the moment of failure** (or when the session ends mid-task) via
   `saveRecoveryFrame`. Overwriting is expected — the newest failure wins.
2. **Clear on clean completion** via `clearRecoveryFrame` so stale offers don't linger.
3. **Resuming consumes the frame** — the banner clears storage itself before
   unmounting; if the resumed attempt fails again the page simply saves anew.
4. The banner renders nothing (returns `null`) when there is no valid frame —
   pages can mount it unconditionally.

```tsx
// Page that owns the interrupted task
const PAGE = "/startup/report-revenue";

const handleResume = (_page: string, payload: unknown) => {
  if (!isMyPayload(payload)) return;
  setFields(payload);            // restore user input
};

// On failure:
saveRecoveryFrame({
  page: PAGE,
  timestamp: Date.now(),
  variant: "form",
  payload: { reportPeriod, grossRevenue },
});

// On success:
clearRecoveryFrame(PAGE);

return (
  <>
    <ResumeRecoveryBanner onResume={handleResume} />
    {/* …page content… */}
  </>
);
```

Live integrations to review:

- `/startup/report-revenue` ([RevenueReportForm](../../src/components/RevenueReportForm.tsx)) —
  a simulated gateway timeout saves the entered report; resuming restores every field.
- `/startup/offering-registration`
  ([OfferingRegistrationDemo](../../src/pages/OfferingRegistrationDemo.tsx)) —
  uploads interrupted by leaving the page or by network failure save the file list;
  resuming scrolls to and focuses the documents step.

## Accessibility (WCAG 2.1 AA)

- **Live region semantics** — container uses `role="status"`
  (`aria-live="polite"`, `aria-atomic="true"`) with an `aria-label` naming the
  recovery, matching the UndoBanner convention. Polite (not `alert`) because
  the situation is recoverable, not urgent.
- **Named controls** — the CTA exposes its context
  (`"Resume form: Your form draft was saved"`), and both dismissals have
  unambiguous names ("Don't show recovery suggestions for this page again",
  `"Dismiss for now: <heading>"`). No icon-only mystery meat.
- **Decorative icon** — `aria-hidden="true"`.
- **Contrast** — amber-on-dark copy and the dark-on-amber CTA meet ≥4.5:1
  against the banner surface (verified during design; see axe notes).
- **Keyboard** — native `<button>`s in DOM order with visible
  `focus:ring` styles. If focus falls back to `<body>` when the banner
  unmounts, focus returns to the element focused before the banner appeared —
  the same contract as the Undo shortcut's focus-return.
- **Reduced motion** — no entrance animations; the optional smooth scroll on
  resume (offering registration) collapses to `auto` under
  `prefers-reduced-motion`. See [reduced-motion-guidelines.md](./reduced-motion-guidelines.md).
- **No time pressure** — expiry is measured in *days* and surfaced as static
  text; nothing disappears while the user is looking at it.

### axe notes

`ResumeRecoveryBanner.test.tsx` runs `jest-axe` against the rendered banner and
asserts **no violations**. Points verified during design:

- `role="status"` + polite live region (an earlier draft used `role="alert"`,
  which implies assertive announcement — corrected for consistency).
- All interactive elements have accessible names; decorative SVGs are hidden.
- Colour pairs: `#fbbf24` (and its 70–90% opacities) on the amber-tinted dark
  surface, and `#1f2937` on `#f59e0b`/`#d97706` CTA fills.

## Test coverage

- [`ResumeRecoveryBanner.test.tsx`](../../src/components/ResumeRecoveryBanner/ResumeRecoveryBanner.test.tsx) —
  storage round-trip, expiry cleanup, corrupt/malformed frames, soft vs.
  permanent dismissal (incl. re-show suppression and reset helper),
  consume-on-resume, declared-variant override and invalid-variant fallback,
  variant-specific copy/CTAs, relative-age and remaining-days context lines,
  custom `expirationDays`, router gate across multiple cached pages,
  accessible-name assertions, and axe.
- [`RevenueReportForm.test.tsx`](../../src/components/RevenueReportForm.test.tsx) —
  end-to-end form variant: banner hidden by default, restore-on-resume with
  value assertions, frame saved on simulated submission failure, stale frame
  cleared after success.
- [`OfferingRegistrationDemo.test.tsx`](../../src/pages/OfferingRegistrationDemo.test.tsx) —
  upload variant: frame saved on failed upload and on unmount mid-upload,
  cleared after successful retry, resume focuses the documents step and
  consumes the frame, no banner without interruption.
