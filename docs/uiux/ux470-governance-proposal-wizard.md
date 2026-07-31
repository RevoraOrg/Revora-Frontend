# [UI/UX Design] Design the Governance Proposal Creation Multi-Step Form

## Issue #470 Specification

This document defines the high-fidelity UI/UX design, accessible interactions, responsive layouts, validation mechanics, and system behaviors for the **Governance Proposal Creation Multi-Step Form** wizard inside the Revora Platform.

---

## 1. Design Tokens, Typography, and Palette

The proposal wizard utilizes Revora's existing dark-mode design system token rules (`src/index.css`) to ensure visual continuity. No extraneous colors or elements are introduced.

### Color Palette Utilization
- **Primary / Focus Outline**: `#3b82f6` (`var(--primary)`)
- **Success / Completed Status**: `#10b981` (`var(--success)`)
- **Error / Failure Alert**: `#ef4444` (`var(--error)`)
- **Warning / Offline Status**: `#f59e0b` (`--rc-status-due` / custom warning gold)
- **Primary Text**: `#e5e7eb` (`var(--text-main)`)
- **Muted Label / Helper Text**: `#cbd5e1` (`var(--text-muted)`)
- **Accent Highlighting**: `#38bdf8` (`var(--text-accent)`)
- **Surfaces**: Glassmorphic slate wrappers with blur (`var(--glass-bg)`, `var(--glass-border)`, `var(--glass-blur)`)

### Typography Hierarchy
- **Section Headers**: `var(--font-size-2xl)` (24px), Semi-Bold / Bold.
- **Card Subheadings / Group Titles**: `var(--font-size-lg)` (18px) or `var(--font-size-base)` (16px), Medium / Semi-Bold.
- **Form Labels & Value Text**: `var(--font-size-sm)` (14px), Medium.
- **Caption & Micro-feedback**: `var(--font-size-xs)` (12px), Normal weight.

---

## 2. Interactive Flow & Stepper Design

The workflow structures proposal creation into four logical stages. Users navigate sequentially but can jump backwards to previously completed steps.

```
Proposal Draft
   ↓
[ Step 1: Title & General Info ]
   ↓
[ Step 2: Abstract & Detailed Description ]
   ↓
[ Step 3: Action Builder (On-Chain Commands) ]
   ↓
[ Step 4: Live Preview & Submission ]
```

### Accessible Horizontal Stepper Chrome

The stepper is constructed as a semantic `<nav aria-label="Proposal steps">` element. Each step represents an interactive dot with full ARIA state tracking:

```
 ① Title  =======[✓]=======  ② Abstract  =======[✓]=======  ③ Actions  ============  ④ Preview
```

- **Active State**: Highlighted border (`var(--primary)`), distinct glowing background (`rgba(59, 130, 246, 0.15)`), and `aria-current="step"`.
- **Completed State**: Highlighted green checkmark or border (`var(--success)`), glowing background (`rgba(16, 185, 129, 0.15)`), indicating the step satisfies validation.
- **Incomplete / Disabled State**: Dimmed borders (`var(--glass-border)`), muted grey label, un-clickable until prerequisite stages are valid.

---

## 3. Responsive Page Layout

The layout transitions dynamically between side-by-side split screens on desktop to clean vertical stacks on mobile to optimize editing versus reviewing focus.

### Desktop Layout Structure (Width ≥ 1024px)
A 12-column grid divides the page:
- **Left Column Area (7 Cols)**: Core step-specific form input, rich-text controls, or action builder lists.
- **Right Column Area (5 Cols)**: **Live Preview Container**. It mirrors the full proposal details in real time, serving as a feedback loop.

