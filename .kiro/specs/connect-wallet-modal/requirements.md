# Requirements Document

## Introduction

The Connect Wallet Modal is the single, authoritative entry point for all wallet connection flows in the Revora Frontend. Currently no canonical UI exists for wallet connection — only a static placeholder button on the Login page. This feature introduces a fully accessible, controlled modal component that enumerates supported wallet providers, manages per-provider UI states (detected, not installed, unavailable, connecting, error), and delegates all persistent wallet state to an external context/hook. The modal is a pure controlled component driven by props and callbacks, reusing all existing UI primitives (Button, icons, glassmorphic design tokens, modal focus-trap pattern).

## Glossary

- **ConnectWalletModal**: The modal dialog component defined by this spec. The single entry point for all wallet connection flows.
- **WalletProvider**: A record describing one supported wallet (e.g. MetaMask, Coinbase Wallet, WalletConnect). Contains id, display name, icon, install URL, and detection logic.
- **ProviderRow**: A single row inside the modal representing one WalletProvider and its current ProviderStatus.
- **ProviderStatus**: The runtime state of a WalletProvider — one of: `detected`, `not-installed`, `unavailable`, `connecting`, `error-rejected`, `error-timeout`.
- **WalletConnectionContext**: The external React context/hook that owns persistent wallet state and exposes connect/cancel/reset callbacks. Not defined in this spec.
- **FocusTrap**: The mechanism that confines keyboard focus to the modal while it is open.
- **aria-live Region**: An ARIA live region inside the modal that announces dynamic state changes to screen readers without a full page reload.
- **WebView**: A mobile in-app browser context (e.g. inside Twitter/X, Instagram, Facebook apps) where injected Web3 providers behave differently or are absent.
- **TouchTarget**: The minimum tappable area for an interactive element — 44×44 CSS pixels per WCAG 2.5.5.
- **WCAG_AA**: Web Content Accessibility Guidelines 2.1 Level AA — the non-negotiable conformance target for this component.

---

## Requirements

### Requirement 1: Modal Lifecycle and Controlled Behaviour

**User Story:** As a developer integrating the Connect Wallet Modal, I want a pure controlled component driven by props so that I can manage open/close state from outside the modal without internal side effects leaking into the host application.

#### Acceptance Criteria

1. THE ConnectWalletModal SHALL accept an `isOpen` boolean prop that controls whether the modal is rendered and visible.
2. THE ConnectWalletModal SHALL accept an `onClose` callback prop that is invoked when the user dismisses the modal via the close button, Escape key, or backdrop click.
3. THE ConnectWalletModal SHALL accept a `providers` prop — an array of WalletProvider records — that fully determines which ProviderRows are rendered.
4. THE ConnectWalletModal SHALL accept an `onConnect` callback prop invoked with the selected WalletProvider id when a user initiates a connection attempt.
5. THE ConnectWalletModal SHALL accept an `onCancel` callback prop invoked with the WalletProvider id when a user cancels an in-progress connection.
6. THE ConnectWalletModal SHALL accept a `connectingProviderId` string-or-null prop that marks which provider, if any, is currently in the connecting state.
7. THE ConnectWalletModal SHALL accept an `errorState` prop — null or an object containing `providerId`, `type` (`'rejected'` | `'timeout'`), and `message` — that marks which provider is in an error state and why.
8. THE ConnectWalletModal SHALL accept an `onRetry` callback prop invoked with the WalletProvider id when the user triggers a retry from an error state.
9. WHEN `isOpen` is `false`, THE ConnectWalletModal SHALL not mount or render any DOM nodes.
10. THE ConnectWalletModal SHALL NOT store wallet connection state internally — all state is owned by the parent via the props defined in criteria 1–8.

---

### Requirement 2: Provider Row — Detected/Installed State

**User Story:** As a user whose wallet extension is already installed, I want to see a clearly labelled connect button next to my wallet so that I can connect with one click.

#### Acceptance Criteria

1. WHEN a WalletProvider has status `detected`, THE ProviderRow SHALL render the provider's display name, descriptive icon alt text, and an enabled "Connect" button.
2. WHEN the "Connect" button is activated, THE ProviderRow SHALL invoke the `onConnect` callback with the provider's id.
3. THE ProviderRow "Connect" button SHALL meet the 44×44 CSS pixel minimum TouchTarget requirement.
4. THE ProviderRow icon SHALL include descriptive alt text equal to `"{provider name} wallet icon"` when the icon is an image element.
5. WHERE the provider icon is decorative (inline SVG used purely for visual branding alongside a visible text label), THE ProviderRow SHALL mark the icon with `aria-hidden="true"`.

---

### Requirement 3: Provider Row — Not Installed State

