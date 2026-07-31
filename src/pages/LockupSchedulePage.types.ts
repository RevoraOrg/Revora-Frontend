export interface UnlockEvent {
  id: string;
  date: string; // 'YYYY-MM-DD'
  eventLabel: string; // e.g., "Cliff Unlock", "Monthly Vesting"
  amount: number;
  percentage: number; // e.g. 10 for 10%
  cumulativePercentage: number; // e.g. 35 for 35%
  remainingPercentage: number; // e.g. 65 for 65%
  status: 'completed' | 'upcoming';
}

export interface LockupSchedule {
  totalAllocated: number;
  tokenSymbol: string;
  startDate: string; // 'YYYY-MM-DD'
  cliffDate: string | null; // 'YYYY-MM-DD' or null
  cliffPercentage: number;
  endDate: string; // 'YYYY-MM-DD'
  vestingType: 'quarterly' | 'monthly' | 'daily' | 'one-time';
  todayDate: string; // 'YYYY-MM-DD' to simulate "today"
  unlocks: UnlockEvent[];
}

export type LockupScenarioId =
  | 'quarterly-nominal'
  | 'monthly-no-cliff'
  | 'pre-vesting'
  | 'during-cliff'
  | 'fully-vested'
  | 'long-schedule'
  | 'daily-vesting'
  | 'one-time-unlock'
  | 'empty-state'
  | 'loading-state'
  | 'error-state';

export interface ScenarioConfig {
  id: LockupScenarioId;
  name: string;
  description: string;
  schedule: LockupSchedule | null;
  isError?: boolean;
}

// Helper to generate list of dates
const addMonths = (dateStr: string, months: number): string => {
  const d = new Date(dateStr);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().split('T')[0];
};

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

