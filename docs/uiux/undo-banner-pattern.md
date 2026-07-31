# Undo Banner Pattern

A consistent, accessible pattern for **reversible destructive actions** —
delete draft, remove from blacklist, archive offering. Instead of a blocking
"Are you sure?" confirmation, the action happens immediately and a banner offers
a short window to **Undo** before it becomes permanent.

> Implementation: [`UndoBanner`](../../src/components/UndoBanner/UndoBanner.tsx),
> [`useUndoBanners`](../../src/hooks/useUndoBanners.ts),
> [`useUndoKeyboard`](../../src/hooks/useUndoKeyboard.ts),
> [`useReducedMotion`](../../src/hooks/useReducedMotion.ts).

## Why this over a confirm dialog

- **Lower friction** for frequent, low-stakes destructive actions.
- **Reversible by default** — the safety net is the Undo, not a modal gate.
- **Non-blocking** — the user keeps working; nothing steals focus.

Use a confirmation dialog instead when an action is **irreversible** or
**high-impact** (e.g. deleting an account). Undo is for the *recoverable* cases.

## Anatomy

```
┌─────────────────────────────────────────────┐  ▲
│  2 pending actions           ↶ Undo all  ✕  │  │  Aggregate Stack Header
├─────────────────────────────────────────────┤  │  (shown when >1 active items)
│  ◷  Deleted "Q4 forecast"       ↶ Undo   ✕  │  │  Newest Banner (top)
├─────────────────────────────────────────────┤  │
│  ◷  Deleted "Q3 report"         ↶ Undo   ✕  │  │  Older Banner
├─────────────────────────────────────────────┤  │
│  +2 more pending                            │  ▼  Overflow Summary
└─────────────────────────────────────────────┘     (visible when > maxVisible)
```

- **Countdown ring** — depletes over the reversible window (default 5s, auto-scaled for bursts),
  signalling time-to-permanence. Decorative (`aria-hidden`).
- **Message** — past-tense description of what happened (`Deleted "Q3 report"`).
- **Undo CTA** — primary action; reverses the change and removes the banner (`aria-label="Undo: <message>"`).
- **Dismiss (✕)** — commits the action immediately and removes the banner (`aria-label="Dismiss: <message>"`).
- **Aggregate "Undo all" Header** — shown when multiple actions (`>1`) are pending; reverses all stacked actions in reverse chronological order (`aria-label="Undo all N pending actions"`).
- **Overflow summary** — displayed when pending banners exceed `maxVisible` (default 4). Displays `+N more pending` visually and includes hidden screen-reader text `"N additional undoable actions"` with `role="status"` and `aria-label`.

## Action contract (for engineers)

Drive banners through `useUndoBanners`. Each reversible action provides:

| Field | Required | Meaning |
| --- | --- | --- |
| `message` | yes | Past-tense summary shown in the banner. |
| `onUndo` | yes | Reverse the action (restore UI + cancel/rollback any persistence). |
| `onCommit` | no | Make the action permanent — runs when the timer elapses **or** the user dismisses. Omit if the action is already persisted and only `onUndo` changes state. |
| `actionLabel` | no | CTA label, defaults to `Undo`. |
| `durationMs` | no | Reversible window, defaults to `5000` (+1000ms scaling per existing item in stack when omitted). |

```tsx
const { banners, registerUndo, undo, dismiss, undoAll, dismissAll } = useUndoBanners();

function deleteDraft(draft: Draft) {
  removeDraftFromList(draft.id);              // optimistic UI update
  registerUndo({
    message: `Deleted "${draft.title}"`,
    onUndo: () => restoreDraftToList(draft),  // reverse the optimistic update
    onCommit: () => api.deleteDraft(draft.id) // persist only after the window
  });
}

return (
  <>
    {/* …page… */}
    <UndoBanner
      banners={banners}
      onUndo={undo}
      onDismiss={dismiss}
      onUndoAll={undoAll}
      onDismissAll={dismissAll}
      maxVisible={4}
    />
  </>
);
```

Timing is owned by the hook (a single shared ticker), so `<UndoBanner />` stays a
pure render of the current stack.

## Placement & stacking

- **Placement** — pinned via `position: fixed` to the bottom centre, **above the
  page footer** (`bottom-16`), at `z-50`. The container is
  `pointer-events-none` so it never blocks the page; each banner re-enables
  pointer events for its own controls.
- **Stacking** — multiple banners stack vertically with the **newest on top**.
  Beyond `maxVisible` (defaults to **4**) older banners collapse into a `+N more pending`
  summary rather than overflowing the viewport.
- **Undo all affordance** — when 2 or more actions are active, an aggregate header appears offering
  an **Undo all** button to bulk-revert all actions and a **Dismiss all (✕)** control to commit all. It is hidden or absent when only a single action exists to reduce UI noise.
- **Independent lifecycles** — each banner maintains its own timer; expiring or
  undoing one item preserves remaining items in the stack.

