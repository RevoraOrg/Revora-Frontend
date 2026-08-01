import { analyzeConflicts, LockupPeriod, RedemptionWindow } from './conflictAnalysis';
import { PayoutEvent } from './PayoutTimeline';

const makePayout = (id: string, date: string, status: PayoutEvent['status'] = 'upcoming'): PayoutEvent => ({
  id,
  date,
  label: `Payout ${id}`,
  status,
  amount: '1000',
  token: 'USDC',
});

describe('analyzeConflicts - enhanced', () => {
  const lockups: LockupPeriod[] = [
    { start: '2026-08-01', end: '2026-08-15', label: 'Q3 Lockup' },
    { start: '2026-09-01', end: '2026-09-30', label: 'Vesting Cliff' },
  ];

  const redemptions: RedemptionWindow[] = [
    { date: '2026-08-20', label: 'Series A Redemption' },
  ];

  it('detects exact date collision (hard)', () => {
    const payouts = [makePayout('1', '2026-08-01'), makePayout('2', '2026-08-01')];
    const conflicts = analyzeConflicts('1', '2026-08-01', payouts);
    const hard = conflicts.filter(c => c.severity === 'hard');
    expect(hard.length).toBeGreaterThanOrEqual(1);
    expect(hard[0].message).toContain('already scheduled');
  });

  it('detects lockup period overlap (hard)', () => {
    const payouts = [makePayout('1', '2026-08-10')];
    const conflicts = analyzeConflicts('1', '2026-08-10', payouts, lockups);
    const lockupConflict = conflicts.find(c => c.id.includes('lockup'));
    expect(lockupConflict).toBeTruthy();
    expect(lockupConflict!.severity).toBe('hard');
    expect(lockupConflict!.message).toContain('Q3 Lockup');
    expect(lockupConflict!.suggestion).toBeTruthy();
  });

  it('detects redemption window conflict (hard)', () => {
    const payouts = [makePayout('1', '2026-08-20')];
    const conflicts = analyzeConflicts('1', '2026-08-20', payouts, [], redemptions);
    const rwConflict = conflicts.find(c => c.id.includes('redemption'));
    expect(rwConflict).toBeTruthy();
    expect(rwConflict!.severity).toBe('hard');
  });

  it('detects soft proximity warning', () => {
    const payouts = [makePayout('1', '2026-08-01'), makePayout('2', '2026-08-03', 'processing')];
    const conflicts = analyzeConflicts('1', '2026-08-01', payouts);
    const soft = conflicts.find(c => c.severity === 'soft');
    expect(soft).toBeTruthy();
  });

  it('detects near lockup boundary (soft)', () => {
    const payouts = [makePayout('1', '2026-08-17')]; // 2 days after lockup ends
    const conflicts = analyzeConflicts('1', '2026-08-17', payouts, lockups);
    const boundary = conflicts.find(c => c.id.includes('lockup-boundary'));
    expect(boundary).toBeTruthy();
    expect(boundary!.severity).toBe('soft');
  });

  it('detects payout clustering (info)', () => {
    const payouts = [
      makePayout('1', '2026-08-01'),
      makePayout('2', '2026-08-01'),
      makePayout('3', '2026-08-01'),
    ];
    const conflicts = analyzeConflicts('1', '2026-08-01', payouts);
    const cluster = conflicts.find(c => c.severity === 'info');
    expect(cluster).toBeTruthy();
    expect(cluster!.message).toContain('3 payouts');
  });

  it('returns suggestions with every conflict', () => {
    const payouts = [makePayout('1', '2026-08-01'), makePayout('2', '2026-08-01')];
    const conflicts = analyzeConflicts('1', '2026-08-01', payouts, lockups, redemptions);
    conflicts.forEach(c => {
      expect(c.suggestion).toBeTruthy();
      expect(typeof c.suggestion).toBe('string');
      expect(c.suggestion!.length).toBeGreaterThan(10);
    });
  });

  it('no conflicts when all clear', () => {
    const payouts = [makePayout('1', '2026-12-25')];
    const conflicts = analyzeConflicts('1', '2026-12-25', payouts, lockups, redemptions);
    expect(conflicts).toHaveLength(0);
  });
});
