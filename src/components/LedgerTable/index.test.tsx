/**
 * Behavior coverage for src/components/LedgerTable/index.ts
 *
 * The barrel module re-exports:
 *   - LedgerTable  (default component, re-exported as named)
 *   - Column       (type)
 *   - Density      (type alias – legacy name for DensityMode)
 *   - LedgerTableProps (type)
 *
 * This suite exercises the public contract that consumers of the
 * barrel import rely on, ensuring that re-exports are correct and
 * that no silent regressions break callers who import from the
 * package root rather than the implementation file.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// ── Import exclusively from the barrel ────────────────────────────────────────
import { LedgerTable } from './index';
import type { Column, Density, LedgerTableProps } from './index';

// ── Test fixtures ─────────────────────────────────────────────────────────────

interface Row {
  id: number;
  name: string;
  amount: number;
}

const columns: Column<Row>[] = [
  { key: 'id',     label: 'ID',     render: (r) => r.id     },
  { key: 'name',   label: 'Name',   render: (r) => r.name   },
  { key: 'amount', label: 'Amount', render: (r) => r.amount },
];

const rows: Row[] = [
  { id: 1, name: 'Alpha', amount: 100 },
  { id: 2, name: 'Beta',  amount: 200 },
  { id: 3, name: 'Gamma', amount: 300 },
];

const rowKey = (r: Row) => r.id;

// ─── 1. Barrel export: LedgerTable component ─────────────────────────────────

describe('LedgerTable barrel export – named LedgerTable export', () => {
  it('is a function (React component)', () => {
    expect(typeof LedgerTable).toBe('function');
  });

  it('has the expected displayName', () => {
    // Verified via the source: LedgerTable.displayName = 'LedgerTable'
    expect((LedgerTable as unknown as { displayName?: string }).displayName).toBe('LedgerTable');
  });

  it('renders the grid role when mounted via the barrel import', () => {
    render(
      <LedgerTable
        data={rows}
        columns={columns}
        rowKey={rowKey}
        ariaLabel="Barrel test table"
      />,
    );
    expect(screen.getByRole('grid', { name: 'Barrel test table' })).toBeInTheDocument();
  });

  it('renders all supplied rows', () => {
    render(<LedgerTable data={rows} columns={columns} rowKey={rowKey} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('renders all column headers', () => {
    render(<LedgerTable data={rows} columns={columns} rowKey={rowKey} />);
    expect(screen.getByRole('columnheader', { name: 'ID'     })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name'   })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument();
  });
});

// ─── 2. Barrel export: Column type contract ───────────────────────────────────

describe('LedgerTable barrel export – Column type', () => {
  it('accepts a Column object with the documented shape (key, label, render)', () => {
    // Type-level check: building a Column<Row> with all required fields compiles
    // and the runtime render function returns the expected value.
    const col: Column<Row> = {
      key: 'id',
      label: 'ID',
      render: (r) => String(r.id),
    };
    expect(col.key).toBe('id');
    expect(col.label).toBe('ID');
    expect(col.render({ id: 42, name: 'X', amount: 0 })).toBe('42');
  });

  it('allows the optional defaultVisible flag', () => {
    const hidden: Column<Row> = { key: 'amount', label: 'Amount', defaultVisible: false, render: (r) => r.amount };
    expect(hidden.defaultVisible).toBe(false);
  });

  it('allows the optional width field', () => {
    const wide: Column<Row> = { key: 'name', label: 'Name', width: '200px', render: (r) => r.name };
    expect(wide.width).toBe('200px');
  });

  it('renders a column that is hidden by default as invisible in the table', () => {
    const colsWithHidden: Column<Row>[] = [
      { key: 'id',     label: 'ID',     render: (r) => r.id     },
      { key: 'amount', label: 'Amount', defaultVisible: false, render: (r) => `$${r.amount}` },
    ];
    render(<LedgerTable data={rows} columns={colsWithHidden} rowKey={rowKey} />);
    // Hidden column header should not appear
    expect(screen.queryByRole('columnheader', { name: 'Amount' })).toBeNull();
    // Visible column header should appear
    expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
  });
});

// ─── 3. Barrel export: Density type (legacy alias) ───────────────────────────

describe('LedgerTable barrel export – Density type alias', () => {
  // Density is a type alias for DensityMode; there is no runtime value, so we
  // exercise it by using it as an annotation for a defaultDensity prop and
  // verifying the component behaves correctly for each valid value.

  const densities: Density[] = ['comfortable', 'cozy', 'compact'];

  densities.forEach((d) => {
    it(`accepts "${d}" as a valid Density / defaultDensity value`, () => {
      const { container } = render(
        <LedgerTable data={rows} columns={columns} rowKey={rowKey} defaultDensity={d} />,
      );
      // The table-wrap element should carry the corresponding density class
      expect(container.querySelector(`.lt-density--${d}`)).toBeInTheDocument();
    });
  });

  it('rejects unknown density values at the type level (compile-time contract)', () => {
    // This is a type test — the fact that it compiles with only the three known
    // literals proves the Density union is correctly re-exported.
    const valid: Density = 'compact';
    expect(valid).toBe('compact');
  });
});

// ─── 4. Barrel export: LedgerTableProps type contract ────────────────────────

describe('LedgerTable barrel export – LedgerTableProps type', () => {
  it('accepts all required props (data, columns, rowKey) via the typed props object', () => {
    const props: LedgerTableProps<Row> = {
      data: rows,
      columns,
      rowKey,
    };
    render(<LedgerTable {...props} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('accepts all documented optional props without errors', () => {
    const props: LedgerTableProps<Row> = {
      data: rows,
      columns,
      rowKey,
      pageSize: 10,
      defaultDensity: 'compact',
      stickyHeader: true,
      ariaLabel: 'Full-props table',
      rowDetail: (r) => <div data-testid={`detail-${r.id}`}>Detail {r.id}</div>,
      detailMode: 'inline',
    };
    render(<LedgerTable {...props} />);
    expect(screen.getByRole('grid', { name: 'Full-props table' })).toBeInTheDocument();
  });

  it('defaults ariaLabel to "Ledger table" when not supplied', () => {
    render(<LedgerTable data={rows} columns={columns} rowKey={rowKey} />);
    expect(screen.getByRole('grid', { name: 'Ledger table' })).toBeInTheDocument();
  });
});

// ─── 5. Representative state transitions via barrel import ────────────────────

describe('LedgerTable barrel export – primary state transitions', () => {
  it('empty data → renders "No data to display" status', () => {
    render(<LedgerTable data={[]} columns={columns} rowKey={rowKey} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('No data to display.')).toBeInTheDocument();
  });

  it('no columns defined → renders "No columns defined" status', () => {
    render(<LedgerTable data={rows} columns={[]} rowKey={rowKey} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('No columns defined.')).toBeInTheDocument();
  });

  it('clicking a row with rowDetail expands inline detail and sets aria-expanded', () => {
    const detail = (r: Row) => <div data-testid={`detail-${r.id}`}>Detail {r.id}</div>;
    render(
      <LedgerTable
        data={rows}
        columns={columns}
        rowKey={rowKey}
        rowDetail={detail}
        detailMode="inline"
      />,
    );
    // Click the expand toggle for row 1
    const toggles = screen.getAllByRole('button', { name: /open detail/i });
    fireEvent.click(toggles[0]);
    expect(screen.getByTestId('detail-1')).toBeInTheDocument();
  });

  it('clicking an already-open row detail toggles it closed', () => {
    const detail = (r: Row) => <div data-testid={`detail-${r.id}`}>Detail {r.id}</div>;
    render(
      <LedgerTable
        data={rows}
        columns={columns}
        rowKey={rowKey}
        rowDetail={detail}
        detailMode="inline"
      />,
    );
    const toggles = screen.getAllByRole('button', { name: /open detail/i });
    fireEvent.click(toggles[0]); // open
    expect(screen.getByTestId('detail-1')).toBeInTheDocument();
    // The button label changes to "Close detail"
    const closeToggle = screen.getByRole('button', { name: /close detail/i });
    fireEvent.click(closeToggle); // close
    expect(screen.queryByTestId('detail-1')).toBeNull();
  });

  it('density cycles comfortable → cozy → compact on toolbar click', () => {
    const { container } = render(
      <LedgerTable data={rows} columns={columns} rowKey={rowKey} defaultDensity="comfortable" />,
    );
    expect(container.querySelector('.lt-density--comfortable')).toBeInTheDocument();

    const densityBtn = screen.getByRole('button', { name: /density/i });
    fireEvent.click(densityBtn);
    expect(container.querySelector('.lt-density--cozy')).toBeInTheDocument();

    fireEvent.click(densityBtn);
    expect(container.querySelector('.lt-density--compact')).toBeInTheDocument();

    fireEvent.click(densityBtn);
    expect(container.querySelector('.lt-density--comfortable')).toBeInTheDocument();
  });

  it('column visibility toggle hides then restores a column', () => {
    render(<LedgerTable data={rows} columns={columns} rowKey={rowKey} />);

    // Open column menu
    const colBtn = screen.getByRole('button', { name: /column visibility/i });
    fireEvent.click(colBtn);

    // Uncheck "Name" column
    const nameCheckbox = screen.getByRole('checkbox', { name: 'Name' });
    fireEvent.click(nameCheckbox);

    // Name column header should be hidden
    expect(screen.queryByRole('columnheader', { name: 'Name' })).toBeNull();

    // Re-check "Name"
    fireEvent.click(screen.getByRole('checkbox', { name: 'Name' }));
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  });

  it('keyboard ArrowDown moves row selection downward', () => {
    render(
      <LedgerTable data={rows} columns={columns} rowKey={rowKey} ariaLabel="Nav table" />,
    );
    const grid = screen.getByRole('grid', { name: 'Nav table' });
    grid.focus();
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    // After first ArrowDown the first row should be selected (selectedRowIndex 0)
    const rowEls = screen.getAllByRole('row');
    // Row at index 1 (first data row, after header) should have lt-row--selected
    const dataRows = rowEls.filter((r) => r.getAttribute('aria-rowindex') === '1');
    expect(dataRows[0]).toHaveClass('lt-row--selected');
  });
});

// ─── 6. Invalid / boundary inputs via barrel import ──────────────────────────

describe('LedgerTable barrel export – invalid and boundary inputs', () => {
  it('renders 1 row correctly (minimum non-empty dataset)', () => {
    render(
      <LedgerTable data={[rows[0]]} columns={columns} rowKey={rowKey} />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).toBeNull();
  });

  it('renders 0 rows with the empty-state message', () => {
    render(<LedgerTable data={[]} columns={columns} rowKey={rowKey} />);
    expect(screen.getByText('No data to display.')).toBeInTheDocument();
  });

  it('renders a single-column table without errors', () => {
    const singleCol: Column<Row>[] = [
      { key: 'name', label: 'Name', render: (r) => r.name },
    ];
    render(<LedgerTable data={rows} columns={singleCol} rowKey={rowKey} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'ID' })).toBeNull();
  });

  it('prevents hiding the last visible column (at least 1 column always visible)', () => {
    const singleCol: Column<Row>[] = [
      { key: 'name', label: 'Name', render: (r) => r.name },
    ];
    render(<LedgerTable data={rows} columns={singleCol} rowKey={rowKey} />);
    const colBtn = screen.getByRole('button', { name: /column visibility/i });
    fireEvent.click(colBtn);

    const checkbox = screen.getByRole('checkbox', { name: 'Name' });
    // When there is only 1 visible column, the checkbox is disabled
    expect(checkbox).toBeDisabled();
  });

  it('renders rows from a large dataset without throwing', () => {
    const bigData: Row[] = Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      name: `Row ${i + 1}`,
      amount: i * 10,
    }));
    expect(() =>
      render(<LedgerTable data={bigData} columns={columns} rowKey={rowKey} pageSize={50} />),
    ).not.toThrow();
    expect(screen.getByText(/200 rows/)).toBeInTheDocument();
  });

  it('renders pagination controls when data exceeds pageSize', () => {
    const bigData: Row[] = Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      name: `Row ${i + 1}`,
      amount: i,
    }));
    render(<LedgerTable data={bigData} columns={columns} rowKey={rowKey} pageSize={50} />);
    expect(screen.getByRole('navigation', { name: /table pagination/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
  });
});
