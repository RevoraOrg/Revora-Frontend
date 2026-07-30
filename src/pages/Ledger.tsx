import React from 'react';
import LedgerTable from '../components/LedgerTable/LedgerTable';
import type { Column } from '../components/LedgerTable/LedgerTable';

interface SubEvent {
  id: string;
  date: string;
  type: string;
  amount: number;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: 'investment' | 'payout' | 'distribution' | 'fee';
  amount: number;
  asset: string;
  status: 'confirmed' | 'pending' | 'failed';
  reference: string;
  subEvents?: SubEvent[];
}

const MOCK_ENTRIES: LedgerEntry[] = Array.from({ length: 50 }, (_, i) => {
  const types: LedgerEntry['type'][] = ['investment', 'payout', 'distribution', 'fee'];
  const statuses: LedgerEntry['status'][] = ['confirmed', 'pending', 'failed'];
  
  const hasSubEvents = i % 3 === 0;
  const subEvents = hasSubEvents ? [
    { id: `SUB-${i}-1`, date: new Date(2025, 0, i + 1).toISOString().split('T')[0], type: 'Split', amount: 50 },
    { id: `SUB-${i}-2`, date: new Date(2025, 0, i + 1).toISOString().split('T')[0], type: 'Adjustment', amount: 25 },
  ] : undefined;

  return {
    id: `ENT-${String(i + 1).padStart(4, '0')}`,
    date: new Date(2025, 0, i + 1).toISOString().split('T')[0],
    type: types[i % types.length],
    amount: Math.floor(Math.random() * 10000) / 100,
    asset: 'USDC',
    status: statuses[i % statuses.length],
    reference: `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    subEvents,
  };
});

const columns: Column<LedgerEntry>[] = [
  {
    key: 'date',
    label: 'Date',
    width: '150px',
    render: (r) => <span className="text-sm text-gray-900">{r.date}</span>,
  },
  {
    key: 'type',
    label: 'Type',
    width: '150px',
    render: (r) => <span className="text-sm text-gray-900 capitalize">{r.type}</span>,
  },
  {
    key: 'amount',
    label: 'Amount',
    width: '150px',
    render: (r) => <span className="text-sm text-gray-900">${r.amount.toFixed(2)}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    width: '150px',
    render: (r) => <span className="text-sm text-gray-900 capitalize">{r.status}</span>,
  },
];

function DetailContent({ row }: { row: LedgerEntry }) {
  const hasSubEvents = row.subEvents && row.subEvents.length > 0;

  if (!hasSubEvents) {
    return (
      <div className="px-10 py-4 text-sm text-gray-500 text-center">
        No related events found.
      </div>
    );
  }

  return (
    <div className="px-10 py-4">
      <table className="min-w-full divide-y divide-gray-200 bg-white border border-gray-200 rounded-md" aria-label={`Sub-events for ${row.id}`}>
        <thead className="bg-gray-100">
          <tr>
            <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub-event Date</th>
            <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {row.subEvents!.map((subEvent) => (
            <tr key={subEvent.id}>
              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">{subEvent.date}</td>
              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">{subEvent.type}</td>
              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">${subEvent.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Ledger: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
        <p className="text-muted text-sm mt-1">
          Detailed transaction history and ledger entries.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <LedgerTable
          data={MOCK_ENTRIES}
          columns={columns}
          rowKey={(r) => r.id}
          rowDetail={(row) => <DetailContent row={row} />}
          pageSize={10}
          defaultDensity="comfortable"
          ariaLabel="Ledger entries table"
        />
      </div>
    </div>
  );
};
