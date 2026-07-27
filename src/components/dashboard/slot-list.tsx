import React, { useState, useMemo, useRef, useCallback } from 'react';
import './slot-list.css';
import {
  TimeSlot,
  HourlyBand,
  SlotDensityMode,
  SlotListProps,
} from './slot-list.types';

const STORAGE_PREFIX = 'revora_slot_density_';

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
};

export const groupSlotsByHour = (slots: TimeSlot[]): HourlyBand[] => {
  const groups: { [hour: string]: TimeSlot[] } = {};

  slots.forEach((slot) => {
    const hour = slot.hourKey || slot.startTime.split(':')[0] + ':00';
    if (!groups[hour]) {
      groups[hour] = [];
    }
    groups[hour].push(slot);
  });

  const sortedHours = Object.keys(groups).sort();

  return sortedHours.map((hourKey) => {
    const hourSlots = groups[hourKey];
    const availableSlots = hourSlots.filter((s) => s.status === 'available').length;
    const limitedSlots = hourSlots.filter((s) => s.status === 'limited').length;
    const soldOutSlots = hourSlots.filter((s) => s.status === 'sold_out').length;
    const minPriceUsd = Math.min(...hourSlots.map((s) => s.priceUsd));

    const hourNum = parseInt(hourKey.split(':')[0], 10);
    const nextHourNum = (hourNum + 1) % 24;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const displayTimeRange = `${pad(hourNum)}:00 - ${pad(nextHourNum)}:00`;

    let status: HourlyBand['status'] = 'available';
    if (availableSlots === 0 && limitedSlots === 0) {
      status = 'sold_out';
    } else if (availableSlots < hourSlots.length / 2 || limitedSlots > 0) {
      status = 'limited';
    }

    return {
      hourKey,
      displayTimeRange,
      totalSlots: hourSlots.length,
      availableSlots,
      limitedSlots,
      soldOutSlots,
      minPriceUsd,
      status,
      slots: hourSlots,
    };
  });
};

