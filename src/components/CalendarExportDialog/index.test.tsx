import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CalendarExportDialog } from './index';
import { CalendarExportDialog as OriginalComponent } from './CalendarExportDialog';

describe('CalendarExportDialog index', () => {
  it('exports CalendarExportDialog', () => {
    expect(CalendarExportDialog).toBeDefined();
    expect(CalendarExportDialog).toBe(OriginalComponent);
    expect(typeof CalendarExportDialog).toBe('function');
  });

  it('renders correctly when imported from index', () => {
    // Mock dialog methods since jsdom doesn't support them fully
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();

    const { getByText } = render(<CalendarExportDialog isOpen={true} onClose={vi.fn()} />);
    expect(getByText('Subscribe to Calendar')).toBeDefined();
  });
});
