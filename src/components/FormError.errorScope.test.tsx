/**
 * Focused coverage for the `ErrorScope` failure and boundary branches in
 * `FormError.tsx`.
 *
 * Complements `FormError.test.tsx` (which covers each presentation scope and
 * each support action in isolation) by pinning:
 * - the null-return guards for empty content, empty actions and empty
 *   diagnostics (lines ~224 / ~344 / ~382),
 * - the `renderSupportButton` null return when no support target is given
 *   (line ~338), and
 * - the support-action precedence (supportUrl > supportEmail > onContactSupport).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { FormError } from './FormError';

describe('FormError ErrorScope contracts', () => {
  describe('null-return guards', () => {
    it('renders nothing when no message, title, details or children are given', () => {
      const { container } = render(<FormError />);
      expect(container.firstChild).toBeNull();
    });

    it.each([
      ['title only', { title: 'Only a title' }],
      ['details only', { details: { code: 'E_BOOM' } }],
      ['children only', { children: <span>child content</span> }],
    ])('still renders when there is %s', (_label, props) => {
      const { container } = render(<FormError {...(props as any)} />);
      expect(container.firstChild).not.toBeNull();
    });

    it('omits the actions group when no action is available', () => {
      render(<FormError message="Nothing to do" />);
      expect(
        screen.queryByRole('group', { name: /error recovery actions/i }),
      ).not.toBeInTheDocument();
    });

    it('omits the diagnostics toggle when there is nothing to diagnose', () => {
      render(<FormError message="Plain failure" />);
      expect(screen.queryByRole('button', { name: /technical details/i })).toBeNull();
    });

    it('shows the diagnostics toggle when details are supplied', () => {
      render(<FormError message="Failure" details={{ requestId: 'abc-123' }} />);

      const toggle = screen.getByRole('button', { name: /technical details/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('support action availability', () => {
    it('renders no support control for page scope without a support target', () => {
      // `scope === 'page'` makes shouldShowSupport true, but renderSupportButton
      // has no URL, email or handler to render and must return null.
      render(
        <FormError scope="page" title="Page failure" message="Something broke" />,
      );

      expect(screen.queryByRole('link', { name: /contact support/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /contact support/i })).toBeNull();
    });

    it('suppresses support even when a handler is given and showSupport is false', () => {
      const onContactSupport = vi.fn();
      render(
        <FormError
          message="Failure"
          onContactSupport={onContactSupport}
          showSupport={false}
        />,
      );

      expect(screen.queryByRole('button', { name: /contact support/i })).toBeNull();
      expect(onContactSupport).not.toHaveBeenCalled();
    });

    it('defaults support on for page scope when a support email is configured', () => {
      render(
        <FormError
          scope="page"
          title="Page failure"
          message="Something broke"
          supportEmail="support@revora.finance"
        />,
      );

      const link = screen.getByRole('link', { name: /contact support/i });
      expect(link).toHaveAttribute('href', expect.stringContaining('mailto:support@revora.finance'));
    });
  });

  describe('support action precedence', () => {
    it('prefers supportUrl over supportEmail and onContactSupport', () => {
      const onContactSupport = vi.fn();
      render(
        <FormError
          message="Failure"
          supportUrl="https://status.revora.finance"
          supportEmail="support@revora.finance"
          onContactSupport={onContactSupport}
        />,
      );

      const link = screen.getByRole('link', { name: /contact support/i });
      expect(link).toHaveAttribute('href', 'https://status.revora.finance');
      expect(link).toHaveAttribute('target', '_blank');
      expect(screen.queryByRole('button', { name: /contact support/i })).toBeNull();
    });

    it('falls back to a mailto link when only supportEmail is given', () => {
      render(<FormError message="Failure" supportEmail="support@revora.finance" />);

      const link = screen.getByRole('link', { name: /contact support/i });
      expect(link.getAttribute('href')).toContain('mailto:support@revora.finance');
    });

    it('falls back to a callback button when only onContactSupport is given', () => {
      const onContactSupport = vi.fn();
      render(<FormError message="Failure" onContactSupport={onContactSupport} />);

      const button = screen.getByRole('button', { name: /contact support/i });
      fireEvent.click(button);
      expect(onContactSupport).toHaveBeenCalledTimes(1);
    });
  });
});