export const SlotList: React.FC<SlotListProps> = ({
  supplierId,
  date,
  slots,
  selectedSlotId,
  onSelectSlot,
  initialDensity,
  autoCompactThreshold = 50,
  className = '',
}) => {
  const isHighDensityDay = slots.length >= autoCompactThreshold;

  // Determine initial density mode
  const [densityMode, setDensityMode] = useState<SlotDensityMode>(() => {
    if (initialDensity) return initialDensity;
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${supplierId}`);
      if (saved === 'full' || saved === 'compact') {
        return saved as SlotDensityMode;
      }
    } catch {
      // Ignore storage errors
    }
    return isHighDensityDay ? 'compact' : 'full';
  });

  const [expandedHours, setExpandedHours] = useState<{ [hourKey: string]: boolean }>({});
  const headerRefs = useRef<{ [hourKey: string]: HTMLButtonElement | null }>({});

  const hourlyBands = useMemo(() => groupSlotsByHour(slots), [slots]);

  // Save density setting when changed
  const handleDensityChange = (mode: SlotDensityMode) => {
    setDensityMode(mode);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${supplierId}`, mode);
    } catch {
      // Ignore write errors
    }
  };

  // Toggle single band expansion
  const toggleBandExpand = useCallback((hourKey: string) => {
    setExpandedHours((prev) => {
      const isCurrentlyExpanded = Boolean(prev[hourKey]);
      const nextState = { ...prev, [hourKey]: !isCurrentlyExpanded };
      return nextState;
    });

    // Ensure focus returns to header button immediately
    if (headerRefs.current[hourKey]) {
      headerRefs.current[hourKey]?.focus();
    }
  }, []);

  // Keyboard navigation across band headers
  const handleBandHeaderKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    hourKey: string
  ) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextBand = hourlyBands[index + 1];
      if (nextBand && headerRefs.current[nextBand.hourKey]) {
        headerRefs.current[nextBand.hourKey]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevBand = hourlyBands[index - 1];
      if (prevBand && headerRefs.current[prevBand.hourKey]) {
        headerRefs.current[prevBand.hourKey]?.focus();
      }
    }
  };

  return (
    <div className={`slot-picker-container ${className}`} data-testid="slot-picker-container">
      {/* Toolbar & Density Controls */}
      <div className="slot-picker-toolbar">
        <div className="slot-picker-meta">
          <h3 className="slot-picker-title">{date} Slots</h3>
          <span className="slot-count-badge" data-testid="slot-total-badge">
            {slots.length} available slots
          </span>
        </div>

        <div
          className="density-toggle-group"
          role="group"
          aria-label="Slot list view density"
          data-testid="density-toggle-group"
        >
          <button
            type="button"
            className={`density-btn ${densityMode === 'full' ? 'is-active' : ''}`}
            onClick={() => handleDensityChange('full')}
            aria-pressed={densityMode === 'full'}
            data-testid="density-btn-full"
          >
            Full Grid
          </button>
          <button
            type="button"
            className={`density-btn ${densityMode === 'compact' ? 'is-active' : ''}`}
            onClick={() => handleDensityChange('compact')}
            aria-pressed={densityMode === 'compact'}
            data-testid="density-btn-compact"
          >
            Compact Bands
          </button>
        </div>
      </div>

      {/* Auto Compact Banner */}
      {isHighDensityDay && (
        <div className="slot-picker-auto-banner" data-testid="slot-auto-banner">
          <span>⚡ High-density day ({slots.length} slots) — Compact Bands auto-enabled.</span>
        </div>
      )}

      {/* Full Grid Density View */}
      {densityMode === 'full' && (
        <div className="slot-grid" data-testid="slot-full-grid">
          {slots.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            const isSoldOut = slot.status === 'sold_out';

            return (
              <button
                key={slot.id}
                type="button"
                className={`slot-chip ${isSelected ? 'is-selected' : ''}`}
                disabled={isSoldOut}
                onClick={() => onSelectSlot(slot)}
                aria-label={`${slot.startTime} slot, ${formatPrice(slot.priceUsd)}, ${slot.status}`}
                data-testid={`slot-chip-${slot.id}`}
              >
                <span className="slot-chip-time">{slot.startTime}</span>
                <span className="slot-chip-price">{formatPrice(slot.priceUsd)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Compact Bands Density View */}
      {densityMode === 'compact' && (
        <div className="slot-bands-list" data-testid="slot-compact-bands">
          {hourlyBands.map((band, idx) => {
            const isExpanded = Boolean(expandedHours[band.hourKey]);
            const regionId = `slot-band-body-${supplierId}-${band.hourKey}`;
            const headerId = `slot-band-header-${supplierId}-${band.hourKey}`;

            return (
              <div
                key={band.hourKey}
                className={`slot-band-card ${isExpanded ? 'is-expanded' : ''}`}
                data-testid={`slot-band-card-${band.hourKey}`}
              >
                {/* Accordion Band Header Button */}
                <button
                  ref={(el) => (headerRefs.current[band.hourKey] = el)}
                  id={headerId}
                  type="button"
                  className="slot-band-header"
                  aria-expanded={isExpanded}
                  aria-controls={regionId}
                  onClick={() => toggleBandExpand(band.hourKey)}
                  onKeyDown={(e) => handleBandHeaderKeyDown(e, idx, band.hourKey)}
                  data-testid={`slot-band-header-${band.hourKey}`}
                >
                  <div className="slot-band-time-info">
                    <span className="slot-band-range">{band.displayTimeRange}</span>
                    <span
                      className={`slot-band-status-pill status-${band.status}`}
                      data-testid={`band-status-pill-${band.hourKey}`}
                    >
                      {band.availableSlots > 0 ? `${band.availableSlots} available` : 'Sold Out'}
                    </span>
                  </div>

                  <div className="slot-band-right">
                    <span className="slot-band-price">from {formatPrice(band.minPriceUsd)}</span>
                    <span className="slot-band-chevron" aria-hidden="true">
                      ▼
                    </span>
                  </div>
                </button>

                {/* Expanded Band Content */}
                {isExpanded && (
                  <div
                    id={regionId}
                    role="region"
                    aria-labelledby={headerId}
                    className="slot-band-body"
                    data-testid={`slot-band-body-${band.hourKey}`}
                  >
                    <div className="slot-grid">
                      {band.slots.map((slot) => {
                        const isSelected = selectedSlotId === slot.id;
                        const isSoldOut = slot.status === 'sold_out';

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            className={`slot-chip ${isSelected ? 'is-selected' : ''}`}
                            disabled={isSoldOut}
                            onClick={() => onSelectSlot(slot)}
                            aria-label={`${slot.startTime} slot, ${formatPrice(slot.priceUsd)}, ${slot.status}`}
                            data-testid={`slot-chip-${slot.id}`}
                          >
                            <span className="slot-chip-time">{slot.startTime}</span>
                            <span className="slot-chip-price">{formatPrice(slot.priceUsd)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
