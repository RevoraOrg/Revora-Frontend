import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Chip } from './Chip';
import ChipDefault from './Chip';

expect.extend(toHaveNoViolations);

describe('Chip Component', () => {
  // ---------------------------------------------------------------------------
  // 1. Basic Rendering & Public Contract
  // ---------------------------------------------------------------------------
  describe('Basic Rendering & Public Contract', () => {
    it('renders the label text', () => {
      render(<Chip label="Unsaved changes" />);

      const chip = screen.getByRole('status');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveTextContent('Unsaved changes');
      expect(chip.tagName).toBe('SPAN');
    });

    it('exposes role="status" for screen readers', () => {
      render(<Chip label="Unsaved changes" />);

      expect(screen.getByRole('status')).toHaveAttribute('role', 'status');
    });

    it('applies the base pill styling classes', () => {
      render(<Chip label="Unsaved changes" />);

      const chip = screen.getByRole('status');
      expect(chip).toHaveClass('inline-flex');
      expect(chip).toHaveClass('items-center');
      expect(chip).toHaveClass('px-2.5');
      expect(chip).toHaveClass('py-0.5');
      expect(chip).toHaveClass('rounded-full');
      expect(chip).toHaveClass('text-xs');
      expect(chip).toHaveClass('font-medium');
    });

    it('applies the default warning background and text classes', () => {
      render(<Chip label="Unsaved changes" />);

      const chip = screen.getByRole('status');
      expect(chip).toHaveClass('bg-warning-100');
      expect(chip).toHaveClass('text-warning-800');
    });

    it('renders the default export identically to the named export', () => {
      render(<ChipDefault label="Via default export" />);

      const chip = screen.getByRole('status');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveTextContent('Via default export');
      expect(chip).toHaveClass('bg-warning-100');
      expect(chip).toHaveClass('text-warning-800');
    });

    it('renders nothing but the label (no extra wrapper content)', () => {
      const { container } = render(<Chip label="Only child" />);

      expect(container.firstChild).toBe(screen.getByRole('status'));
      expect(screen.getByRole('status').children).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Custom Styling & State Transitions
  // ---------------------------------------------------------------------------
  describe('Custom Styling & State Transitions', () => {
    it('overrides the default background class with bgClass', () => {
      render(<Chip label="Synced" bgClass="bg-success-100" />);

      const chip = screen.getByRole('status');
      expect(chip).toHaveClass('bg-success-100');
      expect(chip).not.toHaveClass('bg-warning-100');
    });

    it('overrides the default text class with textClass', () => {
      render(<Chip label="Synced" textClass="text-success-800" />);

      const chip = screen.getByRole('status');
      expect(chip).toHaveClass('text-success-800');
      expect(chip).not.toHaveClass('text-warning-800');
    });

    it('overrides both classes together while keeping base styling', () => {
      render(
        <Chip label="Error" bgClass="bg-danger-100" textClass="text-danger-800" />
      );

      const chip = screen.getByRole('status');
      expect(chip).toHaveClass('bg-danger-100');
      expect(chip).toHaveClass('text-danger-800');
      expect(chip).toHaveClass('rounded-full');
      expect(chip).toHaveClass('text-xs');
    });

    it('updates the label on rerender (dirty -> saved transition)', () => {
      const { rerender } = render(<Chip label="Unsaved changes" />);

      expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');

      rerender(<Chip label="All changes saved" />);
      expect(screen.getByRole('status')).toHaveTextContent('All changes saved');
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    });

    it('updates color classes on rerender without remounting', () => {
      const { container, rerender } = render(<Chip label="Unsaved changes" />);
      const initialNode = container.firstChild;

      rerender(<Chip label="All changes saved" bgClass="bg-success-100" textClass="text-success-800" />);

      const chip = screen.getByRole('status');
      expect(container.firstChild).toBe(initialNode);
      expect(chip).toHaveClass('bg-success-100');
      expect(chip).toHaveClass('text-success-800');
      expect(chip).not.toHaveClass('bg-warning-100');
      expect(chip).not.toHaveClass('text-warning-800');
    });

    it('falls back to default classes after custom classes are removed', () => {
      const { rerender } = render(
        <Chip label="Custom" bgClass="bg-success-100" textClass="text-success-800" />
      );

      expect(screen.getByRole('status')).toHaveClass('bg-success-100');

      rerender(<Chip label="Custom" />);
      const chip = screen.getByRole('status');
      expect(chip).toHaveClass('bg-warning-100');
      expect(chip).toHaveClass('text-warning-800');
      expect(chip).not.toHaveClass('bg-success-100');
      expect(chip).not.toHaveClass('text-success-800');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Invalid & Edge-Case Inputs (deterministic, no crash)
  // ---------------------------------------------------------------------------
  describe('Invalid & Edge-Case Inputs', () => {
    it('renders an empty label without crashing', () => {
      render(<Chip label="" />);

      const chip = screen.getByRole('status');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveTextContent('');
    });

    it('renders a whitespace-only label verbatim', () => {
      render(<Chip label="   " />);

      expect(screen.getByRole('status')).toHaveTextContent('   ', {
        normalizeWhitespace: false,
      });
    });

    it('renders a very long label without truncation or crash', () => {
      const longLabel = 'x'.repeat(500);
      render(<Chip label={longLabel} />);

      expect(screen.getByRole('status')).toHaveTextContent(longLabel);
    });

    it('renders labels with special characters and unicode safely as text', () => {
      render(<Chip label='<script>alert("xss")</script> · 配置 未保存' />);

      const chip = screen.getByRole('status');
      expect(chip).toHaveTextContent('<script>alert("xss")</script> · 配置 未保存');
      expect(chip.querySelector('script')).toBeNull();
    });

    it('renders a runtime-invalid label (undefined) as an empty chip without crashing', () => {
      // TypeScript prevents this at compile time; the runtime contract must stay deterministic.
      render(<Chip label={undefined as unknown as string} />);

      const chip = screen.getByRole('status');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveTextContent('');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Accessibility (axe)
  // ---------------------------------------------------------------------------
  describe('Accessibility (axe)', () => {
    it('has no axe violations with default warning styling', async () => {
      const { container } = render(<Chip label="Unsaved changes" />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with custom styling and an empty label', async () => {
      const { container } = render(
        <Chip label="" bgClass="bg-success-100" textClass="text-success-800" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
