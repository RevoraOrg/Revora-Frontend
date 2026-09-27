import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventDiffViewer } from './index';
import { EventDiffViewer as DirectEventDiffViewer } from './EventDiffViewer';

/**
 * `src/components/EventDiffViewer/index.ts` is the public entry point for the
 * diff viewer but had no test fixture of its own, so the barrel's contract —
 * which value export it exposes, and that it is the same component as
 * `./EventDiffViewer` — was unprotected. These tests exercise the module
 * through the barrel (not the deep import) and cover representative boundary
 * inputs: an empty field list, a diff with no `eventType`, and an added field.
 */

describe('EventDiffViewer barrel (index.ts)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-exports the same component instance as ./EventDiffViewer', () => {
    expect(EventDiffViewer).toBe(DirectEventDiffViewer);
    expect(EventDiffViewer.displayName).toBe('EventDiffViewer');
  });

  it('renders a collapsed toggle by default and reports the changed-field count', () => {
    render(
      <EventDiffViewer
        diff={{ eventType: 'payout.approved', fields: [{ label: 'Status', before: 'a', after: 'b' }] }}
      />
    );

    const toggle = screen.getByRole('button', { name: /show field diff for this entry/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('expands through the barrel export and exposes field-level values', () => {
    render(
      <EventDiffViewer
        diff={{ eventType: 'offering.updated', fields: [{ label: 'Share', before: '10', after: '12' }] }}
        entryLabel="offering 1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /show field diff for offering 1/i }));

    expect(screen.getByRole('region', { name: /field diff for offering.updated/i })).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('renders the explicit empty-diff state for an empty field list', () => {
    render(<EventDiffViewer diff={{ fields: [] }} defaultOpen />);

    expect(screen.getByText(/no field-level changes recorded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide field diff for this entry/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('handles a diff with no eventType and classifies a before-less field as added', () => {
    render(<EventDiffViewer diff={{ fields: [{ label: 'Amount' }] }} defaultOpen />);

    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Added')).toBeInTheDocument();
  });
});
