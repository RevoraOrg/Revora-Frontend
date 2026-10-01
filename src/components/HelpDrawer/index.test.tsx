import React, { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  HelpDrawer,
  HelpTrigger,
  OFFERING_HELP_CONTENT,
} from './index';
import type {
  HelpDefinition,
  HelpDrawerContent,
  HelpLink,
  HelpTriggerProps,
  OfferingStep,
} from './index';

const revenueShareDefinition: HelpDefinition = {
  term: 'Revenue share',
  description: 'A share of revenue.',
};

const documentationLink: HelpLink = {
  label: 'Documentation',
  href: 'https://docs.example.com/help',
};

const basicContent: HelpDrawerContent = {
  title: 'Application help',
  overview: 'Details about this application step.',
};

const contentWithSections: HelpDrawerContent = {
  ...basicContent,
  stepLabel: 'Step 1 of 5',
  illustration: <span>Custom illustration</span>,
  definitions: [revenueShareDefinition],
  example: 'A representative example.',
  links: [documentationLink],
  footerNote: 'Changes are saved automatically.',
};

function HelpDrawerHarness({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <HelpTrigger ref={triggerRef} onClick={() => setIsOpen(true)} />
      <HelpDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        content={basicContent}
        triggerRef={triggerRef}
      />
    </>
  );
}

describe('HelpDrawer public entry point', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    document.body.style.overflow = '';
    vi.unstubAllGlobals();
  });

  it('exports all offering help steps with usable content', () => {
    const steps: OfferingStep[] = [
      'application',
      'kyc-check',
      'compliance-review',
      'listed',
      'funding-open',
    ];

    expect(Object.keys(OFFERING_HELP_CONTENT)).toEqual(steps);
    expect(OFFERING_HELP_CONTENT.application.title).toBe('Application');
    expect(OFFERING_HELP_CONTENT['funding-open'].overview).toBeTruthy();
  });

  it('keeps the drawer absent while closed', () => {
    render(<HelpDrawer isOpen={false} onClose={vi.fn()} content={basicContent} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('renders the exported content slots and safe external links when open', () => {
    render(<HelpDrawer isOpen onClose={vi.fn()} content={contentWithSections} />);

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Details about this application step.')).toBeInTheDocument();
    expect(screen.getByText('Custom illustration')).toBeInTheDocument();
    expect(screen.getByText('Revenue share')).toBeInTheDocument();
    expect(screen.getByText('A representative example.')).toBeInTheDocument();
    expect(screen.getByText('Changes are saved automatically.')).toBeInTheDocument();

    const documentationLink = screen.getByRole('link', { name: 'Documentation' });
    expect(documentationLink).toHaveAttribute('href', 'https://docs.example.com/help');
    expect(documentationLink).toHaveAttribute('target', '_blank');
    expect(documentationLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('handles omitted and empty optional content without rendering empty sections', () => {
    const contentWithEmptySections: HelpDrawerContent = {
      ...basicContent,
      definitions: [],
      links: [],
    };

    render(
      <HelpDrawer
        isOpen
        onClose={vi.fn()}
        content={contentWithEmptySections}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Application help' })).toBeInTheDocument();
    expect(screen.queryByText('Key terms')).not.toBeInTheDocument();
    expect(screen.queryByText('Example')).not.toBeInTheDocument();
    expect(screen.queryByText('Learn more')).not.toBeInTheDocument();
    expect(screen.queryByText('Changes are saved automatically.')).not.toBeInTheDocument();
    expect(document.querySelector('.hd-illustration svg')).toBeInTheDocument();
  });

  it('opens from the trigger, closes on Escape, and restores focus', async () => {
    const user = userEvent.setup();
    render(<HelpDrawerHarness />);
    const trigger = screen.getByRole('button', { name: 'Open contextual help' });

    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: 'Close help drawer' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
  });

  it('closes through the close button and overlay', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <HelpDrawer isOpen onClose={onClose} content={basicContent} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close help drawer' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    unmount();
    render(<HelpDrawer isOpen onClose={onClose} content={basicContent} />);
    fireEvent.click(screen.getByTestId('hd-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab focus at both ends of the open drawer', () => {
    render(
      <HelpDrawer
        isOpen
        onClose={vi.fn()}
        content={{ ...basicContent, links: [{ label: 'Documentation', href: '/docs' }] }}
      />,
    );
    const closeButton = screen.getByRole('button', { name: 'Close help drawer' });
    const documentationLink = screen.getByRole('link', { name: 'Documentation' });

    closeButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(documentationLink).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
  });

  it('forwards custom trigger props, ref, and accessible label', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const triggerProps: HelpTriggerProps = {
      label: 'More about this step',
      className: 'custom-trigger',
      'data-testid': 'custom-help-trigger',
    };

    render(<HelpTrigger ref={ref} {...triggerProps} />);

    const trigger = screen.getByRole('button', { name: 'More about this step' });
    expect(trigger).toHaveAttribute('type', 'button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveClass('hd-trigger', 'custom-trigger');
    expect(ref.current).toBe(trigger);
  });
});