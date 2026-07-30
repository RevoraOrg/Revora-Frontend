# Compliance Hold Components

## Overview

The Compliance Hold components provide clear, non-punitive messaging and actionable steps for users to resolve compliance holds on their accounts or offerings.

## Components

### ComplianceHoldBanner

Displays compliance holds with severity variants (info, warning, blocking).

**Props:**
- `holds`: Array of `ComplianceHold` objects
- `onDismiss?`: Optional callback when a hold is dismissed
- `className?`: Optional CSS class name
- `id?`: Optional HTML id (default: "compliance-hold-banner")

**ComplianceHold Interface:**
- `id`: Unique identifier
- `type`: Type of compliance hold (e.g., "kyc", "aml", "document")
- `severity`: "info" | "warning" | "blocking"
- `title`: Short, descriptive title
- `message`: Detailed explanation
- `canDismiss?`: Whether the hold can be dismissed

### RemediationChecklist

Displays actionable steps to resolve compliance holds with progress tracking.

**Props:**
- `steps`: Array of `RemediationStep` objects
- `className?`: Optional CSS class name
- `id?`: Optional HTML id (default: "remediation-checklist")
- `title?`: Section title (default: "Steps to resolve")

**RemediationStep Interface:**
- `id`: Unique identifier
- `title`: Step title
- `description?`: Optional detailed description
- `completed`: Whether the step is completed
- `actionLabel?`: Button label for action
- `actionUrl?`: External URL for action
- `onAction?`: Callback for action button
- `disabled?`: Whether the step is disabled

## Microcopy Guidelines

### Principles

1. **Lead with resolution**: Always start with what the user needs to do, not what they did wrong
2. **Avoid blame language**: Use neutral, factual language
3. **Be specific and actionable**: Provide clear next steps
4. **Maintain consistency**: Use similar phrasing across similar scenarios
5. **Keep it concise**: Use the minimum words needed to convey the message

### Do's and Don'ts

**DO:**
- "Complete identity verification to continue"
- "Upload your government-issued ID"
- "Verify your email address"
- "Provide additional documentation"

**DON'T:**
- "You failed to verify your identity"
- "Your account is blocked because you didn't..."
- "You must fix this error"
- "Incomplete information provided"

### Severity-Specific Messaging

**Info (Low urgency):**
- Focus on optional improvements or future requirements
- Example: "Add additional verification to increase account limits"

**Warning (Medium urgency):**
- Focus on upcoming deadlines or requirements
- Example: "Update your business information before [date]"

**Blocking (High urgency):**
- Focus on immediate resolution path
- Example: "Complete identity verification to access your account"

## Accessibility

### WCAG 2.1 AA Compliance

- **Color contrast**: All text meets 4.5:1 contrast ratio
- **Focus indicators**: Visible focus rings on interactive elements
- **Screen reader support**: Proper ARIA labels and live regions
- **Keyboard navigation**: All interactive elements are keyboard accessible
- **Reduced motion**: Respects `prefers-reduced-motion` preference

### ARIA Attributes

**ComplianceHoldBanner:**
- `role="region"` with `aria-label="Compliance holds"`
- `role="alert"` for warning/blocking holds
- `role="status"` for info holds
- `aria-live="assertive"` for urgent messages
- `aria-live="polite"` for informational messages
- `aria-atomic="true"` for complete announcements

**RemediationChecklist:**
- `role="region"` with `aria-label="Remediation checklist"`
- `role="list"` and `role="listitem"` for semantic structure
- `role="progressbar"` for progress indicator
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for progress
- `aria-current="step"` for current incomplete step

## Responsive Design

### Breakpoints

- **Mobile (< 640px)**: Full-width, stacked layout
- **Tablet (640px - 1024px)**: Maintains spacing, adapts padding
- **Desktop (> 1024px)**: Optimal spacing and layout

### Mobile Considerations

- Minimum touch target size: 44x44px
- Readable font sizes: minimum 16px
- Sufficient spacing between interactive elements
- No horizontal scrolling

## Usage Examples

### Basic Usage

```tsx
import { ComplianceHoldBanner, RemediationChecklist } from '@/components';

function CompliancePage() {
  const holds = [
    {
      id: "kyc-1",
      type: "kyc",
      severity: "blocking" as const,
      title: "Identity verification required",
      message: "Complete identity verification to continue using your account",
    },
  ];

  const steps = [
    {
      id: "step-1",
      title: "Upload government ID",
      description: "Provide a valid passport or driver's license",
      completed: false,
      actionLabel: "Upload now",
      onAction: (id) => console.log("Action:", id),
    },
    {
      id: "step-2",
      title: "Take a selfie",
      description: "Follow the on-screen instructions",
      completed: false,
      actionLabel: "Start verification",
      onAction: (id) => console.log("Action:", id),
    },
  ];

  return (
    <div>
      <ComplianceHoldBanner holds={holds} />
      <RemediationChecklist steps={steps} />
    </div>
  );
}
```

### Multiple Holds

```tsx
const holds = [
  {
    id: "kyc-1",
    type: "kyc",
    severity: "blocking" as const,
    title: "Identity verification required",
    message: "Complete identity verification to continue",
  },
  {
    id: "aml-1",
    type: "aml",
    severity: "warning" as const,
    title: "Additional information needed",
    message: "Provide your tax identification number",
    canDismiss: true,
  },
];
```

### With External Links

```tsx
const steps = [
  {
    id: "step-1",
    title: "Review compliance requirements",
    completed: false,
    actionLabel: "View documentation",
    actionUrl: "https://docs.example.com/compliance",
  },
];
```

## Testing

### Test Coverage Requirements

- Unit tests for all components: ≥95%
- Accessibility tests: axe-core
- Visual regression tests: Storybook
- Responsive tests: Multiple viewport sizes

### Edge Cases to Test

- Multiple concurrent holds
- Empty holds array
- All steps completed
- No steps completed
- Disabled actions
- External links vs callbacks
- Dismissible holds
- RTL (right-to-left) layout
- Mobile viewport (320px minimum)

## Design Tokens

The components use the following design tokens from `index.css`:

- Colors: `--primary`, `--error`, `--success`, `--text-main`, `--text-muted`
- Spacing: `--spacing-xs` through `--spacing-3xl`
- Border radius: `--radius-lg`, `--radius-xl`
- Typography: `--font-size-sm`, `--font-size-base`
- Glass effects: `--glass-bg`, `--glass-border`, `--glass-blur`
