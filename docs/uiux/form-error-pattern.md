# Form Error Pattern

## Overview
The Form Error pattern provides a consistent, accessible, and user-friendly way to display validation or server errors in forms across the Revora platform.

## Component: `FormError`
The `FormError` component is the standard implementation of this pattern.

### Usage
```tsx
import { FormError } from '../components/FormError';

// Inside your component
const [error, setError] = useState<string | null>(null);

return (
  <form>
    <FormError message={error} id="login-error" />
    {/* Form fields */}
  </form>
);
```

### Key Features
- **Accessibility**: 
  - Uses `role="alert"` for screen readers.
  - Implements `aria-live="assertive"` to ensure immediate notification.
  - Includes `aria-atomic="true"` to read the whole message.
  - High contrast colors (WCAG 2.1 AA compliant).
- **Reduced Motion**: 
  - Automatically honors `prefers-reduced-motion` by disabling animations.
- **Visual Feedback**:
  - Subtle fade-in animation for standard users.
  - Accompanied by a "shake" animation on the form container to draw attention (optional).

## Implementation Details

### Styling
The component uses a glassmorphism-compatible style:
- Background: `rgba(239, 68, 68, 0.1)` (Error red at 10% opacity)
- Border: `rgba(239, 68, 68, 0.2)`
- Text: `var(--error)` (#ef4444)

### Motion Guidelines
- **Shake Animation**: Use the `.animate-shake` class on the form container when an error occurs.
- **Reduced Motion Fallback**: 
  ```css
  @media (prefers-reduced-motion: reduce) {
    .animate-shake {
      animation: none;
      transform: none;
    }
  }
  ```

## Accessibility Notes
- Always provide a unique `id` to the `FormError` component.
- Use `aria-describedby` on the input fields that are in error to link them to the error message.
  ```tsx
  <input 
    aria-describedby={error ? "error-id" : undefined}
    className={error ? "input-error" : ""}
  />
  ```
