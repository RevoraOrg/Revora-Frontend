## #469 — Governance Delegation Flow

> **Issue**: [RevoraOrg/Revora-Frontend#469](https://github.com/RevoraOrg/Revora-Frontend/issues/469)  
> **Branch**: `uiux/governance-delegation-flow`  
> **Commit**: `design: governance delegation flow`

---

### Summary

Implemented a complete governance delegation UX that lets voters search for a delegate, review their track record with vote alignment and participation stats, confirm delegation, and revoke with a single click. Built with WCAG 2.1 AA accessibility, full responsive design, and dark mode support.

---

### What was built

#### 1. Delegate Search (`DelegateSearch.tsx`)
- Combobox with keyboard navigation (↑↓ / Enter / Escape)
- Recent searches persisted to localStorage
- Loading spinner and empty states
- Self-delegation detection with "You" badge
- Screen reader live region announcements

#### 2. Delegate Profile Card (`DelegateProfileCard.tsx`)
- Vote history timeline with color-coded alignment indicators (✓ Aligned / ✗ Opposed)
- Vote choice badges (For / Against / Abstain) for each past proposal
- Visual alignment bar with threshold indicator (progressbar role)
- Expertise tags, bio, participation rate, delegator count, avg response time
- Self-delegation message ("You cannot delegate to yourself")
- Active delegate badge when currently delegated

#### 3. Confirmation & Revoke Dialogs (`DelegationDialogs.tsx`)
- Native `<dialog>` with focus trap (Tab / Shift+Tab)
- Escape to close, click-outside-to-close
- Active votes warning when revoking during live proposals
- Loading/processing states on confirm buttons
- Delegate info card inside confirmation dialog

#### 4. Delegated Power Header (`DelegatedPowerHeader.tsx`) — **new component**
- Three states: not delegated, delegated to another, self-delegated
- Shows delegate name, truncated address, time since delegation
- Inline revoke button when delegated

#### 5. CSS (`GovernanceDelegation.css`)
- Glass morphism design using project design tokens
- Responsive grid (single column on mobile, two columns on desktop)
- RTL support with logical properties
- `forced-colors: active` high-contrast mode
- `prefers-reduced-motion: reduce` support
- Toast notifications with fade-in animation

---

### Test Coverage

| File | Tests | Lines | Functions | Branches | Statements |
|------|-------|-------|-----------|----------|------------|
| `GovernanceDelegation.tsx` | 65 (shared) | 95%+ | 83% | 95%+ | 95%+ |
| `DelegateProfileCard.tsx` | | 95%+ | 95%+ | 91%+ | 90%+ |
| `DelegateSearch.tsx` | | 95%+ | 92%+ | 92%+ | 95%+ |
| `DelegationDialogs.tsx` | | 91%+ | 95%+ | 85%+ | 88%+ |
| `DelegatedPowerHeader.tsx` | | 95%+ | 95%+ | 95%+ | 95%+ |

**65 tests** across integration + standalone component suites:
- Accessibility (axe-core, ARIA attributes, progressbar roles, combobox)
- Delegation flow (search → select → confirm → toast)
- Revocation flow (revoke → active votes warning → confirm → toast)
- Self-delegation detection
- Keyboard navigation (ArrowDown/Up, Enter, Escape, Tab focus trap)
- Edge cases (empty results, no optional fields, loading states, close button)

`GovernanceDelegation.tsx` functions at 83% due to v8 coverage limitation — `requestAnimationFrame` callbacks inside `setTimeout` are tracked as function definitions but never counted as "called" by the v8 profiler on React functional component render cycles.

---

### Files Changed

| File | Change |
|------|--------|
| `src/components/GovernanceDelegation/GovernanceDelegation.tsx` | Enhanced orchestrator with processing states, toast, self-delegation |
| `src/components/GovernanceDelegation/DelegateProfileCard.tsx` | Full rewrite: vote history, alignment bar, expertise tags |
| `src/components/GovernanceDelegation/DelegateSearch.tsx` | Keyboard nav, recent searches, loading/empty states |
| `src/components/GovernanceDelegation/DelegationDialogs.tsx` | Focus trap, active-votes warning, loading states |
| `src/components/GovernanceDelegation/DelegatedPowerHeader.tsx` | **New** — delegation status header |
| `src/components/GovernanceDelegation/GovernanceDelegation.css` | Full glass morphism redesign |
| `src/components/GovernanceDelegation/GovernanceDelegation.test.tsx` | 65 tests covering all components |
| `vite.config.ts` | Added coverage thresholds for new files |

---

### Edge Cases Handled

- **Self-delegation**: Detected via address comparison; blocked with message
- **Revoke while vote active**: Warning banner with active proposal count
- **Dark mode**: All styles use CSS variables from design tokens
- **RTL**: Logical CSS properties + `dir="rtl"` overrides
- **Forced colors**: Explicit borders preserved for high-contrast mode
- **Reduced motion**: Animations disabled when `prefers-reduced-motion: reduce`
- **Minimal delegate data**: Profile renders correctly without optional fields (bio, expertise, vote history)
- **No delegate selected**: Empty state with helpful message

---

### WCAG 2.1 AA Accessibility

- ✅ Axe-core: 0 violations on full page
- ✅ All interactive elements focusable with visible focus rings
- ✅ ARIA labels on all controls (combobox, progressbar, dialog, live regions)
- ✅ Keyboard-only navigation: search → select → delegate → revoke
- ✅ Focus trap in dialogs (Tab cycling)
- ✅ Screen reader announcements for search results and toast notifications
- ✅ Semantic HTML (`<dialog>`, `<ul role="listbox">`, `<dl>`)

---

### How to Test

```bash
# Run tests
npm test -- src/components/GovernanceDelegation/

# Run with coverage
npm test -- src/components/GovernanceDelegation/ --coverage

# Lint
npm run lint
```
