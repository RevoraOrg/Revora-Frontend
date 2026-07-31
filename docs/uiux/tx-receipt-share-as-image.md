# Transaction Receipt Share-as-Image

## Issue #481

A share-as-image affordance that generates a compact receipt image with issuer branding for sharing via chat or social media.

## Purpose

Users often want to share a receipt image via chat or social platforms. This component provides a robust, accessible, and privacy-aware mechanism to generate, copy, and download receipt images.

## Key Features

### Aspect Ratio Selection
- **Compact card** — Natural-flow card layout; fits most chat previews
- **Square (1:1)** — Optimized for social media platforms (Instagram, Twitter cards)
- **Wide banner (16:9)** — Suitable for header images, Twitter banners, or wide previews

### Privacy Controls
- **Hide Amount Toggle** — Masks the transaction amount with bullet characters when enabled. The hidden state is reflected in the generated image.
- **Sensitive Field Protection** — Sender and recipient wallet addresses are marked as `user-select: none` to prevent accidental text copying from the receipt card surface.

### Image Generation
- Powered by `html2canvas` at 2x resolution for retina-quality output
- White background for consistent appearance across platforms
- Captures the card exactly as rendered (respecting aspect ratio, hidden amount state)
- CORS-compatible for external issuer logos

### Export Options
- **Copy Image to Clipboard** — Uses `ClipboardItem` API with PNG blob. Falls back gracefully to a file download when the clipboard API is unavailable or blocked.
- **Download as PNG** — Triggers a browser download with a sanitized filename derived from the transaction ID.

### Accessibility (WCAG 2.1 AA)
- `role="toolbar"` on the control bar with accessible labels
- `role="region"` on the receipt card with descriptive `aria-label`
- `role="status"` and `aria-live="polite"` on toast notifications
- `aria-pressed` on toggle buttons (hide amount, aspect ratio)
- `aria-busy` on action buttons during image generation
- All interactive elements are keyboard-navigable with visible focus rings
- Screen-reader-only live region (`sr-only`) mirrors toast messages
- Validated with `jest-axe` — zero violations across all states

### Responsive Design
- Stacks controls vertically on narrow viewports (< 480px)
- Hides button text on very narrow viewports (< 380px) while preserving icons
- Aspect ratio constraints relax on mobile to prevent content clipping

### RTL Support
- Uses CSS logical properties (`inset-inline-end`, `text-align: end/start`)
- Button icons are mirrored only when directionally significant
- Amounts remain centered in both LTR and RTL

### Reduced Motion
- No forced animations defined — respects `prefers-reduced-motion: reduce`
- Toast entrance animation is disabled
- All transition durations are eliminated

### Forced Colors (Windows High Contrast)
- Explicit borders preserved via `forced-colors: active` media query
- Primary buttons use system `Highlight` color
- Focus rings use system `Highlight` color

## Component API

```tsx
export interface TransactionReceiptShareProps {
  issuerName?: string;           // Default: "Revora"
  issuerLogoUrl?: string;        // Optional logo for branding
  transactionId: string;         // Unique transaction identifier
  explorerUrl?: string;          // Optional block explorer URL
  transactionHash?: string;      // On-chain transaction hash
  date: string;                  // Formatted date string
  amount: number | string;       // Transaction amount
  currency: string;              // Currency code (e.g. "USDC")
  status: 'completed' | 'pending' | 'failed';
  senderWallet: string;          // Copy-disabled in image
  recipientWallet: string;       // Copy-disabled in image
  memo?: string;                 // Optional memo/note
}
```

## Usage

```tsx
import { TransactionReceiptShare } from './components/StatusTimeline';

<TransactionReceiptShare
  transactionId="TX-12345"
  date="Oct 24, 2023 14:30"
  amount="1,500.00"
  currency="USDC"
  status="completed"
  senderWallet="0x123...abc"
  recipientWallet="0x456...def"
  issuerName="Revora"
  issuerLogoUrl="https://cdn.revora.io/logo.png"
  transactionHash="0xdeadbeef..."
  explorerUrl="https://stellar.expert/explorer/public/tx/0xdeadbeef"
  memo="Invoice #42"
/>
```

## Edge Cases Covered

| Scenario | Handling |
|----------|----------|
| Missing issuer logo | Renders only issuer name (no broken image) |
| Very long wallet addresses | `word-break: break-all` with `max-width` constraint |
| Very long transaction IDs | Same overflow handling as wallets |
| Empty memo | Memo row is not rendered |
| Clipboard API unavailable | Silently falls back to file download with info toast |
| `html2canvas` fails | Error toast is displayed; buttons re-enabled |
| RTL text direction | Logical CSS properties handle layout inversion |
| Print (A4 / US Letter) | `@media print` hides controls, flattens card, preserves content |
| Forced-colors mode | Borders, focus rings, and primary button use system colors |

## File Structure

```
src/components/StatusTimeline/
├── TransactionReceiptShare.tsx    # Component
├── TransactionReceiptShare.css    # Styles
├── TransactionReceiptShare.test.tsx # Tests
└── index.ts                       # Exports
```

## Dependencies

- `html2canvas` (^1.4.1) — Image generation
- `lucide-react` (^1.7.0) — Icons

## Testing

- **Test framework:** Vitest + React Testing Library
- **Coverage target:** ≥95%
- **Accessibility:** jest-axe with zero violations
- **Test file:** `TransactionReceiptShare.test.tsx` with ~45+ test cases covering:
  - Rendering with all prop combinations
  - Aspect ratio switching
  - Hide amount toggle
  - Download image generation
  - Copy to clipboard (success + fallback)
  - Toast lifecycle (display, auto-dismiss, manual dismiss)
  - Accessibility (axe validation across all states)
  - RTL rendering
  - Sensitive field protection
  - Edge cases (long strings, missing optional props, all statuses)

## Before/After

### Before (original implementation)
- Single "compact card" layout only
- Used `window.alert()` for copy feedback
- No RTL support
- No forced-colors support
- No aspect ratio options
- No toast notification system
- Limited test coverage (~18 tests)

### After (Issue #481)
- Three aspect ratios: compact, square, wide
- Accessible toast notification system with auto-dismiss
- Full RTL support via CSS logical properties
- Forced-colors and reduced-motion support
- Aspect ratio selector with visual feedback
- Screen-reader announcements via live region
- ~45+ comprehensive tests with axe validation
