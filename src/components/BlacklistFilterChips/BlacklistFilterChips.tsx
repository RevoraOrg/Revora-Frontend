import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './BlacklistFilterChips.css';
import type {
  BlacklistFilterChipsProps,
  BlacklistFilterKey,
  FilterChipOption,
} from './BlacklistFilterChips.types';

const DEFAULT_ARIA_LABEL = 'Blacklist filter chips';

export const BlacklistFilterChips: React.FC<BlacklistFilterChipsProps> = ({
  options,
  selection,
  onChange,
  maxVisibleChips = 8,
  disabled = false,
  'aria-label': ariaLabel = DEFAULT_ARIA_LABEL,
}) => {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const chipBarRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<{ group: BlacklistFilterKey; id: string } | null>(null);

  const visibleChips = useMemo(
    () => options.slice(0, maxVisibleChips),
    [options, maxVisibleChips]
  );
  const hiddenChips = useMemo(() => options.slice(maxVisibleChips), [options, maxVisibleChips]);
  const hasOverflow = hiddenChips.length > 0;

  const activeCount = useMemo(
    () => Object.values(selection).reduce((sum, ids) => sum + ids.length, 0),
    [selection]
  );

  const isSelected = (chip: FilterChipOption) => selection[chip.group].includes(chip.id);

  const setGroupSelection = (group: BlacklistFilterKey, ids: string[]) => {
    onChange({ ...selection, [group]: ids });
  };

  const toggleChip = (chip: FilterChipOption) => {
    const current = selection[chip.group];
    const next = current.includes(chip.id)
      ? current.filter((id) => id !== chip.id)
      : [...current, chip.id];
    setGroupSelection(chip.group, next);
  };

  const removeChip = (chip: FilterChipOption) => {
    if (!isSelected(chip)) return;
    setGroupSelection(
      chip.group,
      selection[chip.group].filter((id) => id !== chip.id)
    );
  };

  const handleChipClick = (chip: FilterChipOption, event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || chip.disabled) return;

    if (event.shiftKey && anchorRef.current && anchorRef.current.group === chip.group) {
      // Shift+Click selects a contiguous range within the same group.
      const groupChips = options.filter((c) => c.group === chip.group);
      const anchorIndex = groupChips.findIndex((c) => c.id === anchorRef.current!.id);
      const targetIndex = groupChips.findIndex((c) => c.id === chip.id);
      if (anchorIndex >= 0 && targetIndex >= 0) {
        const [start, end] =
          anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        setGroupSelection(
          chip.group,
          groupChips
            .slice(start, end + 1)
            .filter((c) => !c.disabled)
            .map((c) => c.id)
        );
        return;
      }
    }

    anchorRef.current = { group: chip.group, id: chip.id };
    toggleChip(chip);
  };

  const focusChipAt = (index: number) => {
    const buttons = chipBarRef.current?.querySelectorAll<HTMLButtonElement>('[data-filter-chip]');
    buttons?.[index]?.focus();
  };

  const handleChipKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (disabled) return;
    const total = visibleChips.length;
    const chip = visibleChips[index];

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusChipAt(index + 1 < total ? index + 1 : 0);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusChipAt(index - 1 >= 0 ? index - 1 : total - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusChipAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusChipAt(total - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        toggleChip(chip);
        break;
      case 'Delete':
      case 'Backspace':
        // Keyboard chip removal: remove the focused chip from the selection.
        event.preventDefault();
        removeChip(chip);
        break;
      default:
        break;
    }
  };

  return (
    <div className="blacklist-chips" data-testid="blacklist-filter-chips">
      <div className="blacklist-chips-header">
        <span className="blacklist-chips-title" id="blacklist-chips-title">
          Filters
        </span>
        {activeCount > 0 && (
          <span className="blacklist-chips-active-count" data-testid="blacklist-chips-active-count">
            {activeCount} active
          </span>
        )}
      </div>

      <div
        ref={chipBarRef}
        className="blacklist-chips-bar"
        role="group"
        aria-label={ariaLabel}
        aria-describedby="blacklist-chips-title"
        data-testid="blacklist-chips-bar"
      >
        {visibleChips.map((chip, index) => {
          const previous = visibleChips[index - 1];
          const showSeparator = previous && previous.group !== chip.group;
          const isActive = isSelected(chip);
          return (
            <React.Fragment key={chip.id}>
              {showSeparator && (
                <span className="blacklist-chips-separator" role="presentation" aria-hidden="true" />
              )}
              <button
                type="button"
                data-filter-chip
                className="blacklist-chip"
                onClick={(event) => handleChipClick(chip, event)}
                onKeyDown={(event) => handleChipKeyDown(event, index)}
                aria-pressed={isActive}
                aria-disabled={disabled || chip.disabled}
                disabled={disabled || chip.disabled}
                title={chip.title}
                data-testid={`chip-${chip.id}`}
              >
                <span>{chip.label}</span>
                {chip.count !== undefined && (
                  <span className="blacklist-chip-count" aria-hidden="true">
                    {chip.count}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}

        {hasOverflow && (
          <div className="blacklist-chips-overflow">
            <button
              type="button"
              className="blacklist-chips-overflow-trigger"
              onClick={() => setOverflowOpen((open) => !open)}
              aria-expanded={overflowOpen}
              aria-haspopup="menu"
              aria-controls="blacklist-chips-overflow-menu"
              data-testid="blacklist-chips-overflow-trigger"
            >
              <span>+{hiddenChips.length} more</span>
              <ChevronDown size={12} aria-hidden="true" />
            </button>

            {overflowOpen && (
              <div
                id="blacklist-chips-overflow-menu"
                className="blacklist-chips-overflow-menu"
                role="menu"
                aria-label="More filter chips"
                data-testid="blacklist-chips-overflow-menu"
              >
                {hiddenChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className="blacklist-chip"
                    role="menuitemcheckbox"
                    aria-checked={isSelected(chip)}
                    disabled={disabled || chip.disabled}
                    onClick={() => toggleChip(chip)}
                    title={chip.title}
                    data-testid={`chip-${chip.id}`}
                  >
                    <span>{chip.label}</span>
                    {chip.count !== undefined && (
                      <span className="blacklist-chip-count" aria-hidden="true">
                        {chip.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