// Mock data builder
export const getMockScenarios = (): ScenarioConfig[] => {
  const simulatedToday = '2026-10-15';

  // 1. Standard Quarterly Vesting
  const qStart = '2026-01-01';
  const qCliff = '2026-07-01';
  const qEnd = '2028-01-01';
  const qTotal = 1000000;
  const qUnlocks: UnlockEvent[] = [
    {
      id: 'q-cliff',
      date: qCliff,
      eventLabel: 'Cliff Unlock (25%)',
      amount: qTotal * 0.25,
      percentage: 25,
      cumulativePercentage: 25,
      remainingPercentage: 75,
      status: qCliff <= simulatedToday ? 'completed' : 'upcoming',
    },
    {
      id: 'q-u1',
      date: '2026-10-01',
      eventLabel: 'Quarterly Unlock #1',
      amount: qTotal * 0.125,
      percentage: 12.5,
      cumulativePercentage: 37.5,
      remainingPercentage: 62.5,
      status: '2026-10-01' <= simulatedToday ? 'completed' : 'upcoming',
    },
    {
      id: 'q-u2',
      date: '2027-01-01',
      eventLabel: 'Quarterly Unlock #2',
      amount: qTotal * 0.125,
      percentage: 12.5,
      cumulativePercentage: 50,
      remainingPercentage: 50,
      status: '2027-01-01' <= simulatedToday ? 'completed' : 'upcoming',
    },
    {
      id: 'q-u3',
      date: '2027-04-01',
      eventLabel: 'Quarterly Unlock #3',
      amount: qTotal * 0.125,
      percentage: 12.5,
      cumulativePercentage: 62.5,
      remainingPercentage: 37.5,
      status: '2027-04-01' <= simulatedToday ? 'completed' : 'upcoming',
    },
    {
      id: 'q-u4',
      date: '2027-07-01',
      eventLabel: 'Quarterly Unlock #4',
      amount: qTotal * 0.125,
      percentage: 12.5,
      cumulativePercentage: 75,
      remainingPercentage: 25,
      status: '2027-07-01' <= simulatedToday ? 'completed' : 'upcoming',
    },
    {
      id: 'q-u5',
      date: '2027-10-01',
      eventLabel: 'Quarterly Unlock #5',
      amount: qTotal * 0.125,
      percentage: 12.5,
      cumulativePercentage: 87.5,
      remainingPercentage: 12.5,
      status: '2027-10-01' <= simulatedToday ? 'completed' : 'upcoming',
    },
    {
      id: 'q-u6',
      date: qEnd,
      eventLabel: 'Final Quarterly Unlock',
      amount: qTotal * 0.125,
      percentage: 12.5,
      cumulativePercentage: 100,
      remainingPercentage: 0,
      status: qEnd <= simulatedToday ? 'completed' : 'upcoming',
    },
  ];

  // 2. Monthly Vesting with No Cliff
  const mStart = '2026-01-01';
  const mEnd = '2027-12-01'; // 24 months
  const mTotal = 600000;
  const mUnlocks: UnlockEvent[] = [];
  const totalMonths = 24;
  for (let i = 1; i <= totalMonths; i++) {
    const uDate = addMonths(mStart, i);
    const isLast = i === totalMonths;
    const pct = Number((100 / totalMonths).toFixed(2));
    const cumPct = isLast ? 100 : Number((pct * i).toFixed(2));
    const remPct = Number((100 - cumPct).toFixed(2));
    mUnlocks.push({
      id: `m-u-${i}`,
      date: uDate,
      eventLabel: isLast ? 'Final Monthly Unlock' : `Monthly Unlock #${i}`,
      amount: Math.round(mTotal / totalMonths),
      percentage: pct,
      cumulativePercentage: cumPct,
      remainingPercentage: remPct,
      status: uDate <= simulatedToday ? 'completed' : 'upcoming',
    });
  }

  // 3. Today Before Vesting Starts
  const pbStart = '2027-01-01';
  const pbCliff = '2027-07-01';
  const pbEnd = '2028-07-01';
  const pbTotal = 500000;
  const pbUnlocks: UnlockEvent[] = [
    {
      id: 'pb-cliff',
      date: pbCliff,
      eventLabel: 'Cliff Unlock (20%)',
      amount: pbTotal * 0.20,
      percentage: 20,
      cumulativePercentage: 20,
      remainingPercentage: 80,
      status: 'upcoming',
    },
    {
      id: 'pb-u1',
      date: '2027-10-01',
      eventLabel: 'Quarterly Unlock #1',
      amount: pbTotal * 0.20,
      percentage: 20,
      cumulativePercentage: 40,
      remainingPercentage: 60,
      status: 'upcoming',
    },
    {
      id: 'pb-u2',
      date: '2028-01-01',
      eventLabel: 'Quarterly Unlock #2',
      amount: pbTotal * 0.20,
      percentage: 20,
      cumulativePercentage: 60,
      remainingPercentage: 40,
      status: 'upcoming',
    },
    {
      id: 'pb-u3',
      date: '2028-04-01',
      eventLabel: 'Quarterly Unlock #3',
      amount: pbTotal * 0.20,
      percentage: 20,
      cumulativePercentage: 80,
      remainingPercentage: 20,
      status: 'upcoming',
    },
    {
      id: 'pb-u4',
      date: pbEnd,
      eventLabel: 'Final Quarterly Unlock',
      amount: pbTotal * 0.20,
      percentage: 20,
      cumulativePercentage: 100,
      remainingPercentage: 0,
      status: 'upcoming',
    },
  ];

  // 4. Today During Cliff Period
  const dcStart = '2026-01-01';
  const dcCliff = '2027-01-01';
  const dcEnd = '2028-01-01';
  const dcTotal = 1200000;
  const dcUnlocks: UnlockEvent[] = [
    {
      id: 'dc-cliff',
      date: dcCliff,
      eventLabel: 'Cliff Unlock (50%)',
      amount: dcTotal * 0.50,
      percentage: 50,
      cumulativePercentage: 50,
      remainingPercentage: 50,
      status: dcCliff <= simulatedToday ? 'completed' : 'upcoming',
    },
    {
      id: 'dc-u1',
      date: '2027-04-01',
      eventLabel: 'Quarterly Unlock #1',
      amount: dcTotal * 0.125,
      percentage: 12.5,
      cumulativePercentage: 62.5,
      remainingPercentage: 37.5,
      status: '2027-04-01' <= simulatedToday ? 'completed' : 'upcoming',
    },
    {
      id: 'dc-u2',
      date: '2027-07-01',
      eventLabel: 'Quarterly Unlock #2',
      amount: dcTotal * 0.125,
      percentage: 12.5,
      cumulativePercentage: 75,
      remainingPercentage: 25,
      status: '2027-07-01' <= simulatedToday ? 'completed' : 'upcoming',
    },
    {
      id: 'dc-u3',
      date: '2027-10-01',
      eventLabel: 'Quarterly Unlock #3',
      amount: dcTotal * 0.125,
      percentage: 12.5,
      cumulativePercentage: 87.5,
      remainingPercentage: 12.5,
      status: '2027-10-01' <= simulatedToday ? 'completed' : 'upcoming',
    },
    {
      id: 'dc-u4',
      date: dcEnd,
      eventLabel: 'Final Quarterly Unlock',
      amount: dcTotal * 0.125,
      percentage: 12.5,
      cumulativePercentage: 100,
      remainingPercentage: 0,
      status: dcEnd <= simulatedToday ? 'completed' : 'upcoming',
    },
  ];

  // 5. Already Fully Vested
  const fvStart = '2024-01-01';
  const fvCliff = '2024-07-01';
  const fvEnd = '2025-12-01';
  const fvTotal = 2000000;
  const fvUnlocks: UnlockEvent[] = [
    {
      id: 'fv-cliff',
      date: fvCliff,
      eventLabel: 'Cliff Unlock (20%)',
      amount: fvTotal * 0.20,
      percentage: 20,
      cumulativePercentage: 20,
      remainingPercentage: 80,
      status: 'completed',
    },
    {
      id: 'fv-u1',
      date: '2024-10-01',
      eventLabel: 'Quarterly Unlock #1',
      amount: fvTotal * 0.16,
      percentage: 16,
      cumulativePercentage: 36,
      remainingPercentage: 64,
      status: 'completed',
    },
    {
      id: 'fv-u2',
      date: '2025-01-01',
      eventLabel: 'Quarterly Unlock #2',
      amount: fvTotal * 0.16,
      percentage: 16,
      cumulativePercentage: 52,
      remainingPercentage: 48,
      status: 'completed',
    },
    {
      id: 'fv-u3',
      date: '2025-04-01',
      eventLabel: 'Quarterly Unlock #3',
      amount: fvTotal * 0.16,
      percentage: 16,
      cumulativePercentage: 68,
      remainingPercentage: 32,
      status: 'completed',
    },
    {
      id: 'fv-u4',
      date: '2025-07-01',
      eventLabel: 'Quarterly Unlock #4',
      amount: fvTotal * 0.16,
      percentage: 16,
      cumulativePercentage: 84,
      remainingPercentage: 16,
      status: 'completed',
    },
    {
      id: 'fv-u5',
      date: fvEnd,
      eventLabel: 'Final Quarterly Unlock',
      amount: fvTotal * 0.16,
      percentage: 16,
      cumulativePercentage: 100,
      remainingPercentage: 0,
      status: 'completed',
    },
  ];

  // 6. Very Long Schedule (10 Years Monthly)
  const lStart = '2026-01-01';
  const lEnd = '2035-12-01'; // 120 months
  const lTotal = 12000000;
  const lUnlocks: UnlockEvent[] = [];
  const lMonths = 120;
  for (let i = 1; i <= lMonths; i++) {
    // Standardize periodic sampling to avoid huge DOM sizes while proving rendering logic
    // We can add events at every 3 months or keep all 120. Having 120 events is perfectly fine for React to render.
    const uDate = addMonths(lStart, i);
    const isLast = i === lMonths;
    const pct = Number((100 / lMonths).toFixed(2));
    const cumPct = isLast ? 100 : Number((pct * i).toFixed(2));
    const remPct = Number((100 - cumPct).toFixed(2));
    lUnlocks.push({
      id: `l-u-${i}`,
      date: uDate,
      eventLabel: isLast ? 'Final Unlock' : `Monthly Unlock #${i}`,
      amount: Math.round(lTotal / lMonths),
      percentage: pct,
      cumulativePercentage: cumPct,
      remainingPercentage: remPct,
      status: uDate <= simulatedToday ? 'completed' : 'upcoming',
    });
  }

  // 7. Daily Vesting (Short-term, Hundreds of events)
  const dStart = '2026-01-01';
  const dEnd = '2026-07-01'; // 181 days
  const dTotal = 362000;
  const dUnlocks: UnlockEvent[] = [];
  const dDays = 181;
  for (let i = 1; i <= dDays; i++) {
    const uDate = addDays(dStart, i);
    const isLast = i === dDays;
    const pct = Number((100 / dDays).toFixed(2));
    const cumPct = isLast ? 100 : Number((pct * i).toFixed(2));
    const remPct = Number((100 - cumPct).toFixed(2));
    dUnlocks.push({
      id: `d-u-${i}`,
      date: uDate,
      eventLabel: isLast ? 'Final Daily Unlock' : `Daily Unlock #${i}`,
      amount: 2000,
      percentage: pct,
      cumulativePercentage: cumPct,
      remainingPercentage: remPct,
      status: uDate <= simulatedToday ? 'completed' : 'upcoming',
    });
  }

  // 8. One-Time Unlock
  const otStart = '2026-01-01';
  const otEnd = '2026-01-01';
  const otTotal = 500000;
  const otUnlocks: UnlockEvent[] = [
    {
      id: 'ot-single',
      date: otStart,
      eventLabel: 'One-Time Unlock (100%)',
      amount: otTotal,
      percentage: 100,
      cumulativePercentage: 100,
      remainingPercentage: 0,
      status: otStart <= simulatedToday ? 'completed' : 'upcoming',
    },
  ];

  return [
    {
      id: 'quarterly-nominal',
      name: 'Standard Quarterly Vesting',
      description: '1,000,000 REV with a 6-month cliff (25%) and 6 quarterly unlocks of 12.5%. Today is in the middle of vesting.',
      schedule: {
        totalAllocated: qTotal,
        tokenSymbol: 'REV',
        startDate: qStart,
        cliffDate: qCliff,
        cliffPercentage: 25,
        endDate: qEnd,
        vestingType: 'quarterly',
        todayDate: simulatedToday,
        unlocks: qUnlocks,
      },
    },
    {
      id: 'monthly-no-cliff',
      name: 'No-Cliff Monthly Vesting',
      description: '600,000 REV with no cliff, vesting monthly over 24 months. Today is 5 months in.',
      schedule: {
        totalAllocated: mTotal,
        tokenSymbol: 'REV',
        startDate: mStart,
        cliffDate: null,
        cliffPercentage: 0,
        endDate: mEnd,
        vestingType: 'monthly',
        todayDate: simulatedToday,
        unlocks: mUnlocks,
      },
    },
    {
      id: 'pre-vesting',
      name: 'Pre-Vesting Schedule',
      description: 'Schedule that has not started yet. Starts in Jan 2027. All events are marked as future.',
      schedule: {
        totalAllocated: pbTotal,
        tokenSymbol: 'REV',
        startDate: pbStart,
        cliffDate: pbCliff,
        cliffPercentage: 20,
        endDate: pbEnd,
        vestingType: 'quarterly',
        todayDate: simulatedToday,
        unlocks: pbUnlocks,
      },
    },
    {
      id: 'during-cliff',
      name: 'Vesting During Cliff',
      description: 'Vesting has started, but today is before the cliff date. 0% is currently unlocked.',
      schedule: {
        totalAllocated: dcTotal,
        tokenSymbol: 'REV',
        startDate: dcStart,
        cliffDate: dcCliff,
        cliffPercentage: 50,
        endDate: dcEnd,
        vestingType: 'quarterly',
        todayDate: simulatedToday,
        unlocks: dcUnlocks,
      },
    },
    {
      id: 'fully-vested',
      name: 'Already Fully Vested',
      description: 'Vesting started in 2024 and ended in Dec 2025. 100% is fully unlocked.',
      schedule: {
        totalAllocated: fvTotal,
        tokenSymbol: 'REV',
        startDate: fvStart,
        cliffDate: fvCliff,
        cliffPercentage: 20,
        endDate: fvEnd,
        vestingType: 'quarterly',
        todayDate: simulatedToday,
        unlocks: fvUnlocks,
      },
    },
    {
      id: 'long-schedule',
      name: '10-Year Vesting (Monthly)',
      description: '12,000,000 REV vesting monthly over 10 years (120 unlocks) to test scroll overflow and scaling.',
      schedule: {
        totalAllocated: lTotal,
        tokenSymbol: 'REV',
        startDate: lStart,
        cliffDate: '2027-01-01',
        cliffPercentage: 10,
        endDate: lEnd,
        vestingType: 'monthly',
        todayDate: simulatedToday,
        unlocks: lUnlocks,
      },
    },
    {
      id: 'daily-vesting',
      name: 'Daily Vesting (180+ Days)',
      description: '362,000 REV vesting daily over 6 months (~181 daily events) to verify massive data performance.',
      schedule: {
        totalAllocated: dTotal,
        tokenSymbol: 'REV',
        startDate: dStart,
        cliffDate: null,
        cliffPercentage: 0,
        endDate: dEnd,
        vestingType: 'daily',
        todayDate: simulatedToday,
        unlocks: dUnlocks,
      },
    },
    {
      id: 'one-time-unlock',
      name: 'One-Time Unlock',
      description: '100% unlocked immediately at start with no ongoing vesting schedule.',
      schedule: {
        totalAllocated: otTotal,
        tokenSymbol: 'REV',
        startDate: otStart,
        cliffDate: otStart,
        cliffPercentage: 100,
        endDate: otEnd,
        vestingType: 'one-time' as any,
        todayDate: simulatedToday,
        unlocks: otUnlocks,
      },
    },
    {
      id: 'empty-state',
      name: 'No Lockup Schedule',
      description: 'Simulates a user with no active token lockups or empty database records.',
      schedule: null,
    },
    {
      id: 'loading-state',
      name: 'Schedule Loading',
      description: 'Simulates active REST/GraphQL loading states, showcasing beautiful, animated skeleton structures.',
      schedule: null,
    },
    {
      id: 'error-state',
      name: 'Error Loading Schedule',
      description: 'Simulates malformed vesting data, network failures, or partial records.',
      schedule: null,
      isError: true,
    },
  ];
};
