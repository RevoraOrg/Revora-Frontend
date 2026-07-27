export type SlotStatus = 'available' | 'limited' | 'sold_out' | 'selected';

export interface TimeSlot {
  id: string;
  startTime: string; // e.g. "09:15"
  endTime: string;   // e.g. "09:30"
  hourKey: string;   // e.g. "09:00"
  priceUsd: number;
  status: SlotStatus;
  capacity: number;
  bookedCount: number;
}

export interface HourlyBand {
  hourKey: string;
  displayTimeRange: string; // e.g. "09:00 - 10:00"
  totalSlots: number;
  availableSlots: number;
  limitedSlots: number;
  soldOutSlots: number;
  minPriceUsd: number;
  status: 'available' | 'limited' | 'sold_out';
  slots: TimeSlot[];
}

export type SlotDensityMode = 'full' | 'compact';

export interface SlotListProps {
  supplierId: string;
  date: string;
  slots: TimeSlot[];
  selectedSlotId?: string | null;
  onSelectSlot: (slot: TimeSlot) => void;
  initialDensity?: SlotDensityMode;
  autoCompactThreshold?: number;
  className?: string;
}
