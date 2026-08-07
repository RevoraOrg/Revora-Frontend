# Governance Vote Receipt Component

## Overview
A confirmation modal displayed after a user successfully casts a vote on a governance proposal.

## Purpose
Provides the user with a permanent receipt of their action, including essential on-chain information for verification and sharing.

## Props
* `isOpen` (boolean)
* `onClose` (fn)
* `proposalTitle` (string)
* `voteChoice` ('For' | 'Against' | 'Abstain')
* `timestamp` (string)
* `txHash` (string)
* `status` ('pending' | 'confirmed' | 'failed')

## Accessibility
* Implements WAI-ARIA `dialog` pattern.
* Keyboard focus trapping and escape-key handling are managed.
* Proper labeling (`aria-labelledby`, `aria-describedby`).
* Focus states on copy and explorer link.

## Usage
Import from `src/components/GovernanceVoteReceiptModal.tsx`.
```tsx
<GovernanceVoteReceiptModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  proposalTitle="Proposal Title"
  voteChoice="For"
  timestamp="2026-08-07 10:00:00 UTC"
  txHash="0x..."
  status="confirmed"
/>
```
