/**
 * HelpDrawer.test.tsx — Issue #725
 * vitest + @testing-library/react + jest-axe
 */
import React, { createRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { HelpDrawer } from './HelpDrawer';
import type { HelpDrawerProps, HelpDrawerContent } from './HelpDrawer';
import { HelpTrigger } from './HelpTrigger';
import { OFFERING_HELP_CONTENT } from './offeringHelpContent';

/* ─── Fixtures ──────────────────────────────────────────────────── */
const BASE_CONTENT: HelpDrawerContent = {
  title: 'KYC Check',
  stepLabel: 'Step 2 of 5',
  overview: 'Know Your Customer verification confirms identity before offering proceed.',
  definitions: [
    {
      term: 'KYC',
      description: 'A mandatory identity verification process.',
    },
    {
      term: 'Beneficial Owner',
      description: 'Any individual owning 25% or more.',
    },
  ],
  example: 'Upload a clear passport scan and utility bill.',
  links: [
    {
      label: 'What documents are required?',
      href: 'https://docs.revora.io/kyc/required-documents',
    },
  ],
  footerNote: 'Documents are encrypted in transit and at rest.',
};

function renderDrawer(props: Partial<HelpDrawerProps> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <HelpDrawer
      isOpen={true}
      onClose={onClose}
      content={BASE_CONTENT}
      {...props}
    />,
  );
  return { ...utils, onClose };
}