## Stack limits & overflow behavior

To prevent notification clutter and viewport overflow:
- The stack displays up to **4 visible items** by default (`maxVisible = 4`).
- Additional actions beyond 4 cause older banners to collapse into an overflow indicator showing `+N more pending` (e.g. `+3 more pending`).
- Screen reader accessibility: The overflow element features `role="status"`, `aria-label="${hiddenCount} additional undoable actions"`, and visually-hidden text `<span className="sr-only">${hiddenCount} additional undoable actions</span>` so assistive technologies announce the overflow count without confusing screen reader users.

## Undo All aggregate action rules & failure handling

The aggregate **Undo all** action processes every active item currently in the stack:

### Execution contract
- Items are undone in **reverse chronological order** (newest to oldest).
- All registered `onUndo` callbacks are invoked and their respective banners are immediately removed from the stack.

### Expected behavior under edge cases:
- **One undo fails (Network / API failure)**:
  If an individual `onUndo` callback throws or fails (e.g., network timeout during server rollback), the frontend catches the error, retains or notifies the user via an error toast, and continues processing remaining items in the stack.
- **Some actions already expired**:
  Expired items auto-commit via their individual timers and leave the stack before `undoAll` is clicked. `undoAll` only operates on currently active items.
- **Multiple action types exist**:
  The stack seamlessly handles mixed actions (e.g., deleted draft, archived folder, removed member, renamed workspace). `undoAll` executes each action's specific `onUndo` handler in sequence.
- **Partial undos**:
  If a user manually undos 1 item and then clicks "Undo all", "Undo all" undoes the remaining active items in the stack.

## Auto-dismiss timing per stack size

To prevent rapid action bursts from overwhelming users before they can react, auto-dismiss durations scale dynamically with stack size when explicit `durationMs` is omitted:

| Active Stack Size | Reversible Window Duration |
| --- | --- |
| 1 item | 5.0s (5000ms) |
| 2 items | 6.0s (6000ms) |
| 3 items | 7.0s (7000ms) |
| 4 items | 8.0s (8000ms) |
| 5+ items | 9.0s - 10.0s max (10000ms cap) |

### Timer reset & lifecycle behavior
- **New item addition**: When a new item is added to an active stack, its timer starts with the scaled duration for that stack size. Existing timers continue uninterrupted, maintaining independent lifecycles.
- **Timer expiry**: When an individual item's timer reaches 0, its `onCommit` callback runs, the banner disappears, and the stack smoothly shrinks.

## Responsive behaviour

| Device | Stack Placement | Width & Spacing | Touch Target Sizing | Overflow Handling |
| --- | --- | --- | --- | --- |
| **Desktop** | Pinned bottom-center (`bottom-16`), `z-50` | `w-full max-w-md` | Standard button padding (`px-2.5 py-2`) | Max 4 visible items; `+N more pending` overflow |
| **Tablet** | Pinned bottom-center (`bottom-16`), `z-50` | `w-full max-w-md` | Tap targets `min-h-[44px]` | Max 4 visible items; `+N more pending` overflow |
| **Mobile** | Pinned bottom-center (`bottom-16`), `z-50` | `w-full max-w-md`, full-width inside `px-4` margin | Enforced `min-h-[44px]` & `min-w-[44px]` touch targets | Max 4 visible items; message text truncates (`truncate`) |

- Banners use `w-full max-w-md`: full width with side padding on small screens, capped to a comfortable card width on larger screens.
- Mobile stack caps at `maxVisible = 4` to prevent vertical viewport clipping on smaller devices while leaving interactive controls easily tapable.
- The layout is a single flex row; the message truncates (`truncate`) so the Undo and dismiss controls always remain reachable.

## Keyboard shortcut: Cmd/Ctrl+Z (Issue #279)

When at least one undo banner is visible, pressing **`Cmd+Z`** (macOS) or
**`Ctrl+Z`** (Windows/Linux) undoes the **newest (topmost) banner** and
removes it from the stack — equivalent to clicking the "Undo" button on that
banner.

### Activation rules

| Condition | Behaviour |
| --- | --- |
| Focus is on the page (not in an editable element) + ≥1 banner visible | Triggers undo on the newest banner |
| Focus is in an `input`, `textarea`, `select`, or `contentEditable` element | Shortcut is **suppressed** — browser native undo takes priority |
| Modal / overlay is open and `disabled` is set | Shortcut is suppressed entirely |
| No banners visible | No-op |

### Focus-return behaviour

After the undo completes, focus is restored to the **origin element** — the
element that was focused immediately before the first banner appeared. This
lets power users undo actions and continue working without manually tabbing
back. If the origin element is no longer in the DOM (e.g. it was removed by
the undo), focus falls back to `document.body`.

### Implementation

The keyboard model lives in the [`useUndoKeyboard`](../../src/hooks/useUndoKeyboard.ts)
hook, which is integrated into `<UndoBanner />` automatically. Consumers do not
need additional wiring unless they want to customise the shortcut (e.g. disable
it when a modal is open).

