import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tabs, { type Tab } from './Tabs';

const tabs: Tab[] = [
  { id: 'all', label: 'All', count: 12 },
  { id: 'pending', label: 'Pending', count: 3 },
  { id: 'failed', label: 'Failed' },
];

function renderTabs(activeTab = 'all', onTabChange = vi.fn()) {
  return render(<Tabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />);
}

describe('Tabs', () => {
  it('renders tabs, counts, roles, and the active state', () => {
    renderTabs('pending');

    expect(screen.getByRole('tablist', { name: 'Activity feed filters' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Pending 3' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'All 12' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tab', { name: 'Failed' })).toHaveAttribute('aria-controls', 'tabpanel-failed');
  });

  it('calls the callback for clicks and keyboard activation', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderTabs('all', onTabChange);
    const pending = screen.getByRole('tab', { name: 'Pending 3' });

    await user.click(pending);
    fireEvent.keyDown(pending, { key: 'Enter' });
    fireEvent.keyDown(pending, { key: ' ' });

    expect(onTabChange).toHaveBeenNthCalledWith(1, 'pending');
    expect(onTabChange).toHaveBeenNthCalledWith(2, 'pending');
    expect(onTabChange).toHaveBeenNthCalledWith(3, 'pending');
  });

  it.each([
    ['ArrowRight', 'pending'],
    ['ArrowLeft', 'failed'],
    ['Home', 'all'],
    ['End', 'failed'],
  ] as const)('moves from the active tab with %s', (key, expectedId) => {
    const onTabChange = vi.fn();
    renderTabs('all', onTabChange);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'All 12' }), { key });
    expect(onTabChange).toHaveBeenCalledWith(expectedId);
  });

  it('renders safely with no tabs or an unknown active id', () => {
    const onTabChange = vi.fn();
    const { rerender } = render(<Tabs tabs={[]} activeTab="missing" onTabChange={onTabChange} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    rerender(<Tabs tabs={tabs} activeTab="missing" onTabChange={onTabChange} />);
    expect(screen.queryAllByRole('tab', { selected: true })).toHaveLength(0);
    expect(screen.getAllByRole('tab').every((tab) => tab.getAttribute('tabindex') === '-1')).toBe(true);
  });
});