```
+-----------------------------------------------------------------------------------------+
| [Header] Create Governance Proposal                              (● Saved 10s ago)      |
| [Stepper]   (1) Title  =======[✓]=======  (2) Abstract  ============  (3) Actions       |
+-----------------------------------------------------------------------------------------+
| FORM CARD AREA (7 Cols)                    | LIVE PREVIEW PANEL (5 Cols)                |
|                                            |                                            |
| Step 2: Abstract                           | +----------------------------------------+ |
| [ B ] [ I ] [ H1 ] [ H2 ] [•] [1.] [🔗]    | | Active • 7d remaining                  | |
| +----------------------------------------+ | | Proposer: 0x1234...                    | |
| | This is my main detailed proposal...   | | |                                        | |
| |                                        | | | ## Executive Summary                   | |
| |                                        | | | This is my main detailed proposal...   | |
| +----------------------------------------+ | +----------------------------------------+ |
|                                            |                                            |
+-----------------------------------------------------------------------------------------+
| [Cancel]                                                 [Back]  [Next / Submit Proposal] |
+-----------------------------------------------------------------------------------------+
```

### Mobile Layout Structure (Width < 1024px)
To preserve vertical real estate:
- Stepper labels collapse, leaving just numerical icons.
- **Form Card** fills the screen width.
- **Live Preview** is housed inside an expandable accordion wrapper (`<details>` or a button toggle):
  - **Collapsed State**: Displays a summary pill ("Show Live Preview (Click to expand)").
  - **Expanded State**: Slides out or expands inline to avoid disorienting page jumps.

---

## 4. Autosave Affordance & Status Chips

Draft safety is managed by automatic persistence into browser `localStorage` or remote database. An interactive **Autosave Chip** is anchored in the page header next to the main title.

### Visual States & Behavior

| Status | Icon / Element | Token Color | Screen Reader Announcement (`aria-live="polite"`) | Description |
|---|---|---|---|---|
| **Saving** | Spinning loader | Primary Blue | "Saving draft..." | Triggered 800ms after user stops typing. |
| **Saved** | Checkmark | Success Green | "Draft saved successfully" | Confirms changes are stored. Displays timestamp. |
| **Offline** | Disconnected plug | Warning Yellow | "Offline mode. Saving locally." | Detects `navigator.onLine === false`. Saves to local cache. |
| **Save failed** | Warning triangle | Error Red | "Save failed. Retry connection." | Triggered by write errors or API timeouts. Shows a retry button. |
| **Unsaved changes**| Bullet indicator | Neutral Slate | "Unsaved changes" | Active while typing before the debounce timer initiates. |

### Transitions
The chip transitions smoothly using CSS opacity and translate fades (`0.2s ease`).

---

## 5. Step-by-Step UI Specifications

### Step 1: Title & General Information
Focuses on indexing metadata.
- **Proposal Title**: Single-line text input. Length rules: `3` to `200` characters. Exceeding characters triggers an inline warning.
- **Proposal ID (Optional)**: Short alpha-numeric field to match legacy governance numbering schemes.
- **Category**: Custom accessible dropdown (e.g., *Treasury, Protocol Upgrade, Grants, Core Change*).
- **Tags**: Multi-input pill list. User types a tag and presses `Enter` or `,` to wrap the tag into a chip.

#### Field Validation Indicators:
- **Title Empty**: Focus outline defaults to grey. Label shows warning helper text. "Next" button disabled.
- **Title Too Short**: Displays "Title must be at least 3 characters long."
- **Title Too Long**: Hard limit at 200. Character counter turns red (`var(--error)`).

---

### Step 2: Abstract & Rich-Text Description
The description body accepts formatted content to optimize readability.

- **Simulated Rich-Text Editor Component**:
  - Includes a formatting toolbar with keyboard shortcuts and focus states for formatting tokens:
    - `H1` / `H2` (Headings)
    - **Bold** / *Italic*
    - Bulleted / Numbered Lists
    - Hyperlinks
  - Fully accessible using keyboard commands (Tabbing through format controls, each with `aria-label`).
- **Interactive Character and Word Counter**:
  - Live indicators positioned under the editor container: `Characters: 124 / 2000` | `Words: 24`.
  - Minimum length: 10 characters. Maximum length: 2000 characters.
- **Inline Draft Saved Indicator**: Small badge within the card footer confirms local buffer storage.

---

### Step 3: Dynamic Action Builder
This is the core execution surface where proposal creators bind live smart contract commands.

