# UX77: Investor Discovery Offering Cards

## Scope
UI/UX redesign for offering cards in `InvestorDiscovery`, focused on faster investor scanning and comparison.

## Card Structure
1. Header zone: logo mark, sector, and offering name.
2. Body zone: revenue-share percentage and funding target as paired comparison metrics.
3. Progress zone: raised amount, visible percentage label, and accessible progressbar semantics.
4. Footer zone: primary prospectus CTA.

## Design System Notes
- Reuses `glass-card` and `glass-card-interactive` for the card shell.
- Funding progress uses `--primary` for the fill and `--funding-bar-track` for the track.
- Interactive states are defined for hover, keyboard focus via `:focus-within`, and pressed feedback.
- Muted text continues to use `--text-muted`, which is tuned for AA contrast on the dark glass surface.

## Responsive Assumptions
- One column on small screens.
- Two columns at medium widths.
- Three columns at extra-large widths.
- Long startup names wrap within the header without changing the card controls or progress layout.

## Accessibility Notes
- Each funding bar exposes `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
- The visible percentage label mirrors the progress value for users scanning visually.
- CTA focus remains in normal keyboard order after the card content.
- Decorative logo marks and CTA icons are hidden from assistive technology.

## Edge Cases Covered
- Funding values support 0% through 100% because the fill width is derived directly from the numeric progress value.
- 100% progress remains rounded and visible within the tokenized track.
- Cards retain clear comparison zones with long names and different target values.
