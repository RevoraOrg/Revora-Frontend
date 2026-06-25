import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import LedgerTable from './LedgerTable';
import type { Column } from './LedgerTable';

interface TestRow {
  id: number;
  name: string;
  value: number;
}

const columns: Column<TestRow>[] = [
  { key: 'id', label: 'ID', render: (r) => r.id },
  { key: 'name', label: 'Name', render: (r) => r.name },
  { key: 'value', label: 'Value', render: (r) => r.value },
];

const data: TestRow[] = [
  { id: 1, name: 'Alpha', value: 100 },
  { id: 2, name: 'Beta', value: 200 },
  { id: 3, name: 'Gamma', value: 300 },
];

describe('LedgerTable', () => {
  it('renders table with data', () => {
    render(
      <LedgerTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
        ariaLabel="Test table"
      />,
    );

    expect(screen.getByRole('grid', { name: 'Test table' })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(
      <LedgerTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
  });

  it('shows row count', () => {
    render(
      <LedgerTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
      />,
    );

    expect(screen.getByText('3 rows')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(
      <LedgerTable
        data={[]}
        columns={columns}
        rowKey={(r) => r.id}
      />,
    );

    expect(screen.getByText('No data to display.')).toBeInTheDocument();
  });

  it('shows empty state when no columns', () => {
    render(
      <LedgerTable
        data={data}
        columns={[]}
        rowKey={(r) => r.id}
      />,
    );

    expect(screen.getByText('No columns defined.')).toBeInTheDocument();
  });

  it('toggles column visibility', async () => {
    const user = userEvent.setup();
    render(
      <LedgerTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
      />,
    );

    const columnsBtn = screen.getByLabelText('Column visibility');
    await user.click(columnsBtn);

    const idCheckbox = screen.getByLabelText(/Toggle column visibility.*ID/);
    await user.click(idCheckbox);

    expect(screen.queryByRole('columnheader', { name: 'ID' })).not.toBeInTheDocument();
  });

  it('does not allow hiding the last column', async () => {
    const user = userEvent.setup();
    render(
      <LedgerTable
        data={data}
        columns={[{ key: 'id', label: 'ID', render: (r) => r.id }]}
        rowKey={(r) => r.id}
      />,
    );

    const columnsBtn = screen.getByLabelText('Column visibility');
    await user.click(columnsBtn);

    const checkbox = screen.getByRole('menuitemcheckbox');
    expect(checkbox).toBeDisabled();
  });

  it('cycles density on button click', async () => {
    const user = userEvent.setup();
    render(
      <LedgerTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
      />,
    );

    const densityBtn = screen.getByLabelText(/Density/);
    expect(densityBtn).toHaveTextContent('normal');

    await user.click(densityBtn);
    // After one click it should cycle to next density
    expect(densityBtn).not.toHaveTextContent('normal');
  });

  it('handles keyboard navigation', () => {
    render(
      <LedgerTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
      />,
    );

    const grid = screen.getByRole('grid');
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    fireEvent.keyDown(grid, { key: 'ArrowUp' });

    expect(grid).toBeInTheDocument();
  });

  it('handles pagination', () => {
    const manyRows = Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      name: `Row ${i + 1}`,
      value: (i + 1) * 10,
    }));

    render(
      <LedgerTable
        data={manyRows}
        columns={columns}
        rowKey={(r) => r.id}
        pageSize={50}
      />,
    );

    expect(screen.getByText('60 rows')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    const nextBtn = screen.getByLabelText('Next page');
    fireEvent.click(nextBtn);

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('opens and closes row detail', async () => {
    const user = userEvent.setup();
    const DetailComponent = ({ row }: { row: TestRow }) => (
      <div data-testid="detail-content">{row.name} detail</div>
    );

    render(
      <LedgerTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
        rowDetail={(row) => <DetailComponent row={row} />}
      />,
    );

    const toggleButtons = screen.getAllByLabelText('Open detail');
    await user.click(toggleButtons[0]);

    expect(screen.getByTestId('detail-content')).toBeInTheDocument();
    expect(screen.getByText('Alpha detail')).toBeInTheDocument();

    const closeButton = screen.getByLabelText('Close detail');
    await user.click(closeButton);

    expect(screen.queryByTestId('detail-content')).not.toBeInTheDocument();
  });
});
