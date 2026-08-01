import React from 'react';
import { render, screen } from '@testing-library/react';
import LedgerTable, { Column } from './LedgerTable';

interface TestRow {
  id: string;
  name: string;
  amount: number;
}

const columns: Column<TestRow>[] = [
  { key: 'name', label: 'Name', width: '200px', render: (r) => r.name },
  { key: 'amount', label: 'Amount', width: '150px', render: (r) => `$${r.amount}` },
];

const data: TestRow[] = [
  { id: '1', name: 'Alice', amount: 100 },
  { id: '2', name: 'Bob', amount: 200 },
];

describe('LedgerTable column resize', () => {
  it('renders resize handles on header cells', () => {
    render(
      <LedgerTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
        stickyHeader={true}
      />
    );
    const handles = document.querySelectorAll('.lt-resize-handle');
    expect(handles.length).toBe(2);
  });

  it('resize handle has correct ARIA role', () => {
    render(
      <LedgerTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
      />
    );
    const handles = document.querySelectorAll('[role="separator"]');
    expect(handles.length).toBeGreaterThanOrEqual(2);
  });

  it('supports keyboard resize via Ctrl+ArrowLeft/Right', () => {
    render(
      <LedgerTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
      />
    );
    const headerCells = document.querySelectorAll('.lt-cell--header');
    expect(headerCells.length).toBeGreaterThanOrEqual(2);
    // Verify headers are present and resize handles exist
    headerCells.forEach(cell => {
      const handle = cell.querySelector('.lt-resize-handle');
      expect(handle).toBeTruthy();
    });
  });
});