/* ─── Branch Evidence & isOpen Failure / Empty-Result Path ───────── */
describe('Branch evidence and isOpen state', () => {
  it('renders null / empty DOM when isOpen is false (evidence line 139)', () => {
    const { container } = renderDrawer({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hd-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hd-overlay')).not.toBeInTheDocument();
  });

  it('renders the dialog panel and overlay when isOpen is true', () => {
    renderDrawer({ isOpen: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('hd-panel')).toBeInTheDocument();
    expect(screen.getByTestId('hd-overlay')).toBeInTheDocument();
  });

  it('toggles body overflow style between hidden (open) and restored (closed)', () => {
    const { rerender } = renderDrawer({ isOpen: true });
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <HelpDrawer
        isOpen={false}
        onClose={vi.fn()}
        content={BASE_CONTENT}
      />,
    );
    expect(document.body.style.overflow).toBe('');
  });
});

/* ─── HelpDefinition & Content Rendering ────────────────────────── */
describe('HelpDefinition and content rendering', () => {
  it('renders title, step label, overview, definitions, example, links, and footerNote', () => {
    renderDrawer();

    expect(screen.getByRole('heading', { level: 2, name: 'KYC Check' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
    expect(screen.getByText(/know your customer verification confirms/i)).toBeInTheDocument();

    // Definitions
    expect(screen.getByText('KYC')).toBeInTheDocument();
    expect(screen.getByText('A mandatory identity verification process.')).toBeInTheDocument();
    expect(screen.getByText('Beneficial Owner')).toBeInTheDocument();
    expect(screen.getByText('Any individual owning 25% or more.')).toBeInTheDocument();

    // Example
    expect(screen.getByText(/upload a clear passport scan/i)).toBeInTheDocument();

    // Links
    const link = screen.getByRole('link', { name: /what documents are required\?/i });
    expect(link).toHaveAttribute('href', 'https://docs.revora.io/kyc/required-documents');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    // Footer
    expect(screen.getByText(/documents are encrypted in transit and at rest/i)).toBeInTheDocument();
  });

  it('renders custom illustration when provided, otherwise defaults to placeholder BookOpen icon', () => {
    const { rerender } = renderDrawer({
      content: { ...BASE_CONTENT, illustration: <span data-testid="custom-illustration">Custom Art</span> },
    });
    expect(screen.getByTestId('custom-illustration')).toBeInTheDocument();

    rerender(
      <HelpDrawer
        isOpen={true}
        onClose={vi.fn()}
        content={{ ...BASE_CONTENT, illustration: undefined }}
      />,
    );
    expect(screen.queryByTestId('custom-illustration')).not.toBeInTheDocument();
  });
});

/* ─── HelpDefinition Failure / Empty-Result Paths & Boundary Inputs ── */
describe('HelpDefinition failure and boundary handling (#725)', () => {
  it('omits definitions section when definitions is undefined', () => {
    renderDrawer({
      content: { ...BASE_CONTENT, definitions: undefined },
    });
    expect(screen.queryByRole('heading', { name: /key terms/i })).not.toBeInTheDocument();
    expect(screen.queryByText('KYC')).not.toBeInTheDocument();
  });

  it('omits definitions section when definitions is an empty array', () => {
    renderDrawer({
      content: { ...BASE_CONTENT, definitions: [] },
    });
    expect(screen.queryByRole('heading', { name: /key terms/i })).not.toBeInTheDocument();
  });

  it('gracefully handles boundary definitions with empty terms or descriptions', () => {
    renderDrawer({
      content: {
        ...BASE_CONTENT,
        definitions: [
          { term: '', description: 'Description without term' },
          { term: 'TermWithoutDesc', description: '' },
        ],
      },
    });
    expect(screen.getByRole('heading', { name: /key terms/i })).toBeInTheDocument();
    expect(screen.getByText('Term')).toBeInTheDocument();
    expect(screen.getByText('Description without term')).toBeInTheDocument();
    expect(screen.getByText('TermWithoutDesc')).toBeInTheDocument();
  });

  it('omits optional sections (stepLabel, example, links, footerNote) when omitted', () => {
    renderDrawer({
      content: {
        title: 'Minimal Drawer',
        overview: 'Only overview provided.',
      },
    });

    expect(screen.getByText('Minimal Drawer')).toBeInTheDocument();
    expect(screen.getByText('Only overview provided.')).toBeInTheDocument();
    expect(screen.queryByText('Step 2 of 5')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /example/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /learn more/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/documents are encrypted/i)).not.toBeInTheDocument();
  });

  it('renders preset OFFERING_HELP_CONTENT items correctly', () => {
    Object.entries(OFFERING_HELP_CONTENT).forEach(([, content]) => {
      const { unmount } = render(
        <HelpDrawer isOpen={true} onClose={vi.fn()} content={content} />,
      );
      expect(screen.getByRole('heading', { level: 2, name: content.title })).toBeInTheDocument();
      expect(screen.getByText(content.overview)).toBeInTheDocument();
      unmount();
    });
  });
});

/* ─── Close and Dismiss Interactions ────────────────────────────── */
describe('Close and dismiss interactions', () => {
  it('calls onClose when close button is clicked', async () => {
    const { onClose } = renderDrawer();
    const closeBtn = screen.getByRole('button', { name: /close help drawer/i });
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when clicking the overlay', async () => {
    const { onClose } = renderDrawer();
    const overlay = screen.getByTestId('hd-overlay');
    await userEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', () => {
    const { onClose } = renderDrawer();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose on non-Escape keydown events', () => {
    const { onClose } = renderDrawer();
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

/* ─── Focus Management & Trap ───────────────────────────────────── */
describe('Focus management and trap', () => {
  it('focuses the close button upon opening via requestAnimationFrame', async () => {
    renderDrawer();
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /close help drawer/i }));
    });
  });

  it('returns focus to triggerRef when drawer closes', async () => {
    const triggerBtn = document.createElement('button');
    document.body.appendChild(triggerBtn);
    const triggerRef = { current: triggerBtn };

    const { rerender } = render(
      <HelpDrawer
        isOpen={true}
        onClose={vi.fn()}
        content={BASE_CONTENT}
        triggerRef={triggerRef}
      />,
    );

    rerender(
      <HelpDrawer
        isOpen={false}
        onClose={vi.fn()}
        content={BASE_CONTENT}
        triggerRef={triggerRef}
      />,
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(triggerBtn);
    });

    document.body.removeChild(triggerBtn);
  });

  it('traps Tab navigation within the drawer panel', () => {
    renderDrawer();
    const closeBtn = screen.getByRole('button', { name: /close help drawer/i });
    const links = screen.getAllByRole('link');
    const lastFocusable = links[links.length - 1];

    lastFocusable.focus();
    expect(document.activeElement).toBe(lastFocusable);

    // Pressing Tab on last element should cycle to first (close button)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);

    // Pressing Shift+Tab on first element should cycle to last element
    closeBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastFocusable);
  });

  it('safely ignores Tab navigation if panel has no focusable nodes', () => {
    const { container } = renderDrawer();
    const panel = container.querySelector('.hd-panel') as HTMLElement;
    // Temporarily query mock or disable children
    const closeBtn = screen.getByRole('button', { name: /close help drawer/i });
    closeBtn.setAttribute('disabled', 'true');
    const links = screen.getAllByRole('link');
    links.forEach((l) => l.removeAttribute('href'));

    expect(() => {
      fireEvent.keyDown(panel, { key: 'Tab' });
    }).not.toThrow();
  });

  it('allows natural tab movement when focus is in the middle of focusable elements', () => {
    renderDrawer({
      content: {
        ...BASE_CONTENT,
        links: [
          { label: 'Link 1', href: 'https://example.com/1' },
          { label: 'Link 2', href: 'https://example.com/2' },
        ],
      },
    });

    const links = screen.getAllByRole('link');
    const firstLink = links[0];
    firstLink.focus();
    expect(document.activeElement).toBe(firstLink);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(firstLink);
  });
});

/* ─── HelpTrigger Component ─────────────────────────────────────── */
describe('HelpTrigger', () => {
  it('renders button with accessible label and aria-haspopup="dialog"', () => {
    render(<HelpTrigger label="Open help" />);
    const btn = screen.getByRole('button', { name: 'Open help' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('forwards ref correctly', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<HelpTrigger ref={ref} label="Trigger Ref Test" />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

/* ─── Accessibility — axe ───────────────────────────────────────── */
describe('Accessibility — axe', () => {
  it('has no axe violations when open with full content', async () => {
    const { container } = renderDrawer();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('dialog has role="dialog", aria-modal="true", and proper labelling attributes', () => {
    renderDrawer();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'hd-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'hd-overview');
  });
});
