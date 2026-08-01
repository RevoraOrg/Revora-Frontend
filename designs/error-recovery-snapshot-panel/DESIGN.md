# Design Specification: Persistent Error-Recovery Snapshot Side-Panel

**Issue**: RevoraOrg/Revora-Frontend#483
**Type**: UI/UX Design | **Status**: Specification
**Designer**: @laurentketterle-hub (Stellar Wave 7th Wave)

## 1. Overview & Rationale

When a transaction fails during blockchain operations (staking, claiming, vesting), users lose context. The current flow either shows a dismissible toast (transient) or redirects to a full error page (disruptive). Neither preserves workflow state.

This design introduces a **persistent error-recovery snapshot side-panel** that captures the full state of a failed operation as a snapshot, remains accessible via a side panel, and provides actionable recovery paths.

## 2. Component Architecture

```
<ErrorRecoveryPanel>
├── <SnapShotList>           // Left rail: recent snapshots
│   ├── <SnapshotItem>       // Status icon + timestamp + type
│   └── <SnapshotFilter />   // Filter by type, status, date
├── <SnapshotDetail>         // Main panel
│   ├── <SnapshotHeader />   // Operation type, timestamp, tx hash
│   ├── <StateDiff />        // Attempted vs network state
│   ├── <ErrorDiagnostic />  // Error code, message, fix suggestion
│   ├── <ActionBar>          // Retry | Edit & Retry | Export | Dismiss
│   └── <RelatedSnapshots /> // Linked operations
└── <PanelToggle />          // Floating button with count badge
```

## 3. Interaction Flow

**Trigger**: Any failed on-chain operation creates a snapshot. Success ops optional (configurable). Manual snapshot via "Save Draft" button.

**Notification**: Badge on PanelToggle (count of unresolved). No modal, no toast — badge only.

**Panel Open**: Desktop: slides from right, 380px (resizable 280-500px). Mobile: bottom sheet 60vh. Keyboard: Ctrl+Shift+E.

**Lifecycle**: `[Fails] → {pending} → Retry → {retrying} → [Success] → {resolved}` or `→ Dismiss → {dismissed}` or `→ 7 days → {expired}`

**States**: pending(⏳/amber), retrying(🔄/blue/animated), resolved(✅/green), dismissed(🗑️/gray), expired(⏰/gray-muted)

## 4. Visual Design

Dark theme (#1a1b2e bg, #2d2e3f border). Accent colors: amber-500, blue-500, emerald-500, gray-400. Typography: 14px/600 header, 13px/500 title, 11px/400 timestamp, 12px mono error code.

ASCII wireframe included in full spec.

## 5. Responsive Behavior

Desktop (≥1024px): side panel 380px. Tablet (768-1023px): 320px. Mobile (<768px): bottom sheet 60vh with drag handle, snap points 30vh/60vh/90vh.

## 6. Accessibility

- role="complementary", aria-label="Error Recovery Panel"
- Keyboard: Tab, Enter/Space, Escape, Arrow Up/Down, Ctrl+Shift+E
- Focus trap when panel open
- Screen reader: aria-live="polite" on notification badge
- prefers-reduced-motion disables spin/glow

## 7. Data Model (TypeScript)

ErrorSnapshot { id, operationType, status, timestamp, networkState, attemptedParams, error {code, message, suggestion, txHash}, recoveryAttempts, relatedSnapshotIds, expiresAt }

## 8. Performance

Lazy loading (mounts on first open). Virtualized list if >50 snapshots. IndexedDB persistence (max 100, FIFO expiry). Active retrying snapshots poll at 3s with exponential backoff.

## 9. Future Enhancements

AI diagnosis, batch retry, shareable snapshot links, Tenderly/Defender integration, push notifications on success.

## 10. Implementation Priority

P0: PanelToggle + SnapshotList + SnapshotDetail + error capture hook. P1: Action buttons + mobile responsive. P2: Filters/search/export + full accessibility. P3: AI diagnosis, batch ops.

*Design delivered for Stellar Wave 7th Wave review.*
