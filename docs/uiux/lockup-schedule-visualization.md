# Design Specification & System Documentation: Lockup Cliff-and-Vesting Visualization

## 1. Overview
The **Lockup Cliff-and-Vesting Visualization** is a comprehensive financial dashboard component designed to help investors immediately understand their token allocation, cliff milestone, vesting progression, and upcoming unlocks.

Rather than relying on color or technical jargon alone, this design blends pure mathematical precision (using SVG step coordinates) with redundant visual cues (shapes, outlines, labels, and borders) to deliver a world-class, accessible, and native-feeling interface on both desktop and mobile devices.

---

## 2. Page Anatomy & Layout
### Desktop Layout
- **Token Lockup Schedule Header**: Brief contextual introduction with a demo scenario switcher allowing development/verification across all 10 edge cases.
- **Progress Summary Cards**: A grid of 6 cards showing:
  1. *Total Allocated*: Total tokens originally assigned.
  2. *Total Unlocked*: Cumulative tokens unlocked and claimable to date.
  3. *Remaining Locked*: Outstanding tokens locked in contract.
  4. *Vesting Progress %*: Progress fill bar depicting percentage unlocked.
  5. *Next Unlock*: Token amount and release date.
  6. *Vesting End Date*: Ultimate contract completion date and frequency indicator.
- **Vesting Progress Panel**:
  - Horizontal timeline track.
  - Cumulative area chart.
  - Interactive details legend.
- **Vesting Unlock Events Table**: Semantic tabular list of all unlock events with column-based sorting.
- **Design & Anatomy Notes**: Built-in developer/reviewer reference documenting design treatments and WCAG compliance.

### Mobile Layout
- **Progress Cards**: Responsive grid wrapping into 2 columns.
- **Visualization Panel**: Horizontal scrolling container (`overflow-x: auto` with a minimum content width of 650px) preventing visual squishing and preserving timeline-to-chart coordinate alignment on touch devices.
- **Unlock Events Table**: Scrollable responsive table with touch target sizes ≥ 44px.

---

## 3. Detailed Component Designs

### A. Horizontal Timeline Component
- **Description**: Represents the entire vesting timeline from the Start Date to the End Date.
- **Visuals**:
  - Track: Background timeline line. Completed portion is highlighted in solid emerald green (`var(--success)`); future portion remains muted slate.
  - Start/End Dates: Labeled on both sides.
  - Today Indicator: Intersects the timeline as a dashed sky-blue line with a solid sky-blue badge labeled `TODAY` on top.

### B. Cliff Marker
- **Description**: The cliff is a critical event when the investor transitions from having 0% claimable to their first batch of unlocked tokens.
- **Treatment**:
  - Symbol: Solid red triangle (`▲`) pointing upwards.
  - Label: Placed directly above the triangle labeled `▲ Cliff`.
  - Tooltip: Prominent indicator "Nothing unlocks before this date."
  - **Design Decision**: A warning red triangle was selected to instantly convey a strict legal cliff gate to non-technical users.

### C. Unlock Tick Markers
- **Description**: Individual release points representing periodic distribution events (daily, monthly, quarterly).
- **Interactions**:
  - Touch Target: Enclosed in a transparent 44px by 44px clickable target (`.lsp-tick-target`) for mobile compatibility.
  - Completed state: Solid green circle (`var(--success)`).
  - Future state: Hollow circle with blue border (`var(--primary)`).
  - Hover & Focus: Scales up by 1.3x with standard blue outer shadows and triggers the popover.

### D. Cumulative Area Chart
- **Description**: Shaded region showing cumulative unlocked token percentages directly aligned with timeline dates.
- **Visuals**:
  - Coordinates: Uses exact mathematical step-functions rather than curved splines to reflect discrete unlock intervals correctly.
  - Gradients: Filled with a vertical transition gradient (`unlockedGradient` from emerald-500 down to transparent).
  - Axis labels: Muted gridlines at 25%, 50%, 75%, and 100% with WCAG AA compliant contrast colors.

### E. Unlock Event Popovers
- **Description**: Overlay appearing on hover or focus of any tick button.
- **Metrics shown**:
  - Release Title (e.g. *Monthly Vesting #4*)
  - Unlock Date (e.g. *Jul 1, 2026*)
  - Tokens Unlocked (e.g. *250,000 REV*)
  - Unlock % (e.g. *25%*)
  - Cumulative Unlocked (e.g. *25%*)
  - Remaining Locked (e.g. *75%*)
- **Focus Rule**: Keyboard-focusable so screen readers announce detailed attributes automatically.

### F. Accessible Table Alternative
- **Description**: Standard, screen-reader friendly data table alternative.
- **Columns**: Date, Event Label, Tokens Unlocked, Unlock %, Cumulative Unlocked, Remaining Locked, Status.
- **Sorting**: Toggle buttons on headers (Date, Amount, Status) with visual up/down chevrons.

---

## 4. Accessibility (WCAG 2.1 AA Compliance)
- **Keyboard Navigation**: All timeline ticks and table headers are completely keyboard focusable with visible focus rings.
- **No Color-Only Information**: Uses triangles, hollow vs. solid circles, dashed lines, and textual labels to communicate meaning.
- **Semantic HTML**: Fully semantic layout featuring landmarks, standard headings (`<h1>`, `<h2>`, `<h3>`), and table elements (`<table>`, `<th> scope="col"`, `<td>`).
- **Contrast**: Text contrast ratios meet or exceed 4.5:1 (using `--text-muted` on dark glassmorphic surfaces).

---

## 5. Edge Case Specifications & Skeletons
- **10-Year Monthly Vesting**: Handled via horizontal scroll wrapper on smaller widths and compact vertical list to prevent rendering lag.
- **Daily Vesting**: Handled by rendering down-sampled chart steps while maintaining the full sortable table list.
- **No Cliff / Large Cliff**: Configured gracefully; if no cliff, the red triangle is omitted, and steps start immediately.
- **Today Positions**: Dynamic; Today line shifts left/right based on current unix offset relative to start and end epochs.
- **Loading Skeleton state**: Renders beautiful layout placeholders representing cards, timeline, and charts using an animated vertical light-sweep effect.
