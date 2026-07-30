import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLedgerSelection } from './useLedgerSelection';

const HEADERS = ['Date', 'Type', 'Amount'];
const makeGetRowCells = (rows: string[][]) => (i: number) => rows[i] ?? [];

const rows = [
  ['2025-01-01', 'investment', '$100.00'],
  ['2025-01-02', 'payout',     '$200.00'],
  ['2025-01-03', 'fee',        '$10.00'],
  ['2025-01-04', 'distribution', '$50.00'],
  ['2025-01-05', 'investment', '$300.00'],
];

function setup(onCopy = vi.fn()) {
  return renderHook(() =>
    useLedgerSelection({
      rowCount: rows.length,
      headers: HEADERS,
      getRowCells: makeGetRowCells(rows),
      onCopy,
    }),
  );
}

function makeKeyEvent(key: string, opts: Partial<React.KeyboardEvent> = {}): React.KeyboardEvent {
  return { key, ctrlKey: false, metaKey: false, shiftKey: false, preventDefault: vi.fn(), ...opts } as unknown as React.KeyboardEvent;
}

describe('useLedgerSelection', () => {
  it('starts with empty selection', () => {
    const { result } = setup();
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.anchorIndex).toBe(-1);
  });

  it('selects a single row via handleRowSelect', () => {
    const { result } = setup();
    act(() => result.current.handleRowSelect(1, false));
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.isSelected(0)).toBe(false);
  });

  it('deselects an already-selected row on second click', () => {
    const { result } = setup();
    act(() => result.current.handleRowSelect(2, false));
    act(() => result.current.handleRowSelect(2, false));
    expect(result.current.isSelected(2)).toBe(false);
  });

  it('sets anchor on single select', () => {
    const { result } = setup();
    act(() => result.current.handleRowSelect(3, false));
    expect(result.current.anchorIndex).toBe(3);
  });

  it('extends range with shiftKey from anchor', () => {
    const { result } = setup();
    act(() => result.current.handleRowSelect(1, false)); // anchor = 1
    act(() => result.current.handleRowSelect(4, true));  // shift-click 4
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.isSelected(2)).toBe(true);
    expect(result.current.isSelected(3)).toBe(true);
    expect(result.current.isSelected(4)).toBe(true);
    expect(result.current.isSelected(0)).toBe(false);
  });

  it('extends range upward with shiftKey', () => {
    const { result } = setup();
    act(() => result.current.handleRowSelect(3, false)); // anchor = 3
    act(() => result.current.handleRowSelect(1, true));  // shift-click 1
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.isSelected(2)).toBe(true);
    expect(result.current.isSelected(3)).toBe(true);
    expect(result.current.isSelected(0)).toBe(false);
  });

  it('shift-range with no anchor falls back to single select', () => {
    const { result } = setup();
    act(() => result.current.handleRowSelect(2, true)); // no anchor yet
    expect(result.current.isSelected(2)).toBe(true);
  });

  it('selectAll selects all rows', () => {
    const { result } = setup();
    act(() => result.current.selectAll(rows.length));
    for (let i = 0; i < rows.length; i++) {
      expect(result.current.isSelected(i)).toBe(true);
    }
  });

  it('clearSelection empties the set and resets anchor', () => {
    const { result } = setup();
    act(() => result.current.selectAll(rows.length));
    act(() => result.current.clearSelection());
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.anchorIndex).toBe(-1);
  });

  describe('handleKeyDown — Ctrl+A', () => {
    it('selects all rows on Ctrl+A', () => {
      const { result } = setup();
      act(() => result.current.handleKeyDown(makeKeyEvent('a', { ctrlKey: true }), 0, rows.length - 1));
      expect(result.current.selectedIds.size).toBe(rows.length);
    });

    it('selects all rows on Meta+A (Mac)', () => {
      const { result } = setup();
      act(() => result.current.handleKeyDown(makeKeyEvent('a', { metaKey: true }), 0, rows.length - 1));
      expect(result.current.selectedIds.size).toBe(rows.length);
    });

    it('calls preventDefault on Ctrl+A', () => {
      const { result } = setup();
      const e = makeKeyEvent('a', { ctrlKey: true });
      act(() => result.current.handleKeyDown(e, 0, rows.length - 1));
      expect(e.preventDefault).toHaveBeenCalled();
    });
  });

  describe('handleKeyDown — Ctrl+C', () => {
    it('calls onCopy with correct row count', () => {
      const onCopy = vi.fn();
      const { result } = setup(onCopy);
      act(() => result.current.handleRowSelect(0, false));
      act(() => result.current.handleRowSelect(1, true));
      act(() => result.current.handleKeyDown(makeKeyEvent('c', { ctrlKey: true }), 1, rows.length - 1));
      expect(onCopy).toHaveBeenCalledOnce();
      expect(onCopy.mock.calls[0][1]).toBe(2); // 2 rows
    });

    it('TSV includes headers as first line', () => {
      const onCopy = vi.fn();
      const { result } = setup(onCopy);
      act(() => result.current.handleRowSelect(0, false));
      act(() => result.current.handleKeyDown(makeKeyEvent('c', { ctrlKey: true }), 0, rows.length - 1));
      const tsv: string = onCopy.mock.calls[0][0];
      expect(tsv.split('\n')[0]).toBe('Date\tType\tAmount');
    });

    it('TSV rows are tab-separated and sorted by index', () => {
      const onCopy = vi.fn();
      const { result } = setup(onCopy);
      act(() => result.current.handleRowSelect(2, false));
      act(() => result.current.handleRowSelect(0, true)); // range 0-2
      act(() => result.current.handleKeyDown(makeKeyEvent('c', { ctrlKey: true }), 2, rows.length - 1));
      const tsv: string = onCopy.mock.calls[0][0];
      const lines = tsv.split('\n');
      expect(lines[1]).toBe(rows[0].join('\t'));
      expect(lines[2]).toBe(rows[1].join('\t'));
      expect(lines[3]).toBe(rows[2].join('\t'));
    });

    it('does not call onCopy when selection is empty', () => {
      const onCopy = vi.fn();
      const { result } = setup(onCopy);
      act(() => result.current.handleKeyDown(makeKeyEvent('c', { ctrlKey: true }), 0, rows.length - 1));
      expect(onCopy).not.toHaveBeenCalled();
    });

    it('calls preventDefault on Ctrl+C', () => {
      const { result } = setup();
      const e = makeKeyEvent('c', { ctrlKey: true });
      act(() => result.current.handleRowSelect(0, false));
      act(() => result.current.handleKeyDown(e, 0, rows.length - 1));
      expect(e.preventDefault).toHaveBeenCalled();
    });
  });

  describe('handleKeyDown — Shift+Arrow range', () => {
    it('Shift+ArrowDown extends selection downward', () => {
      const { result } = setup();
      act(() => result.current.handleRowSelect(1, false)); // anchor = 1
      act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown', { shiftKey: true }), 1, rows.length - 1));
      expect(result.current.isSelected(1)).toBe(true);
      expect(result.current.isSelected(2)).toBe(true);
    });

    it('Shift+ArrowUp extends selection upward', () => {
      const { result } = setup();
      act(() => result.current.handleRowSelect(3, false)); // anchor = 3
      act(() => result.current.handleKeyDown(makeKeyEvent('ArrowUp', { shiftKey: true }), 3, rows.length - 1));
      expect(result.current.isSelected(2)).toBe(true);
      expect(result.current.isSelected(3)).toBe(true);
    });

    it('Shift+ArrowDown clamps at maxIndex', () => {
      const { result } = setup();
      act(() => result.current.handleRowSelect(4, false));
      act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown', { shiftKey: true }), 4, rows.length - 1));
      expect(result.current.isSelected(4)).toBe(true);
    });

    it('Shift+ArrowUp clamps at 0', () => {
      const { result } = setup();
      act(() => result.current.handleRowSelect(0, false));
      act(() => result.current.handleKeyDown(makeKeyEvent('ArrowUp', { shiftKey: true }), 0, rows.length - 1));
      expect(result.current.isSelected(0)).toBe(true);
    });

    it('calls preventDefault on Shift+Arrow', () => {
      const { result } = setup();
      const e = makeKeyEvent('ArrowDown', { shiftKey: true });
      act(() => result.current.handleRowSelect(0, false));
      act(() => result.current.handleKeyDown(e, 0, rows.length - 1));
      expect(e.preventDefault).toHaveBeenCalled();
    });
  });

  describe('large selection', () => {
    it('handles 1000-row select-all without error', () => {
      const bigRows = Array.from({ length: 1000 }, (_, i) => [`row-${i}`, 'type', '$0']);
      const { result } = renderHook(() =>
        useLedgerSelection({
          rowCount: 1000,
          headers: HEADERS,
          getRowCells: makeGetRowCells(bigRows),
          onCopy: vi.fn(),
        }),
      );
      act(() => result.current.selectAll(1000));
      expect(result.current.selectedIds.size).toBe(1000);
    });
  });
});