**User Story:** As a user who does not have a wallet extension installed, I want to see a clearly labelled install link so that I can download the wallet without dark patterns or confusion.

#### Acceptance Criteria

1. WHEN a WalletProvider has status `not-installed`, THE ProviderRow SHALL render the provider's display name, icon, a visually disabled connect button, and a clearly labelled external install link.
2. THE ProviderRow install link SHALL open the provider's official install URL in a new tab using `target="_blank"` and `rel="noopener noreferrer"`.
3. THE ProviderRow install link SHALL include an accessible label of the form `"Install {provider name} — opens in a new tab"` via `aria-label`.
4. THE ProviderRow disabled connect button SHALL have `disabled` attribute set and `aria-disabled="true"` so screen readers announce the unavailable state.
5. THE ProviderRow install URL SHALL be a statically verified official URL for the provider (e.g. `https://metamask.io/download/`) and SHALL NOT point to third-party redirect domains.

---

### Requirement 4: Provider Row — Unavailable State

**User Story:** As a user in a WebView or restricted browser context, I want a clear, non-alarming explanation of why a wallet cannot be used so that I know to open the link in a standard browser.

#### Acceptance Criteria

1. WHEN a WalletProvider has status `unavailable`, THE ProviderRow SHALL render the provider's display name, icon, and a non-alarming explanatory message.
2. THE ProviderRow unavailability message SHALL include guidance directing the user to open the page in a standard browser.
3. THE ProviderRow SHALL NOT show a connect button or install link when status is `unavailable`.
4. WHILE rendering in a WebView context where the injected provider is absent or restricted, THE ConnectWalletModal SHALL display `unavailable` status for affected providers rather than crashing or rendering an empty row.

---

### Requirement 5: Provider Row — Connecting (In-Progress) State

**User Story:** As a user who has initiated a wallet connection, I want to see a spinner and a Cancel button so that I know the app is waiting for my wallet and can abort if needed.

#### Acceptance Criteria

1. WHEN `connectingProviderId` matches a WalletProvider id, THE ProviderRow for that provider SHALL render a loading spinner, the provider name, and an enabled "Cancel" button.
2. WHEN the "Cancel" button is activated, THE ProviderRow SHALL invoke the `onCancel` callback with the provider id.
3. THE ConnectWalletModal aria-live region SHALL announce `"Connecting to {provider name}…"` when the connecting state begins.
4. THE ProviderRow spinner SHALL be marked with `aria-hidden="true"` and the spinner container SHALL include a visually hidden `<span>` with accessible text `"Connecting…"`.
5. THE ProviderRow "Cancel" button SHALL meet the 44×44 CSS pixel minimum TouchTarget requirement.

---

### Requirement 6: Provider Row — Error: Rejected State

**User Story:** As a user who dismissed my wallet's connection prompt, I want to see a recoverable error message and a Try Again button so that I can retry without reopening the modal.

#### Acceptance Criteria

1. WHEN `errorState.type` is `'rejected'` and `errorState.providerId` matches a WalletProvider id, THE ProviderRow for that provider SHALL render an error message and a "Try Again" button.
2. THE ProviderRow error message SHALL include human-readable copy indicating the user dismissed the wallet prompt (e.g. "Connection was declined. Try again?").
3. WHEN the "Try Again" button is activated, THE ProviderRow SHALL invoke the `onRetry` callback with the provider id.
4. THE ConnectWalletModal aria-live region SHALL announce the error message text when the rejected error state becomes active.
5. THE ProviderRow "Try Again" button SHALL meet the 44×44 CSS pixel minimum TouchTarget requirement.

---

### Requirement 7: Provider Row — Error: Timeout State

**User Story:** As a user whose wallet connection exceeded the time threshold, I want to see a clear timeout message and a Try Again button so that I can retry the connection.

#### Acceptance Criteria

1. WHEN `errorState.type` is `'timeout'` and `errorState.providerId` matches a WalletProvider id, THE ProviderRow for that provider SHALL render a timeout error message and a "Try Again" button.
2. THE ProviderRow timeout message SHALL include human-readable copy indicating the connection timed out (e.g. "Connection timed out. Try again?").
3. WHEN the "Try Again" button is activated, THE ProviderRow SHALL invoke the `onRetry` callback with the provider id.
4. THE ConnectWalletModal aria-live region SHALL announce the timeout message text when the timeout error state becomes active.
5. THE ProviderRow "Try Again" button SHALL meet the 44×44 CSS pixel minimum TouchTarget requirement.

---

### Requirement 8: Empty State — No Providers Detected

**User Story:** As a user with no wallet extensions installed, I want to see a helpful empty state with install links for all supported wallets so that I know what to install and where.

#### Acceptance Criteria

