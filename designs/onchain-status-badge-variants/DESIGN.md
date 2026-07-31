# Design Specification: On-Chain Status Badge Variants

**Issue**: RevoraOrg/Revora-Frontend#478
**Type**: UI/UX Design | **Status**: Specification
**Designer**: @laurentketterle-hub (Stellar Wave 7th Wave)

## 1. Overview

Blockchain operations go through multiple states between submission and finality. Users need clear, at-a-glance feedback. This design defines 3 On-Chain Status Badge variants: Pending, Retrying, and Confirmed, with multiple sub-states each.

## 2. Badge Variants

### Pending Badge
Amber/orange. Pulsing dot animation (opacity 1→0.5→1, 2s cycle). Label: "Pending". Tooltip: "Transaction submitted — awaiting network confirmation. Typically 15-30 sec." Sub-states: submitted (default), replacing, speed_up.

### Retrying Badge
Blue. Rotating arrows (360°, 1s/rotation). Label: "Retrying". Tooltip: "Previous attempt failed. Auto-retrying with adjusted parameters. Attempt N/3." Sub-states: attempt_1, attempt_2, attempt_max, manual.

### Confirmed Badge
Green. Checkmark in circle. Pop-in animation on transition (scale 1→1.15→1, 300ms). Label: "Confirmed" or "Finalized". Tooltip: "Transaction confirmed in block #XXXXXX (N/N confirmations)." Sub-states: partial (1/N), enough (N/N, default), finalized (network finality), reverted (block reorg — shows red variant).

## 3. Sizes & Layout

sm (20px): tables, dense lists. md (24px): cards, activity feed (default). lg (28px): detail views, modals. Fully rounded pill. Icon left-aligned. 1px border at 30% accent opacity.

## 4. Combined: Badge + Progress Bar

For Ledger use: `[⏳ Pending  ▓▓▓░░░ 2/6 conf]`. Bar fills proportionally in emerald.

## 5. Accessibility

- role="status", aria-live="polite"
- Status via BOTH color and icon (not color alone)
- Screen reader: "Status: Pending — transaction submitted, awaiting confirmation"
- prefers-reduced-motion: static dot, static "↻" character, no pop-in

## 6. CSS Guide

Complete CSS with .onchain-badge base + variants, @keyframes pulse/spin/popIn, @media (prefers-reduced-motion), dark + light theme support.

## 7. Component API

```typescript
interface OnChainBadgeProps {
  status: 'pending' | 'retrying' | 'confirmed';
  subStatus?: string;
  size?: 'sm' | 'md' | 'lg';
  confirmations?: { current: number; required: number };
  txHash?: string;
  onClick?: () => void;
}
```

## 8. Testing Checklist

All 3 variants × 3 sizes render. Animations work + respect reduced motion. Tooltip matches status. Keyboard focus shows tooltip. Screen reader announces full status. WCAG AA compliant. Badge updates on confirmation change. Reverted shows red variant.

*Design delivered for Stellar Wave 7th Wave review.*
