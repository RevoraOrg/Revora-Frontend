# Redemption Window Post-Close Summary Banner

This component provides a summary banner for investors after a redemption window has closed.

## Design

The banner includes:
- **Heading**: "Redemption Window Closed"
- **Summary Chips**: Displays total redeemed and the user's specific share.
- **CTA**: "View Detailed Report" link.
- **Auto-dismissal**: The banner automatically dismisses after 30 days from the closure date.

## Accessibility

- WCAG 2.1 AA compliant.
- Responsive layout: chips stack on mobile.
- `role="region"` with `aria-labelledby` for screen reader announcement.
- Keyboard accessible dismissal.

## Usage

```tsx
<RedemptionPostCloseBanner
  totalRedeemed={500000}
  userShare={25000}
  reportLink="/detailed-report"
  onDismiss={() => ...}
  closedAt="2026-07-28T12:00:00Z"
/>
```