1. WHEN the `providers` array contains no WalletProvider with status `detected`, AND no provider has status `connecting` or an active `errorState`, THE ConnectWalletModal SHALL render a dedicated empty state view.
2. THE ConnectWalletModal empty state SHALL display a heading, explanatory copy, and a list of install links — one per supported WalletProvider in the `providers` array.
3. EACH install link in the empty state SHALL follow the same labelling and security requirements as the not-installed ProviderRow install link (Requirement 3, criteria 2–5).
4. THE ConnectWalletModal empty state SHALL NOT crash or render an error when the `providers` array is empty.

---

### Requirement 9: Accessibility — Dialog Structure and ARIA

**User Story:** As a screen reader user, I want the modal to follow the ARIA dialog pattern so that I can navigate and understand it without visual context.

#### Acceptance Criteria

1. THE ConnectWalletModal SHALL render with `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the modal title element id, and `aria-describedby` pointing to a descriptive subtitle element id.
2. THE ConnectWalletModal SHALL include a single visible title element (e.g. "Connect Wallet") referenced by `aria-labelledby`.
3. THE ConnectWalletModal SHALL include an `aria-live` region with `aria-atomic="true"` that announces state changes — connecting start, error onset, and cancellation — to screen readers without a full page reload.
4. ALL interactive elements within the ConnectWalletModal (buttons, links) SHALL have visible focus indicators meeting a 3:1 contrast ratio against adjacent colours.
5. THE ConnectWalletModal close button SHALL have an `aria-label` of `"Close Connect Wallet dialog"`.

---

### Requirement 10: Accessibility — Focus Management

**User Story:** As a keyboard-only user, I want focus to be trapped inside the modal and restored to the trigger element on close so that I do not lose my place in the page.

#### Acceptance Criteria

1. WHEN the ConnectWalletModal opens, THE ConnectWalletModal FocusTrap SHALL move focus to the first focusable element inside the dialog.
2. WHILE the ConnectWalletModal is open, THE ConnectWalletModal FocusTrap SHALL prevent Tab and Shift+Tab from moving focus outside the dialog boundary.
3. WHEN the ConnectWalletModal closes (via any dismissal mechanism), THE ConnectWalletModal SHALL restore focus to the element that was focused immediately before the modal opened.
4. WHEN the Escape key is pressed while the ConnectWalletModal is open, THE ConnectWalletModal SHALL invoke `onClose`.
5. WHEN the modal backdrop is clicked, THE ConnectWalletModal SHALL invoke `onClose`.

---

### Requirement 11: Responsive Behaviour and Touch

**User Story:** As a mobile user, I want the modal to display and function correctly on small viewports and touch devices so that I can connect my wallet from any device.

#### Acceptance Criteria

1. THE ConnectWalletModal SHALL render correctly across viewport widths from 320px to 1440px without horizontal scrolling or clipped content.
2. ALL interactive elements (buttons and links) within the ConnectWalletModal SHALL meet the 44×44 CSS pixel minimum TouchTarget requirement.
3. WHILE the ConnectWalletModal is open, THE ConnectWalletModal SHALL prevent the page body from scrolling behind the modal overlay.
4. WHEN rendered on a viewport narrower than 768px, THE ConnectWalletModal dialog SHALL occupy the full available width with appropriate horizontal padding.
5. WHEN rendered in a WebView where the viewport or injected provider behaves differently, THE ConnectWalletModal SHALL render without JavaScript errors or blank content.

---

### Requirement 12: De-duplication of Providers

**User Story:** As a developer, I want the modal to deduplicate providers so that the same wallet is never listed twice, even if multiple injected providers report the same identity.

#### Acceptance Criteria

1. THE ConnectWalletModal SHALL render exactly one ProviderRow per unique WalletProvider id in the `providers` prop array.
2. WHEN the `providers` array contains duplicate WalletProvider records with the same id, THE ConnectWalletModal SHALL render only the first occurrence and silently discard duplicates.
3. THE ConnectWalletModal SHALL NOT crash, throw, or render duplicate rows when duplicate provider ids are supplied.

---

### Requirement 13: Motion and Visual Accessibility

**User Story:** As a user who has enabled the operating system "reduce motion" preference, I want the modal's animations to be suppressed so that I am not affected by distracting or harmful motion.

#### Acceptance Criteria

1. THE ConnectWalletModal SHALL include an entrance animation (fade-in / slide-up) for the dialog panel when it opens.
2. WHERE the user has set `prefers-reduced-motion: reduce`, THE ConnectWalletModal SHALL suppress all entrance and state-transition animations.
3. THE ConnectWalletModal connecting spinner SHALL be suppressed or replaced with a static indicator WHERE `prefers-reduced-motion: reduce` is active.
