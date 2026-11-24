import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RevenueReports } from './RevenueReports';
import { RevenueReportSubmission } from './RevenueReportSubmission';
import { StartupDashboard } from './StartupDashboard';
import { RevenueReportsProvider } from '../lib/revenueReportsStore';

function setup(path = '/startup/revenue-calendar') {
  render(<RevenueReportsProvider><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/startup/revenue-calendar" element={<RevenueReports />} />
    <Route path="/startup/report-revenue" element={<RevenueReportSubmission />} />
    <Route path="/startup/dashboard" element={<StartupDashboard />} />
  </Routes></MemoryRouter></RevenueReportsProvider>);
  return userEvent.setup();
}
function day(date: string) {
  const cell = document.querySelector(`[role="gridcell"][data-date="${date}"]`);
  expect(cell).not.toBeNull();
  return cell as HTMLElement;
}
async function readBlob(blob: Blob) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 5, 15, 12));
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:revenue-test'), revokeObjectURL: vi.fn(),
  }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('startup revenue workflow', () => {
  it('links from the dashboard, prefills a due date, and updates its calendar dot after submission', async () => {
    const user = setup('/startup/dashboard');
    await user.click(screen.getByRole('link', { name: /Revenue Calendar, Import and Exports/i }));
    expect(day('2026-06-20')).toHaveAccessibleName(/Due/);
    await user.click(day('2026-06-20'));
    expect(screen.getByLabelText('Reporting period')).toHaveValue('2026-06');
    expect(screen.getByLabelText('Reporting period')).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: /Gross revenue/i }), '1234.50');
    await user.type(screen.getByRole('textbox', { name: /notes/i }), 'June revenue');
    await user.click(screen.getByRole('button', { name: /Submit report/i }));
    await screen.findByRole('heading', { name: 'Revenue Reports' });
    expect(day('2026-06-20')).toHaveAccessibleName(/Submitted/);
    await user.click(day('2026-06-20'));
    expect(screen.getByText('June revenue')).toBeInTheDocument();
  });

  it('imports a real CSV through the wizard, displays it on the calendar, and preserves it across navigation', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Import historical revenue from CSV' }));
    await user.upload(screen.getByLabelText('Select CSV file'), new File([
      'Date,Revenue,Currency\n2026-05-18,1250,EUR\ninvalid,12,USD',
    ], 'history.csv', { type: 'text/csv' }));
    await user.click(await screen.findByRole('button', { name: 'Preview' }));
    expect(screen.getByText('Invalid Date Format')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Import', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Confirm Import' }));
    expect(day('2026-05-18')).toHaveAccessibleName(/Submitted/);
    await user.click(day('2026-05-18'));
    expect(screen.getAllByText(/1,250/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('link', { name: 'Back to startup dashboard' }));
    await user.click(screen.getByRole('link', { name: /Revenue Calendar, Import and Exports/i }));
    await user.click(screen.getByRole('button', { name: /Previous month:/ }));
    expect(day('2026-05-18')).toHaveAccessibleName(/Submitted/);
  });

  it.each(['CSV', 'XLSX', 'PDF'])('exports filtered %s bytes and records the exact filename for download and deletion', async (format) => {
    const user = setup();
    await user.selectOptions(screen.getByLabelText('Status'), 'submitted');
    await user.click(screen.getByRole('button', { name: 'Export reports' }));
    const dialog = screen.getByRole('dialog', { name: 'Export Revenue Reports' });
    await user.click(within(dialog).getByRole('radio', { name: format, exact: true }));
    await user.click(within(dialog).getByRole('button', { name: 'Export', exact: true }));
    const fileName = `revenue-report-2026-06-filtered.${format.toLowerCase()}`;
    expect(screen.getByRole('cell', { name: fileName })).toBeInTheDocument();
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toContain(format === 'CSV' ? 'text/csv' : format === 'PDF' ? 'application/pdf' : 'spreadsheetml');
    const content = await readBlob(blob);
    if (format === 'CSV') {
      expect(content).toContain('2026-06-12');
      expect(content).not.toContain('2026-06-05');
      expect(content).not.toContain('2026-05-15');
    } else expect(content.startsWith(format === 'PDF' ? '%PDF' : 'PK')).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:revenue-test');
    const anchor = vi.mocked(HTMLAnchorElement.prototype.click).mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe(fileName);
    await user.click(screen.getByRole('button', { name: `Download ${fileName}` }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: /Delete export/ }));
    await user.click(within(screen.getByRole('dialog', { name: 'Delete Export' })).getByRole('button', { name: 'Delete', exact: true }));
    expect(screen.queryByRole('cell', { name: fileName })).not.toBeInTheDocument();
  });

  it('exports all reports in the current month even with a status filter', async () => {
    const user = setup();
    await user.selectOptions(screen.getByLabelText('Status'), 'due');
    await user.click(screen.getByRole('button', { name: 'Export reports' }));
    const dialog = screen.getByRole('dialog', { name: 'Export Revenue Reports' });
    await user.click(within(dialog).getByRole('radio', { name: /Current view/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Export', exact: true }));
    expect(screen.getByRole('cell', { name: 'revenue-report-2026-06.csv' })).toBeInTheDocument();
    const content = await readBlob(vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob);
    expect(content).toContain('2026-06-05');
    expect(content).toContain('2026-06-20');
    expect(content).not.toContain('2026-05-15');
  });

  it('recovers from download failures without recording an export that was not generated', async () => {
    const user = setup();
    vi.mocked(URL.createObjectURL).mockImplementationOnce(() => { throw new Error('Download unavailable'); });
    await user.click(screen.getByRole('button', { name: 'Export reports' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Export Revenue Reports' })).getByRole('button', { name: 'Export', exact: true }));
    expect(screen.getByRole('alert')).toHaveTextContent('Download unavailable');
    expect(screen.getByText('No export history')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Export reports' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Export Revenue Reports' })).getByRole('button', { name: 'Export', exact: true }));
    expect(screen.getByRole('cell', { name: 'revenue-report-2026-06-filtered.csv' })).toBeInTheDocument();
  });

  it('does not create a misleading empty export', async () => {
    const user = setup('/startup/revenue-calendar?month=2020-01');
    await user.click(screen.getByRole('button', { name: 'Export reports' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Export Revenue Reports' })).getByRole('button', { name: 'Export', exact: true }));
    expect(screen.getByRole('alert')).toHaveTextContent('No reports match');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