The `UndoBanner` accepts an optional `onKeyboardUndo` prop that overrides the
default undo callback specifically for keyboard-initiated undos, in case the
focus-return behaviour should differ from click-initiated undos.

The shortcut is registered in the [Keyboard Shortcuts Overlay](../../src/components/KeyboardShortcutsOverlay/shortcutsData.ts)
under **General** as "Undo last action (when undo banner is visible)" with the
`mod+z` key combination.

### Example: using with a modal

```tsx
const [isModalOpen, setIsModalOpen] = useState(false);

<UndoBanner
  banners={banners}
  onUndo={undo}
  onDismiss={dismiss}
  onKeyboardUndo={isModalOpen ? undefined : undo}
/>
```

## Accessibility (WCAG 2.1 AA)

- **Polite live region** — the container is `role="status"` `aria-live="polite"`
  `aria-atomic="false"`, so newly added banners are announced without
  interrupting the user's current task.
- **Screen reader announcement ordering** — Stack changes announce politely in order of arrival.
- **Countdown is decorative** — the ring/seconds are `aria-hidden`. Screen-reader
  users are not pressured by a ticking timer; they act through the clearly
  labelled **Undo** button.
- **Accessible button labels** — Buttons feature explicit descriptive labels:
  - Individual Undo CTA: `aria-label="Undo: <message>"`
  - Individual Dismiss CTA: `aria-label="Dismiss: <message>"`
  - Aggregate Undo All CTA: `aria-label="Undo all N pending actions"`
  - Overflow indicator: `aria-label="N additional undoable actions"`
- **Touch targets** — Interactive buttons satisfy WCAG 2.1 AA Target Size (2.5.5 / 2.5.8) with `min-h-[44px]` tap target bounds on mobile/tablet viewports.
- **Reduced motion** — when `prefers-reduced-motion: reduce` is set, the animated
  sweeping ring is replaced by a **static whole-second count** (no animation).
  See [reduced-motion-guidelines.md](./reduced-motion-guidelines.md).
- **Keyboard & focus** — Undo and dismiss are native `<button>`s with visible
  `focus:ring` styles and are reachable in DOM order. The global
  **`Cmd/Ctrl+Z`** shortcut provides a power-user path to undo the newest
  banner without reaching for the mouse. After undo, focus returns to the
  element that initiated the action.

### axe notes

`UndoBanner.test.tsx` runs `jest-axe` against single banners as well as full stacked layouts with "Undo all" headers and overflow indicators, asserting **no violations**. Points verified during design:

- Contrast: white text and the `#60a5fa` Undo CTA on the `#1f2937` banner surface meet AA contrast for normal text.
- Decorative SVG ring carries `aria-hidden="true"` and no role, so it is not announced.
- All interactive elements expose explicit accessible names (button text and `aria-label`).

## Edge Cases

- **Extremely rapid action bursts**: When users perform 5-10 actions in a single second, the stack displays the 4 newest actions, while collapse summary updates to `+N more pending` with an accessible announcement. Duration auto-scales up to 10s.
- **Mixed action types**: The stack smoothly mixes different action descriptions (e.g. deleted project, archived folder, removed member) and handles their independent undo handlers cleanly.
- **Expired undo actions**: Each banner timer operates independently. Expired banners commit and auto-dismiss without affecting adjacent active banners.
- **Stack shrinking as items expire**: When older items expire or are dismissed, lower items remain in position and overflow count decrements smoothly.
- **Undo all after partial individual undos**: Reverses all currently remaining pending actions without error.
- **Offline / network failures**: Errors thrown inside custom `onUndo` callbacks are caught gracefully, allowing remaining actions to complete and displaying a fallback toast if needed.
- **Reduced motion preference**: Automatically replaces SVG ring animations with static whole-second text numbers.

## Test coverage

- [`UndoBanner.test.tsx`](../../src/components/UndoBanner/UndoBanner.test.tsx) —
  rendering, Undo/dismiss callbacks, `onUndoAll`/`onDismissAll` aggregate actions, custom labels, newest-on-top stacking,
  `+N more` overflow (max 4 default), decorative ring, reduced-motion fallback, keyboard shortcut integration, accessibility labels, overflow announcements, and axe assertions.
- [`useUndoBanners.test.tsx`](../../src/hooks/useUndoBanners.test.tsx) —
  registration, countdown→commit, undo (with no late commit), dismiss→commit,
  `undoAll()`, `dismissAll()`, dynamic auto-dismiss scaling by stack size, and independent stacked lifecycles.
- [`useUndoKeyboard.test.tsx`](../../src/hooks/useUndoKeyboard.test.tsx) —
  Cmd/Ctrl+Z triggers undo on newest banner, suppressed in editable elements,
  focus-return to origin element, no-op when no banners are visible, and
  cleanup on unmount.

