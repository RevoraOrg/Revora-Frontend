import { useState, useCallback, useRef } from 'react';

export interface UseLedgerSelectionOptions {
  rowCount: number;
  /** Called when Ctrl/Cmd+C is triggered; receives TSV string */
  onCopy: (tsv: string, rowCount: number) => void;
  /** Visible column headers (in order) */
  headers: string[];
  /** Returns TSV cells for a given page-data index */
  getRowCells: (index: number) => string[];
}

export interface UseLedgerSelectionReturn {
  selectedIds: Set<number>;
  anchorIndex: number;
  isSelected: (index: number) => boolean;
  handleRowSelect: (index: number, shiftKey: boolean) => void;
  selectAll: (total: number) => void;
  clearSelection: () => void;
  handleKeyDown: (e: React.KeyboardEvent, focusedIndex: number, maxIndex: number) => void;
}

export function useLedgerSelection({
  rowCount,
  onCopy,
  headers,
  getRowCells,
}: UseLedgerSelectionOptions): UseLedgerSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const anchorRef = useRef<number>(-1);
  const [anchorIndex, setAnchorIndex] = useState(-1);

  const isSelected = useCallback((i: number) => selectedIds.has(i), [selectedIds]);

  const setAnchor = (i: number) => {
    anchorRef.current = i;
    setAnchorIndex(i);
  };

  const handleRowSelect = useCallback((index: number, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (shiftKey && anchorRef.current >= 0) {
        const lo = Math.min(anchorRef.current, index);
        const hi = Math.max(anchorRef.current, index);
        for (let i = lo; i <= hi; i++) next.add(i);
      } else {
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        setAnchor(index);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((total: number) => {
    setSelectedIds(new Set(Array.from({ length: total }, (_, i) => i)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setAnchor(-1);
  }, []);

  const buildTsv = useCallback((ids: Set<number>): string => {
    const sorted = [...ids].sort((a, b) => a - b);
    const rows = sorted.map(i => getRowCells(i).join('\t'));
    return [headers.join('\t'), ...rows].join('\n');
  }, [headers, getRowCells]);

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent,
    focusedIndex: number,
    maxIndex: number,
  ) => {
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key === 'a') {
      e.preventDefault();
      selectAll(rowCount);
      return;
    }

    if (mod && e.key === 'c') {
      e.preventDefault();
      if (selectedIds.size > 0) {
        const tsv = buildTsv(selectedIds);
        onCopy(tsv, selectedIds.size);
      }
      return;
    }

    if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const next = e.key === 'ArrowDown'
        ? Math.min(focusedIndex + 1, maxIndex)
        : Math.max(focusedIndex - 1, 0);
      handleRowSelect(next, true);
      return;
    }
  }, [selectedIds, rowCount, buildTsv, onCopy, handleRowSelect, selectAll]);

  return {
    selectedIds,
    anchorIndex,
    isSelected,
    handleRowSelect,
    selectAll,
    clearSelection,
    handleKeyDown,
  };
}
