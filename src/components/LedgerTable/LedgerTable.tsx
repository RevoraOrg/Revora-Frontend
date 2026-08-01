import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Columns,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Check,
  Copy,
} from 'lucide-react';
import './LedgerTable.css';

// Global density modes (matches DensityProvider)
export type DensityMode = 'comfortable' | 'cozy' | 'compact';
// Legacy alias kept for backward compat
export type Density = DensityMode;

export interface Column<T> {
  key: string;
  label: string;
  defaultVisible?: boolean;
  width?: string;
  render: (row: T) => React.ReactNode;
}

export interface LedgerTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  rowDetail?: (row: T) => React.ReactNode;
  pageSize?: number;
  defaultDensity?: DensityMode;
  stickyHeader?: boolean;
  ariaLabel?: string;
  groupableColumns?: { key: keyof T; label: string }[];
  renderGroupHeader?: (groupValue: any, items: T[]) => React.ReactNode;
}

const DENSITY_CLASS: Record<DensityMode, string> = {
  comfortable: 'lt-density--comfortable',
  cozy:        'lt-density--cozy',
  compact:     'lt-density--compact',
};

const ROW_HEIGHTS: Record<DensityMode, number> = {
  comfortable: 56,
  cozy:        48,
  compact:     36,
};

const OVERSCAN = 5;

type FlattenedRow<T> = 
  | { isGroup: true; key: string; value: any; items: T[] }
  | { isGroup: false; row: T };

function formatRowForCopy<T>(row: T, columns: Column<T>[]): string {
  return columns.map(col => {
    // Render to string by extracting text content
    const rendered = col.render(row);
    if (rendered === null || rendered === undefined) return '';
    if (typeof rendered === 'string') return rendered;
    if (typeof rendered === 'number' || typeof rendered === 'boolean') return String(rendered);
    // React element — try to get text content
    const el = rendered as React.ReactElement;
    if (el.props && el.props.children) {
      // Recursively extract text from children
      const extractText = (child: any): string => {
        if (typeof child === 'string') return child;
        if (typeof child === 'number') return String(child);
        if (Array.isArray(child)) return child.map(extractText).join('');
        if (child && typeof child === 'object' && 'props' in child && child.props?.children) {
          return extractText(child.props.children);
        }
        return '';
      };
      return extractText(el.props.children);
    }
    return '';
  }).join('\t');
}

