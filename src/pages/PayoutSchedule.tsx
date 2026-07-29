import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { EmptyState } from '../components/designSystem/EmptyState';
import { CalendarExportDialog } from '../components/CalendarExportDialog';
import { Button } from '../components/Button';
import { PayoutStatusPill, PAYOUT_STATUS_ORDER } from '../components/PayoutStatusPill';

export interface Payout {
  id: string;
  recipient: string;
  amount: string;
  scheduledFor: string;
  status: string;
}

export const DEMO_PAYOUTS: Payout[] = [
  { id: '1', recipient: '0x1234...abcd', amount: 'USDC 500', scheduledFor: '2026-08-15', status: 'scheduled' },
  { id: '2', recipient: '0x5678...ef01', amount: 'USDC 250', scheduledFor: '2026-08-01', status: 'preparing' },
  { id: '3', recipient: '0x9abc...def0', amount: 'USDC 100', scheduledFor: '2026-07-15', status: 'sending' },
  { id: '4', recipient: '0x2468...1357', amount: 'USDC 750', scheduledFor: '2026-07-01', status: 'confirmed' },
  { id: '5', recipient: '0x1357...2468', amount: 'USDC 300', scheduledFor: '2026-06-15', status: 'retrying' },
  { id: '6', recipient: '0xabcd...1234', amount: 'USDC 50', scheduledFor: '2026-06-01', status: 'failed' },
  { id: '7', recipient: '0xef01...5678', amount: 'USDC 200', scheduledFor: '2026-05-15', status: 'canceled' },
];

interface PayoutScheduleProps {
  payouts?: Payout[];
  empty?: boolean;
}

export const PayoutSchedule: React.FC<PayoutScheduleProps> = ({ payouts = DEMO_PAYOUTS, empty = false }) => {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payout Schedule</h1>
          <p className="text-muted text-sm mt-1">
            View upcoming and past RevenueShare payout dates.
          </p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => setIsExportDialogOpen(true)}
          style={{ width: 'auto' }}
        >
          <Calendar size={18} />
          Subscribe
        </Button>
      </div>

      {empty ? (
        <EmptyState
          variant="payout-schedule"
          title="No payouts scheduled"
          description="Payouts will appear here once revenue is reported and the distribution cycle begins."
          primaryAction={{
            label: 'Report Revenue',
            href: '/startup/report-revenue',
          }}
          secondaryAction={{
            label: 'Learn How It Works',
            href: '/',
          }}
        />
      ) : (
        <>
          <div data-testid="payout-status-legend" className="flex flex-wrap gap-2">
            {PAYOUT_STATUS_ORDER.map((status) => (
              <PayoutStatusPill key={status} status={status} variant="full" />
            ))}
          </div>

          <table data-testid="payout-schedule-table" className="w-full">
            <thead>
              <tr>
                <th className="text-left text-muted text-xs font-medium uppercase tracking-wide pb-3">Recipient</th>
                <th className="text-left text-muted text-xs font-medium uppercase tracking-wide pb-3">Amount</th>
                <th className="text-left text-muted text-xs font-medium uppercase tracking-wide pb-3">Date</th>
                <th className="text-left text-muted text-xs font-medium uppercase tracking-wide pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} data-testid={`payout-row-${payout.id}`} className="border-t border-border">
                  <td className="py-3 text-sm">{payout.recipient}</td>
                  <td className="py-3 text-sm">{payout.amount}</td>
                  <td className="py-3 text-sm">{payout.scheduledFor}</td>
                  <td className="py-3">
                    <PayoutStatusPill status={payout.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <CalendarExportDialog 
        isOpen={isExportDialogOpen} 
        onClose={() => setIsExportDialogOpen(false)} 
      />
    </div>
  );
};
