# Governance Proposal Voting UI Pattern (Issue #629)

## Purpose
The governance proposal voting pattern provides token holders with a complete decision-making and voting interface. Integrated directly into the offering detail view (`src/components/OfferingDetail.tsx` under the `#governance` tab) and exported as `GovernanceVoting`, it combines proposal context, quorum tracking, color-blind accessible vote tallies, voting power summaries, and a secure, accessible vote confirmation modal.

## Anatomy

### 1. Proposal Header & Meta
- **Status Pill**: Visual badge with icon indicating state:
  - `Pre-voting` (`gv-pill--pre_voting`): Pending proposals with countdown to start time.
  - `Active` (`gv-pill--active`): Live proposal open for voting with time-remaining countdown.
  - `Passed` (`gv-pill--passed`): Concluded proposal meeting quorum and majority support.
  - `Rejected` (`gv-pill--rejected`): Concluded proposal failing support threshold.
  - `Quorum Failed` (`gv-pill--quorum_failed`): Concluded proposal failing to reach required token participation.
- **Category Badge**: Classifies proposal topic (e.g., *Treasury & Payouts*, *Compliance*).
- **Proposer Row**: Identifies proposal author, formatted address, and optional external community discussion link.

### 2. Quorum Progress Bar
- Displays token participation towards the required quorum threshold.
- Implements `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax`, and descriptive `aria-label`.
- Clear status indicator: `Quorum achieved` vs `Quorum not yet reached`.

### 3. Vote Tally Visualization (Color-Blind Accessible)
- **Segmented Horizontal Bar**: Represents proportional distribution of For, Against, and Abstain votes.
- **Color-Blind Support**: Information is never communicated by color alone:
  - **For**: Solid emerald tone with subtle vertical brightness gradient (`.gv-bar--for`).
  - **Against**: Diagonal crosshatch texture (`.gv-bar--against` repeating linear gradient).
  - **Abstain**: Dotted stipple texture (`.gv-bar--abstain` radial gradient dots).
- **Numeric Text Pairing**: Every segment is paired with an explicit percentage (`XX.X%`) and raw token quantity in the legend cards.
- **Screen Reader Fallback**: Accessible HTML `<table>` with `<caption>`, `<thead>`, and `<tbody>` embedded via `.sr-only`.
- **Live Region Announcements**: An `aria-live="polite"` region announces updated tallies to screen readers whenever a vote is recorded.

### 4. Voting Power Summary Card
- Highlights voter's token balance eligible at snapshot (e.g., `12.5K REV`).
- Displays voter's weight as a percentage of the total circulating voting weight.
- Dynamic eligibility badge:
  - `Eligible to cast vote`
  - `You voted FOR/AGAINST/ABSTAIN`
  - `0 REV tokens — Ineligible to vote`
  - `Voting opens soon` / `Voting concluded`

### 5. Vote Selection (For / Against / Abstain)
- Interactive radiogroup (`role="radiogroup"`, `role="radio"`, `aria-checked`).
- Full keyboard navigation using arrow keys (`ArrowRight`, `ArrowLeft`, `ArrowDown`, `ArrowUp`).
- Defensive state management: Action buttons are disabled for concluded proposals, pre-voting proposals, users with 0 voting power, or voters who already participated.
- Prominent "Review & Cast Vote" CTA opens the confirmation modal.

### 6. Confirmation Modal Flow
- **Focus Management**: Focus trapped within modal via `Tab` / `Shift+Tab`. Pressing `Escape` or clicking the backdrop cancels and closes the modal, restoring focus to the review button.
- **Vote Summary**: Displays selected choice, committed voting power, and pool impact before signing.
- **Immutability Warning**: Explicit alert notifying user that votes on Stellar are irreversible and permanent.
- **Failure Recovery & Concurrency**:
  - Double-click prevention: Submit button disabled while signing/broadcasting.
  - On failure, displays an accessible error callout with an inline `Retry` button.
  - On success, displays transaction confirmation with TX hash and updates the live tally immediately.

## Accessibility (WCAG 2.1 AA)
- Semantic HTML tags used throughout (`<section>`, `<h2>`, `<h3>`, `<button>`, `<table>`).
- Minimum touch targets meet 44px height requirements on desktop and mobile.
- High-contrast text satisfies 4.5:1 ratio against dark glassmorphism backgrounds.
- Forced colors mode (`@media (forced-colors: active)`) preserves high-contrast system borders.
- Reduced motion mode (`@media (prefers-reduced-motion: reduce)`) disables transitions and animations.
- Verified with automated `jest-axe` checks with zero violations.

## Responsive Behavior
- Desktop (≥1024px): 3:2 grid layout pairing the tally visualizer with the voting power summary card.
- Tablet / Mobile (<1024px): Stacked single-column layout with full-width action buttons and touch-friendly controls.