function LedgerTable<T>({
  data,
  columns,
  rowKey,
  rowDetail,
  pageSize = 50,
  defaultDensity = 'cozy',
  stickyHeader = true,
  ariaLabel = 'Ledger table',
  groupableColumns,
  renderGroupHeader,
}: LedgerTableProps<T>) {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() =>
    new Set(columns.filter((c) => c.defaultVisible !== false).map((c) => c.key)),
  );
  const [density, setDensity] = useState<DensityMode>(defaultDensity);
  const [currentPage, setCurrentPage] = useState(0);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showDensityMenu, setShowDensityMenu] = useState(false);
  // Multi-select: Set of selected row keys
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);
  const [detailRow, setDetailRow] = useState<string | number | null>(null);
  
  const [groupBy, setGroupBy] = useState<keyof T | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const columnMenuRef = useRef<HTMLDivElement>(null);
  const densityMenuRef = useRef<HTMLDivElement>(null);

  const flattenedData = useMemo(() => {
    if (!groupBy) {
      return data.map(row => ({ isGroup: false, row } as FlattenedRow<T>));
    }

    const groups = new Map<any, T[]>();
    data.forEach(row => {
      const val = row[groupBy];
      if (!groups.has(val)) groups.set(val, []);
      groups.get(val)!.push(row);
    });

    const flat: FlattenedRow<T>[] = [];
    groups.forEach((items, value) => {
      const groupKey = String(value);
      flat.push({ isGroup: true, key: groupKey, value, items });
      if (!collapsedGroups.has(groupKey)) {
        items.forEach(row => flat.push({ isGroup: false, row }));
      }
    });
    return flat;
  }, [data, groupBy, collapsedGroups]);

  const totalPages = Math.max(1, Math.ceil(flattenedData.length / pageSize));
  
  // reset to page 0 if grouping changes
  useEffect(() => {
    setCurrentPage(0);
  }, [groupBy]);

  const pageData = useMemo(
    () => flattenedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [flattenedData, currentPage, pageSize],
  );

  const filteredColumns = useMemo(
    () => columns.filter((c) => visibleColumns.has(c.key)),
    [columns, visibleColumns],
  );

  const rowHeight = ROW_HEIGHTS[density];

  const [containerHeight, setContainerHeight] = useState(400);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalHeight = pageData.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const endIndex = Math.min(
    pageData.length,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + OVERSCAN,
  );
  const visibleRows = useMemo(
    () => pageData.slice(startIndex, endIndex),
    [pageData, startIndex, endIndex],
  );

  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [focusedColumnIndex, setFocusedColumnIndex] = useState<number>(-1);
  const [focusBounds, setFocusBounds] = useState<{ left: number; width: number } | null>(null);
  const focusedRowRef = useRef<HTMLDivElement | null>(null);

  const totalCols = (rowDetail ? 1 : 0) + filteredColumns.length;

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    const current = scrollRef.current;
    if (current) {
      observer.observe(current);
    }
    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setShowColumnMenu(false);
      }
      if (densityMenuRef.current && !densityMenuRef.current.contains(e.target as Node)) {
        setShowDensityMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateFocusBounds = useCallback(() => {
    if (selectedRowIndex < 0 || focusedColumnIndex < 0 || !focusedRowRef.current) {
      setFocusBounds(null);
      return;
    }
    const children = focusedRowRef.current.children;
    if (children && children[focusedColumnIndex]) {
      const cellEl = children[focusedColumnIndex] as HTMLElement;
      setFocusBounds({
        left: cellEl.offsetLeft,
        width: cellEl.offsetWidth,
      });
    } else {
      setFocusBounds(null);
    }
  }, [selectedRowIndex, focusedColumnIndex]);

  useEffect(() => {
    updateFocusBounds();
  }, [updateFocusBounds, selectedRowIndex, focusedColumnIndex, startIndex, endIndex, filteredColumns, density, scrollTop, containerHeight]);

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const cycleDensity = useCallback(() => {
    setDensity((prev) => {
      const order: DensityMode[] = ['comfortable', 'cozy', 'compact'];
      const idx = order.indexOf(prev);
      return order[(idx + 1) % order.length];
    });
  }, []);

  const selectRange = useCallback((fromIndex: number, toIndex: number) => {
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const newSelected = new Set<string | number>();
    for (let i = start; i <= end; i++) {
      const item = pageData[i];
      if (item && !item.isGroup) {
        newSelected.add(rowKey(item.row));
      }
    }
    setSelectedRows(newSelected);
  }, [pageData, rowKey]);

  const handleRowClick = useCallback(
    (row: T, index: number, event?: React.MouseEvent) => {
      const key = rowKey(row);

      if (event?.shiftKey && lastSelectedIndex >= 0) {
        // Shift+click: range select from last selected index to current
        selectRange(lastSelectedIndex, index);
        setLastSelectedIndex(index);
      } else if (event?.ctrlKey || event?.metaKey) {
        // Ctrl/Cmd+click: toggle individual row selection
        setSelectedRows(prev => {
          const next = new Set(prev);
          if (next.has(key)) {
            next.delete(key);
          } else {
            next.add(key);
          }
          return next;
        });
        setLastSelectedIndex(index);
      } else {
        // Normal click: select single row, clear others
        if (rowDetail) {
          setDetailRow((prev) => (prev === key ? null : key));
        }
        setSelectedRows(new Set([key]));
        setLastSelectedIndex(index);
      }
      setSelectedRowIndex(index);
    },
    [rowKey, rowDetail, lastSelectedIndex, selectRange],
  );

  const handleCellClick = useCallback(
    (row: T, index: number, colIndex: number, e: React.MouseEvent) => {
      e.stopPropagation();
      handleRowClick(row, index, e);
      setFocusedColumnIndex(colIndex);
    },
    [handleRowClick],
  );

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Copy selected rows to clipboard as TSV
  const copySelectedRows = useCallback(() => {
    if (selectedRows.size === 0) return;

    const selectedData = data.filter(row => selectedRows.has(rowKey(row)));
    
    // Build TSV: header + data rows
    const header = filteredColumns.map(col => col.label).join('\t');
    const rows = selectedData.map(row => formatRowForCopy(row, filteredColumns));
    const tsv = [header, ...rows].join('\n');

    navigator.clipboard.writeText(tsv).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = tsv;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {
        // silently fail
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }, [selectedRows, data, rowKey, filteredColumns]);

  // Select all non-group rows on current page
  const selectAllOnPage = useCallback(() => {
    const newSelected = new Set<string | number>();
    pageData.forEach(item => {
      if (!item.isGroup) {
        newSelected.add(rowKey(item.row));
      }
    });
    setSelectedRows(newSelected);
  }, [pageData, rowKey]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const maxIndex = pageData.length - 1;
      const isRtl = scrollRef.current
        ? getComputedStyle(scrollRef.current).direction === 'rtl' || document.dir === 'rtl'
        : false;

      // Ctrl+C: copy selected rows
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelectedRows();
        return;
      }

      // Ctrl+A: select all on page
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAllOnPage();
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedRowIndex((prev) => {
            const next = Math.min(prev + 1, maxIndex);
            if (next >= 0) {
              const item = pageData[next];
              if (!item.isGroup) {
                if (e.shiftKey && lastSelectedIndex >= 0) {
                  selectRange(lastSelectedIndex, next);
                } else {
                  setSelectedRows(new Set([rowKey(item.row)]));
                  setLastSelectedIndex(next);
                }
                if (rowDetail) setDetailRow(rowKey(item.row));
              }
            }
            return next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedRowIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            if (next >= 0) {
              const item = pageData[next];
              if (!item.isGroup) {
                if (e.shiftKey && lastSelectedIndex >= 0) {
                  selectRange(lastSelectedIndex, next);
                } else {
                  setSelectedRows(new Set([rowKey(item.row)]));
                  setLastSelectedIndex(next);
                }
                if (rowDetail) setDetailRow(rowKey(item.row));
              }
            }
            return next;
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedColumnIndex((prev) => {
            if (isRtl) {
              return Math.max(-1, prev - 1);
            } else {
              return Math.min(totalCols - 1, prev + 1);
            }
          });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedColumnIndex((prev) => {
            if (isRtl) {
              return Math.min(totalCols - 1, prev + 1);
            } else {
              return Math.max(-1, prev - 1);
            }
          });
          break;
        case 'Home':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            setSelectedRowIndex(0);
            // Select first non-group row
            const first = pageData[0];
            if (first && !first.isGroup) {
              if (e.shiftKey && lastSelectedIndex >= 0) {
                selectRange(lastSelectedIndex, 0);
              } else {
                setSelectedRows(new Set([rowKey(first.row)]));
                setLastSelectedIndex(0);
              }
            }
          } else {
            setFocusedColumnIndex(0);
          }
          break;
        case 'End':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            setSelectedRowIndex(maxIndex);
            const last = pageData[maxIndex];
            if (last && !last.isGroup) {
              if (e.shiftKey && lastSelectedIndex >= 0) {
                selectRange(lastSelectedIndex, maxIndex);
              } else {
                setSelectedRows(new Set([rowKey(last.row)]));
                setLastSelectedIndex(maxIndex);
              }
            }
          } else {
            setFocusedColumnIndex(Math.max(0, totalCols - 1));
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (selectedRowIndex >= 0 && selectedRowIndex <= maxIndex) {
            const item = pageData[selectedRowIndex];
            if (item.isGroup) {
              toggleGroup(item.key);
            } else {
              if (e.ctrlKey || e.metaKey) {
                // Toggle selection
                const key = rowKey(item.row);
                setSelectedRows(prev => {
                  const next = new Set(prev);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                });
                setLastSelectedIndex(selectedRowIndex);
              } else {
                handleRowClick(item.row, selectedRowIndex);
              }
            }
          }
          break;
        case 'Escape':
          setDetailRow(null);
          setSelectedRows(new Set());
          break;
      }
    },
    [pageData, selectedRowIndex, totalCols, rowKey, rowDetail, handleRowClick, toggleGroup, lastSelectedIndex, selectRange, copySelectedRows, selectAllOnPage],
  );

  if (columns.length === 0) {
    return (
      <div className="lt-empty" role="status">
        <p>No columns defined.</p>
      </div>
    );
  }

  return (
    <div className="lt-root" role="region" aria-label={ariaLabel}>
      <div className="lt-toolbar">
        <div className="lt-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="lt-row-count">
            {data.length} row{data.length !== 1 ? 's' : ''}
          </span>
          {totalPages > 1 && (
            <span className="lt-page-info">
              Page {currentPage + 1} of {totalPages}
            </span>
          )}
          {selectedRows.size > 0 && (
            <span className="lt-selection-info">
              {selectedRows.size} selected
              <button
                type="button"
                className="lt-selection-copy-btn"
                onClick={copySelectedRows}
                aria-label="Copy selected rows"
                title="Copy selected rows (TSV)"
              >
                <Copy size={12} aria-hidden="true" />
                Copy
              </button>
            </span>
          )}
          {groupableColumns && groupableColumns.length > 0 && (
            <select
              value={groupBy as string || ''}
              onChange={(e) => setGroupBy((e.target.value as keyof T) || null)}
              className="lt-group-select"
              aria-label="Group by"
            >
              <option value="">No Grouping</option>
              {groupableColumns.map(c => (
                <option key={String(c.key)} value={String(c.key)}>Group by {c.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="lt-toolbar-right">
          <div className="lt-control-group" ref={densityMenuRef}>
            <button
              type="button"
              className="lt-control-btn"
              onClick={cycleDensity}
              onMouseDown={() => setShowDensityMenu(!showDensityMenu)}
              aria-label={`Density: ${density}. Click to change.`}
              aria-expanded={showDensityMenu}
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              <span className="lt-control-label">{density}</span>
            </button>
          </div>
          <div className="lt-control-group" ref={columnMenuRef}>
            <button
              type="button"
              className="lt-control-btn"
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              aria-label="Column visibility"
              aria-expanded={showColumnMenu}
              aria-haspopup="menu"
            >
              <Columns size={14} aria-hidden="true" />
              <span className="lt-control-label">Columns</span>
            </button>
            {showColumnMenu && (
              <div
                className="lt-column-menu lt-dropdown"
                role="menu"
                aria-label="Toggle column visibility"
              >
                {columns.map((col) => {
                  const isVisible = visibleColumns.has(col.key);
                  const isDisabled = isVisible && visibleColumns.size <= 1;
                  return (
                    <label
                      key={col.key}
                      className={`lt-column-menu-item ${isDisabled ? 'lt-column-menu-item--disabled' : ''}`}
                      role="menuitemcheckbox"
                      aria-checked={isVisible}
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleColumn(col.key)}
                        disabled={isDisabled}
                        className="lt-column-menu-checkbox"
                      />
                      <span>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="lt-pagination" role="navigation" aria-label="Table pagination">
          <button
            type="button"
            className="lt-page-btn"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            aria-label="Previous page"
          >
            Previous
          </button>
          <span className="lt-page-indicator" aria-current="page">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="lt-page-btn"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className={`lt-table-wrap ${DENSITY_CLASS[density]}`}
        tabIndex={0}
        role="grid"
        aria-label={ariaLabel}
        aria-multiselectable="true"
        onKeyDown={handleKeyDown}
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        aria-rowcount={pageData.length}
      >
        {stickyHeader && (
          <div className="lt-header" role="row" aria-rowindex={0}>
            {rowDetail && <div className="lt-cell lt-cell--detail" role="columnheader" aria-label="Detail" />}
            {filteredColumns.map((col) => (
              <div
                key={col.key}
                className="lt-cell lt-cell--header"
                role="columnheader"
                aria-label={col.label}
                style={col.width ? { width: col.width, minWidth: col.width } : undefined}
              >
                {col.label}
              </div>
            ))}
          </div>
        )}

        <div
          className="lt-body"
          role="rowgroup"
          style={{ height: totalHeight, position: 'relative' }}
        >
          {selectedRowIndex >= 0 && selectedRowIndex < pageData.length && (
            <div
              className={`lt-focus-ring-overlay ${focusedColumnIndex >= 0 ? 'lt-focus-ring-overlay--cell' : 'lt-focus-ring-overlay--row'}`}
              data-testid="focus-ring-overlay"
              role="presentation"
              aria-hidden="true"
              style={{
                top: selectedRowIndex * rowHeight,
                height: rowHeight,
                ...(focusBounds
                  ? { left: focusBounds.left, width: focusBounds.width }
                  : { left: 0, right: 0 }),
              }}
            />
          )}
          {visibleRows.map((item, i) => {
            const globalIndex = startIndex + i;
            const isRowFocused = selectedRowIndex === globalIndex;
            
            if (item.isGroup) {
              const isCollapsed = collapsedGroups.has(item.key);
              return (
                <div
                  key={`group-${item.key}`}
                  ref={isRowFocused ? focusedRowRef : undefined}
                  className={`lt-row lt-row--group ${selectedRowIndex === globalIndex ? 'lt-row--selected' : ''}`}
                  role="row"
                  aria-rowindex={globalIndex + 1}
                  aria-expanded={!isCollapsed}
                  style={{
                    position: 'absolute',
                    top: globalIndex * rowHeight,
                    left: 0,
                    right: 0,
                    height: rowHeight,
                  }}
                  onClick={() => toggleGroup(item.key)}
                  tabIndex={-1}
                >
                  <div className="lt-cell lt-cell--group-header" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="lt-group-toggle"
                      aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
                      tabIndex={-1}
                    >
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {renderGroupHeader ? renderGroupHeader(item.value, item.items) : (
                      <span className="font-medium">{String(item.value)} <span className="text-muted">({item.items.length})</span></span>
                    )}
                  </div>
                </div>
              );
            }

            const row = item.row;
            const key = rowKey(row);
            const isSelected = selectedRows.has(key);
            const isDetailOpen = detailRow === key;
            
            return (
              <React.Fragment key={key}>
                <div
                  ref={isRowFocused ? focusedRowRef : undefined}
                  className={`lt-row ${isSelected ? 'lt-row--selected' : ''} ${isRowFocused ? 'lt-row--focused' : ''}`}
                  role="row"
                  aria-rowindex={globalIndex + 1}
                  aria-selected={isSelected}
                  style={{
                    position: 'absolute',
                    top: globalIndex * rowHeight,
                    left: 0,
                    right: 0,
                    height: rowHeight,
                  }}
                  onClick={(e) => handleRowClick(row, globalIndex, e as React.MouseEvent)}
                  tabIndex={-1}
                >
                  {rowDetail && (
                    <div
                      className={`lt-cell lt-cell--detail ${isRowFocused && focusedColumnIndex === 0 ? 'lt-cell--focused' : ''}`}
                      onClick={(e) => handleCellClick(row, globalIndex, 0, e as React.MouseEvent)}
                    >
                      <button
                        type="button"
                        className="lt-detail-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailRow((prev) => (prev === key ? null : key));
                        }}
                        aria-label={isDetailOpen ? 'Close detail' : 'Open detail'}
                        aria-expanded={isDetailOpen}
                        tabIndex={-1}
                      >
                        <ChevronRight
                          size={14}
                          className={`lt-detail-icon ${isDetailOpen ? 'lt-detail-icon--open' : ''} icon-rtl`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  )}
                  {filteredColumns.map((col, cIdx) => {
                    const colIndex = rowDetail ? cIdx + 1 : cIdx;
                    const isCellFocused = isRowFocused && focusedColumnIndex === colIndex;
                    return (
                      <div
                        key={col.key}
                        className={`lt-cell ${isCellFocused ? 'lt-cell--focused' : ''}`}
                        role="gridcell"
                        style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                        onClick={(e) => handleCellClick(row, globalIndex, colIndex, e as React.MouseEvent)}
                      >
                        {col.render(row)}
                      </div>
                    );
                  })}
                </div>
                {isDetailOpen && rowDetail && (
                  <div
                    className="lt-detail-panel"
                    role="region"
                    aria-label={`Detail for row ${key}`}
                    style={{
                      position: 'absolute',
                      top: (globalIndex + 1) * rowHeight,
                      left: 0,
                      right: 0,
                    }}
                  >
                    <div className="lt-detail-content">
                      {rowDetail(row)}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {data.length === 0 && (
        <div className="lt-empty" role="status">
          <p>No data to display.</p>
        </div>
      )}
    </div>
  );
}

LedgerTable.displayName = 'LedgerTable';

export default LedgerTable;
