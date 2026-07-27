import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SlotList, groupSlotsByHour } from './slot-list';
import { TimeSlot } from './slot-list.types';

expect.extend(toHaveNoViolations);

// Generate sample mock slots
const generateMockSlots = (count: number): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00'];

  for (let i = 0; i < count; i++) {
    const hourKey = hours[i % hours.length];
    const minute = (15 * Math.floor((i % 4))) .toString().padStart(2, '0');
    const hourNum = parseInt(hourKey.split(':')[0], 10);
    const startTime = `${hourKey.split(':')[0]}:${minute}`;
    const endTime = `${hourKey.split(':')[0]}:${(parseInt(minute, 10) + 15).toString().padStart(2, '0')}`;

    slots.push({
      id: `slot-${i}`,
      startTime,
      endTime,
      hourKey,
      priceUsd: 50 + (i % 3) * 10,
      status: i % 10 === 0 ? 'sold_out' : i % 5 === 0 ? 'limited' : 'available',
      capacity: 10,
      bookedCount: i % 10 === 0 ? 10 : 2,
    });
  }

  return slots;
};

describe('SlotList & Compact Bands Mode', () => {
  const mockSupplierId = 'sup-101';
  const mockDate = '2026-08-15';
  const smallSlots = generateMockSlots(12);
  const highDensitySlots = generateMockSlots(52);
  const onSelectSlotMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders Full Grid view by default for low-density days (< 50 slots)', () => {
    render(
      <SlotList
        supplierId={mockSupplierId}
        date={mockDate}
        slots={smallSlots}
        onSelectSlot={onSelectSlotMock}
      />
    );

    expect(screen.getByTestId('slot-full-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('slot-compact-bands')).not.toBeInTheDocument();
  });

  it('auto-enables Compact Bands mode for high-density days (50+ slots)', () => {
    render(
      <SlotList
        supplierId={mockSupplierId}
        date={mockDate}
        slots={highDensitySlots}
        onSelectSlot={onSelectSlotMock}
      />
    );

    expect(screen.getByTestId('slot-compact-bands')).toBeInTheDocument();
    expect(screen.getByTestId('slot-auto-banner')).toBeInTheDocument();
    expect(screen.getByText(/High-density day \(52 slots\)/i)).toBeInTheDocument();
  });

  it('toggles density mode when density buttons are clicked', () => {
    render(
      <SlotList
        supplierId={mockSupplierId}
        date={mockDate}
        slots={smallSlots}
        onSelectSlot={onSelectSlotMock}
      />
    );

    const compactBtn = screen.getByTestId('density-btn-compact');
    fireEvent.click(compactBtn);

    expect(screen.getByTestId('slot-compact-bands')).toBeInTheDocument();
    expect(localStorage.getItem(`revora_slot_density_${mockSupplierId}`)).toBe('compact');

    const fullBtn = screen.getByTestId('density-btn-full');
    fireEvent.click(fullBtn);

    expect(screen.getByTestId('slot-full-grid')).toBeInTheDocument();
    expect(localStorage.getItem(`revora_slot_density_${mockSupplierId}`)).toBe('full');
  });

  it('restores supplier density preference from localStorage', () => {
    localStorage.setItem(`revora_slot_density_${mockSupplierId}`, 'compact');

    render(
      <SlotList
        supplierId={mockSupplierId}
        date={mockDate}
        slots={smallSlots}
        onSelectSlot={onSelectSlotMock}
      />
    );

    expect(screen.getByTestId('slot-compact-bands')).toBeInTheDocument();
  });

  it('expands and collapses hourly band on header button click', () => {
    render(
      <SlotList
        supplierId={mockSupplierId}
        date={mockDate}
        slots={smallSlots}
        initialDensity="compact"
        onSelectSlot={onSelectSlotMock}
      />
    );

    expect(screen.queryByTestId('slot-band-body-09:00')).not.toBeInTheDocument();

    const bandHeader = screen.getByTestId('slot-band-header-09:00');
    expect(bandHeader).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    fireEvent.click(bandHeader);

    expect(screen.getByTestId('slot-band-body-09:00')).toBeInTheDocument();
    expect(bandHeader).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    fireEvent.click(bandHeader);

    expect(screen.queryByTestId('slot-band-body-09:00')).not.toBeInTheDocument();
    expect(bandHeader).toHaveAttribute('aria-expanded', 'false');
  });

  it('retains focus on band header button when band is collapsed', async () => {
    render(
      <SlotList
        supplierId={mockSupplierId}
        date={mockDate}
        slots={smallSlots}
        initialDensity="compact"
        onSelectSlot={onSelectSlotMock}
      />
    );

    const bandHeader = screen.getByTestId('slot-band-header-09:00');

    // Expand
    fireEvent.click(bandHeader);
    expect(screen.getByTestId('slot-band-body-09:00')).toBeInTheDocument();

    // Collapse
    await act(async () => {
      fireEvent.click(bandHeader);
    });

    expect(document.activeElement).toBe(bandHeader);
  });

  it('navigates between band headers using ArrowUp and ArrowDown keys', () => {
    render(
      <SlotList
        supplierId={mockSupplierId}
        date={mockDate}
        slots={smallSlots}
        initialDensity="compact"
        onSelectSlot={onSelectSlotMock}
      />
    );

    const firstHeader = screen.getByTestId('slot-band-header-09:00');
    const secondHeader = screen.getByTestId('slot-band-header-10:00');

    firstHeader.focus();
    expect(document.activeElement).toBe(firstHeader);

    fireEvent.keyDown(firstHeader, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(secondHeader);

    fireEvent.keyDown(secondHeader, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(firstHeader);
  });

  it('calls onSelectSlot when clicking an available slot chip', () => {
    render(
      <SlotList
        supplierId={mockSupplierId}
        date={mockDate}
        slots={smallSlots}
        onSelectSlot={onSelectSlotMock}
      />
    );

    const slotChip = screen.getByTestId('slot-chip-slot-1');
    fireEvent.click(slotChip);

    expect(onSelectSlotMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'slot-1' })
    );
  });

  it('disables sold out slot chips', () => {
    render(
      <SlotList
        supplierId={mockSupplierId}
        date={mockDate}
        slots={smallSlots}
        onSelectSlot={onSelectSlotMock}
      />
    );

    const soldOutChip = screen.getByTestId('slot-chip-slot-0');
    expect(soldOutChip).toBeDisabled();

    fireEvent.click(soldOutChip);
    expect(onSelectSlotMock).not.toHaveBeenCalled();
  });

  it('correctly aggregates slots into hourly bands with groupSlotsByHour helper', () => {
    const bands = groupSlotsByHour(smallSlots);

    expect(bands.length).toBeGreaterThan(0);
    expect(bands[0]).toHaveProperty('hourKey', '09:00');
    expect(bands[0]).toHaveProperty('totalSlots');
    expect(bands[0]).toHaveProperty('availableSlots');
  });

  it('passes axe accessibility audit with 0 violations', async () => {
    const { container } = render(
      <SlotList
        supplierId={mockSupplierId}
        date={mockDate}
        slots={smallSlots}
        initialDensity="compact"
        onSelectSlot={onSelectSlotMock}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