#### Row Specification & Anatomy
Each execution row represents a separate transaction executed sequentially upon proposal success.
```
+----------------------------------------------------------------------------------------+
| Action #1  [ Treasury Transfer ▼ ]                                        [::] [📋] [✕] |
+----------------------------------------------------------------------------------------+
|  Target Account: [ 0x71C7656E...8976F                      ]  (✓ Valid Address)        |
|  Value (Tokens): [ 150000                                  ]                           |
+----------------------------------------------------------------------------------------+
```

1. **Reordering Affordances**: Standard reordering buttons (Up/Down) paired with intuitive keyboard commands (e.g., `Alt + Up/Down` or button clicks with instant screen-reader notifications like "Action 1 moved to position 2").
2. **Duplicate Button**: Clones all values of the selected row and appends it directly underneath.
3. **Delete Button**: Discard trash-can icon. Completely hidden if only one action remains, or replaced with an **Empty State Illustration**.
4. **Action Type Dropdown**: Extensible select supporting:
   - *Treasury Transfer* (Target Account, Value/Token)
   - *Contract Call* (Target Account, Function Signature, Calldata Arguments)
   - *Parameter Update* (Parameter Key, Target Value)
   - *Role Change* (Account, Target Role, Permission Flag)
   - *Token Mint* (Recipient Account, Token Amount)
   - *Token Burn* (Source Account, Token Amount)
   - *Custom Action* (Payload bytes, target)

#### Action Validation UX (Referenced Accounts)
Each target or account address input performs asynchronous on-chain or registry lookup:
- **Valid account**: Displays green check icon and verified moniker (e.g. `✓ Core Treasury DAO`).
- **Unknown account**: Displays yellow warning badge: `⚠ Address not found in directory. Ensure on-chain accuracy.`
- **Malformed address**: Red error boundary: `✕ Malformed cryptographic hash address. Must be a valid hex string.`
- **Duplicate account**: Warns when the same address receives multiple transfers in a single block.
- **Network lookup pending**: Displays localized shimmering loader next to the input.
- **Network unavailable**: Gray outline: `○ Node lookup timed out. Direct validation skipped.`

---

### Step 4: Live Preview Page
Renders a flawless replica of the final proposal Detail Page, ensuring the author sees precisely what delegates will see.

- **Status Banner**: Displays `[DRAFT / PREVIEW]` tag with timeline metrics (e.g., *Starts on submission • Active for 7 days*).
- **Author Identity Card**: Displays current wallet user avatar and ENS/address moniker.
- **Metadata Grid**:
  - Category tag.
  - Optional ID badge.
  - Action summary counting defined operations.
- **Action Execution Timeline**: Lists each compiled action block with semantic icons representing Token Transfers, Upgrades, or Role Modifications.

---

## 6. Global Navigation and Exit Warnings

A sticky navigation bar is fixed at the page bottom:

1. **Secondary Cancel Button**: Asks to leave page.
2. **"Save Draft" Action**: Triggers instant manual database synchronization.
3. **Primary Back / Next Button Pair**: Progresses through steps 1-4.
4. **Primary Submit Proposal Button**: Replaces "Next" on Step 4. Triggers final on-chain staging.

### Unsaved Changes Protection Modal
If the form has unsaved edits, navigating away via breadcrumbs, browser back, or cancel triggers a modal dialog:
- **Title**: `Unsaved changes`
- **Description**: `You have unsaved changes. Discarding them will delete this proposal draft.`
- **Options**:
  - `Discard changes` (Red color, secondary hierarchy)
  - `Stay on page` (Standard focus outline, primary default)
  - `Save & Exit` (Triggers draft save then redirects)

---

## 7. Accessibility Checklist (WCAG 2.1 AA)

- **Semantic Keyboard Layout**: All form inputs, rich-text toggles, and step bullets have clear focus boundaries.
- **Focus Trap / Modal Dialogs**: The Unsaved Warning Modal traps focus and restores it upon closing.
- **No Color-Only Cues**: Address validators and error banners pair colors with text labels (`Error`, `Valid`) and robust SVG icons to remain understandable under grey-scale or visual impairments.
- **Responsive Touch Targets**: Buttons and dropdown menus have a minimum interaction size of `44px x 44px`.
- **Reduced Motion**: Disables wizard slides or spinner transitions if `@media (prefers-reduced-motion: reduce)` is true.
