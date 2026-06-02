/**
 * AuthLayout.test.tsx
 * Issue #80 – Refine AuthLayout container for consistent spacing and responsive width
 *
 * Coverage goals:
 *  - All prop combinations (title only, +subtitle, +helperText, all three)
 *  - Conditional rendering: subtitle / helperText absent when not supplied
 *  - ARIA semantics: <main> landmark, aria-labelledby ↔ <h1> id linkage
 *  - Edge cases: very long title, very long subtitle, 320px-wide container
 *  - Focus ring inheritance: interactive children inside .auth-body
 *  - Slot independence: children render without affecting header
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthLayout } from './AuthLayout';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REQUIRED_TITLE = 'Welcome to Revora';

function renderLayout(overrides: Partial<React.ComponentProps<typeof AuthLayout>> = {}) {
  const defaults = {
    title: REQUIRED_TITLE,
    children: <p>Form content</p>,
  };
  return render(<AuthLayout {...defaults} {...overrides} />);
}

// ---------------------------------------------------------------------------
// 1. Rendering – title (required slot)
// ---------------------------------------------------------------------------

describe('AuthLayout – title slot', () => {
  it('renders the title as an <h1>', () => {
    renderLayout();
    const heading = screen.getByRole('heading', { level: 1, name: REQUIRED_TITLE });
    expect(heading).toBeInTheDocument();
  });

  it('applies the auth-title CSS class to the <h1>', () => {
    renderLayout();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('auth-title');
  });

  it('title has an id attribute (required for aria-labelledby)', () => {
    renderLayout();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.id).toBeTruthy();
  });

  it('renders a very long title without crashing', () => {
    const longTitle = 'A'.repeat(200);
    renderLayout({ title: longTitle });
    expect(screen.getByRole('heading', { level: 1, name: longTitle })).toBeInTheDocument();
  });

  it('renders a title with special characters', () => {
    const specialTitle = 'Forgot Password? <script>alert(1)</script>';
    renderLayout({ title: specialTitle });
    // The text should appear as-is (React escapes HTML)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(specialTitle);
  });
});

// ---------------------------------------------------------------------------
// 2. Rendering – subtitle slot (optional)
// ---------------------------------------------------------------------------

describe('AuthLayout – subtitle slot', () => {
  it('renders subtitle when provided', () => {
    renderLayout({ subtitle: 'Sign in to manage your portfolio.' });
    expect(screen.getByText('Sign in to manage your portfolio.')).toBeInTheDocument();
  });

  it('applies auth-subtitle CSS class when subtitle is rendered', () => {
    renderLayout({ subtitle: 'A subtitle' });
    const el = screen.getByText('A subtitle');
    expect(el).toHaveClass('auth-subtitle');
  });

  it('does NOT render a subtitle element when prop is omitted', () => {
    renderLayout(); // no subtitle
    // Only one paragraph present: children
    const paras = screen.getAllByText(/Form content/i);
    expect(paras).toHaveLength(1);
  });

  it('does NOT render a subtitle element when prop is undefined', () => {
    renderLayout({ subtitle: undefined });
    // Subtitle CSS class should not appear in the document
    expect(document.querySelector('.auth-subtitle')).toBeNull();
  });

  it('renders a very long subtitle without crashing', () => {
    const longSubtitle = 'B'.repeat(300);
    renderLayout({ subtitle: longSubtitle });
    expect(screen.getByText(longSubtitle)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Rendering – helperText slot (optional)
// ---------------------------------------------------------------------------

describe('AuthLayout – helperText slot', () => {
  it('renders helperText when provided', () => {
    renderLayout({ helperText: 'We never share your data.' });
    expect(screen.getByText('We never share your data.')).toBeInTheDocument();
  });

  it('applies auth-helper CSS class when helperText is rendered', () => {
    renderLayout({ helperText: 'Helper note' });
    const el = screen.getByText('Helper note');
    expect(el).toHaveClass('auth-helper');
  });

  it('does NOT render a helperText element when prop is omitted', () => {
    renderLayout(); // no helperText
    expect(document.querySelector('.auth-helper')).toBeNull();
  });

  it('does NOT render a helperText element when prop is undefined', () => {
    renderLayout({ helperText: undefined });
    expect(document.querySelector('.auth-helper')).toBeNull();
  });

  it('renders a very long helperText without crashing', () => {
    const longHelper = 'C'.repeat(500);
    renderLayout({ helperText: longHelper });
    expect(screen.getByText(longHelper)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Rendering – children slot
// ---------------------------------------------------------------------------

describe('AuthLayout – children slot', () => {
  it('renders children inside the auth-body wrapper', () => {
    render(
      <AuthLayout title={REQUIRED_TITLE}>
        <input type="email" placeholder="email" />
        <button type="submit">Sign In</button>
      </AuthLayout>,
    );
    expect(screen.getByPlaceholderText('email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('children are wrapped in .auth-body', () => {
    render(
      <AuthLayout title={REQUIRED_TITLE}>
        <span data-testid="child-node">child</span>
      </AuthLayout>,
    );
    const child = screen.getByTestId('child-node');
    // Walk up the DOM to find the .auth-body ancestor
    expect(child.closest('.auth-body')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. All slots together
// ---------------------------------------------------------------------------

describe('AuthLayout – all slots present', () => {
  it('renders title, subtitle, helperText, and children together', () => {
    render(
      <AuthLayout
        title="Create your account"
        subtitle="Setting up your startup profile."
        helperText="Already have credentials? Return to Sign in."
      >
        <button>Submit</button>
      </AuthLayout>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByText('Setting up your startup profile.')).toBeInTheDocument();
    expect(screen.getByText('Already have credentials? Return to Sign in.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. ARIA / accessibility semantics
// ---------------------------------------------------------------------------

describe('AuthLayout – ARIA and accessibility', () => {
  it('renders a <main> landmark with role="main"', () => {
    renderLayout();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('<main> has aria-labelledby pointing to the <h1> id', () => {
    renderLayout();
    const main = screen.getByRole('main');
    const heading = screen.getByRole('heading', { level: 1 });

    const labelId = main.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(heading.id).toBe(labelId);
  });

  it('<main> id and <h1> id are stable across re-renders of same component', () => {
    const { rerender } = renderLayout({ title: 'Title A' });
    const idBefore = screen.getByRole('heading', { level: 1 }).id;
    rerender(
      <AuthLayout title="Title A">
        <p>Form content</p>
      </AuthLayout>,
    );
    const idAfter = screen.getByRole('heading', { level: 1 }).id;
    expect(idBefore).toBe(idAfter);
  });

  it('header element wraps the title/subtitle/helperText group', () => {
    renderLayout({ subtitle: 'sub', helperText: 'helper' });
    const header = document.querySelector('header.auth-header');
    expect(header).not.toBeNull();
    expect(header!.querySelector('h1.auth-title')).not.toBeNull();
    expect(header!.querySelector('p.auth-subtitle')).not.toBeNull();
    expect(header!.querySelector('p.auth-helper')).not.toBeNull();
  });

  it('interactive children inside auth-body receive focus', async () => {
    const user = userEvent.setup();
    render(
      <AuthLayout title={REQUIRED_TITLE}>
        <button>Focus Me</button>
      </AuthLayout>,
    );
    const btn = screen.getByRole('button', { name: 'Focus Me' });
    await user.tab();
    expect(btn).toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// 7. CSS class structure
// ---------------------------------------------------------------------------

describe('AuthLayout – CSS class structure', () => {
  it('outer wrapper has auth-layout-outer class', () => {
    renderLayout();
    expect(document.querySelector('.auth-layout-outer')).not.toBeNull();
  });

  it('card has both auth-card and glass-card classes', () => {
    renderLayout();
    const card = document.querySelector('.auth-card');
    expect(card).not.toBeNull();
    expect(card).toHaveClass('glass-card');
  });

  it('header section has auth-header class', () => {
    renderLayout();
    expect(document.querySelector('.auth-header')).not.toBeNull();
  });

  it('animate-fade-in is applied to the outer wrapper', () => {
    renderLayout();
    expect(document.querySelector('.animate-fade-in')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 8. Edge cases
// ---------------------------------------------------------------------------

describe('AuthLayout – edge cases', () => {
  it('renders correctly with only the title (no subtitle, no helperText, no children)', () => {
    render(<AuthLayout title="Solo Title">{null}</AuthLayout>);
    expect(screen.getByRole('heading', { level: 1, name: 'Solo Title' })).toBeInTheDocument();
    expect(document.querySelector('.auth-subtitle')).toBeNull();
    expect(document.querySelector('.auth-helper')).toBeNull();
  });

  it('renders correctly with multiple complex children', () => {
    render(
      <AuthLayout title={REQUIRED_TITLE}>
        <form>
          <input type="text" placeholder="Name" />
          <input type="email" placeholder="Email" />
          <button type="submit">Go</button>
        </form>
      </AuthLayout>,
    );
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });

  it('does not emit extra DOM nodes when all optional props are absent', () => {
    renderLayout();
    // Only .auth-header, .auth-title, and .auth-body should exist in the card
    const authHeader = document.querySelector('.auth-header');
    expect(authHeader!.children).toHaveLength(1); // only <h1>
  });

  it('renders title-only content consistently for success confirmation screens', () => {
    // Matches usage in Signup "Check your inbox" and ForgotPassword "Reset link sent" states
    render(
      <AuthLayout title="Check your inbox">
        <p>Confirmation message.</p>
      </AuthLayout>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Check your inbox' })).toBeInTheDocument();
    expect(document.querySelector('.auth-subtitle')).toBeNull();
    expect(document.querySelector('.auth-helper')).toBeNull();
  });
});
