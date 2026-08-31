# Form Error & Error-Recovery Patterns

## Overview
The Form Error and Error-Recovery pattern provides a unified, accessible, and user-friendly mechanism to diagnose and recover from validation, network, RPC, wallet, and on-chain operation failures across the Revora platform.

It is designed to handle transient failures gracefully by supporting three presentation scopes (`inline`, `modal`, `page`), canonical recovery actions (Retry, Cancel/Dismiss, Contact Support), diagnosable technical details, and automatic form state preservation across retries.

---

## Component: `FormError`
The `FormError` component (`src/components/FormError.tsx`) is the standard implementation of this pattern.

### Scopes & Usage Examples

#### 1. Inline Scope (`scope="inline"`) — Default
Used for form-level feedback, field validations, or non-blocking transient alerts within existing layouts.

```tsx
import { FormError } from '../components/FormError';

<FormError
  message={errorMessage}
  id="login-error"
  onRetry={handleRetry}
  isRetrying={isSubmitting}
/>
```

#### 2. Modal Scope (`scope="modal"`)
Used for blocking errors occurring during multi-step modals, wallet approvals, or high-consequence operations.

```tsx
<FormError
  scope="modal"
  title="Transaction Rejected"
  message="The transaction was cancelled or rejected by your wallet."
  errorType="wallet"
  errorCode={4001}
  txHash="0x7f83b...281a"
  onRetry={handleRetryTransaction}
  onDismiss={handleCloseModal}
  onContactSupport={handleContactSupport}
/>
```

#### 3. Full-Page Scope (`scope="page"`)
Used for top-level view failures such as unreachable RPC nodes, network drops, or critical session expiration.

```tsx
<FormError
  scope="page"
  title="Blockchain Node Offline"
  message="Unable to communicate with the Horizon RPC node."
  description="The network may be experiencing temporary congestion. Please try again."
  errorType="rpc"
  errorCode="RPC_TIMEOUT_504"
  onRetry={handleReloadData}
  supportEmail="support@revora.finance"
/>
```

---

## Error Categories & Tailored Guidance

| `errorType` | Default Icon | Default Title | Typical Cause |
|---|---|---|---|
| `'network'` | `WifiOff` | Network Connection Error | Client offline, fetch timeout, socket disconnected |
| `'rpc'` | `ServerOff` | Blockchain RPC Error | Horizon/Soroban node unavailable or rate limited |
| `'wallet'` | `Wallet` | Transaction Rejected | User rejected transaction in wallet (e.g. error 4001) |
| `'server'` | `AlertTriangle` | Server Error (5xx) | 500/502/503/504 HTTP upstream response |
| `'validation'` | `AlertCircle` | Validation Error | Client-side or schema validation mismatch |
| `'generic'` | `AlertCircle` | Operation Failed | General runtime exception |

---

## Canonical Recovery Action Pattern

1. **Primary Action — Retry**:
   - `onRetry`: Function triggering idempotent retry.
   - `isRetrying`: Shows rotating spinner (`RefreshCw`) and disables button.
   - `retryCount` & `maxRetries`: Displays attempt counter (e.g. `Retry (2/3)`) and disables after maximum retries.
   - `retryCountdown`: Cooldown timer before retry is re-enabled (e.g. `Retry (5s)`).
2. **Secondary Action — Dismiss / Cancel**:
   - `onDismiss` or `onCancel`: Clears or cancels the operation.
   - Label defaults to `"Cancel"` in modals and `"Dismiss"` in inline views.
3. **Tertiary Action — Contact Support**:
   - `supportEmail`: Generates mailto link with pre-filled diagnostics in subject and body.
   - `supportUrl`: External link to help center with `target="_blank"` and `rel="noopener noreferrer"`.
   - `onContactSupport`: Custom callback handler.

---

## Form State Preservation Across Retries

When a transient network or on-chain error occurs, **form state must not be wiped**.

### Recommended Pattern with `useErrorRecovery` Hook:
```tsx
import { useForm } from 'react-hook-form';
import { useErrorRecovery } from '../hooks/useErrorRecovery';
import { FormError } from '../components/FormError';

export function TransferForm() {
  const { register, handleSubmit, getValues } = useForm({ defaultValues: { recipient: '', amount: '' } });
  const { error, isRetrying, triggerRetry, clearError, setError } = useErrorRecovery({
    maxRetries: 3,
    cooldownSeconds: 5,
  });

  const onSubmit = async (data: TransferData) => {
    try {
      await sendTransaction(data);
    } catch (err) {
      setError(err); // Form inputs remain intact!
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormError
        message={error?.message}
        title={error?.title}
        errorType={error?.errorType}
        errorCode={error?.errorCode}
        txHash={error?.txHash}
        details={error?.details}
        isRetrying={isRetrying}
        onRetry={() => triggerRetry(() => onSubmit(getValues()))}
        onDismiss={clearError}
      />
      <input {...register('recipient')} />
      <input {...register('amount')} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Accessibility (WCAG 2.1 AA) & Responsive Design

- **Screen Readers**:
  - Inline and Page scopes utilize `role="alert"`, `aria-live="assertive"`, and `aria-atomic="true"`.
  - Modal scope utilizes `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, and `aria-describedby`.
- **Keyboard Navigation**:
  - Modal traps focus with `Tab` / `Shift+Tab` cycling.
  - `Escape` dismisses modal dialogs.
  - Interactive elements have high-visibility focus rings (`focus-visible: outline`).
- **Touch Targets**:
  - Minimum touch target size of 44x44px for mobile devices.
  - Action buttons stack vertically on viewports `< 640px` for one-thumb reachability.
- **Reduced Motion**:
  - Respects `prefers-reduced-motion: reduce` by suppressing animations.
- **Automated Axe Testing**:
  - Zero detectable violations across all 3 scopes and expanded diagnostic views.
