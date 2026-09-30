# PR #779: SessionManagement closed-state regression coverage

## Summary

Keep the confirmation dialog mounted while closed so its `isOpen === false` return path remains observable, without changing the SessionManagement public API or visible behavior.

## Coverage

- Closed confirmation dialog is absent from the rendered UI.
- Revoke confirmation opens with the selected device, and Cancel closes it.
- Confirming revocation calls the handler with the selected session ID and removes only that session.
- An empty session collection displays the empty state without a session list or dialog.
- A current-session-only collection does not offer bulk revocation.

## Validation

- Focused Vitest suite: not run; execution was skipped.
- Editor diagnostics for the component and test: no errors found.