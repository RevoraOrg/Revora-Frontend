import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { axe } from 'jest-axe';
import { NetworkSwitcher } from './NetworkSwitcher';
import { RecentNetworksProvider } from '../RecentNetworksProvider/RecentNetworksProvider';

const networks = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'solana', name: 'Solana' },
  { id: 'arbitrum', name: 'Arbitrum' },
];

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  localStorageMock.clear();
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

function renderWithProvider(ui: React.ReactElement) {
  return render(<RecentNetworksProvider>{ui}</RecentNetworksProvider>);
}

/**
 * Stateful harness mirroring how AppShell owns the current network id. The real
 * NetworkSwitcher is controlled, so selections must update the trigger for
 * subsequent panel interactions to work.
 */
function Harness({ items = networks }: { items?: typeof networks }) {
  const [currentNetworkId, setCurrentNetworkId] = React.useState<string>();
  return (
    <NetworkSwitcher
      networks={items}
      currentNetworkId={currentNetworkId}
      onNetworkChange={setCurrentNetworkId}
    />
  );
}

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /current network/i }));
}

function selectNetwork(name: string) {
  openPanel();
  fireEvent.click(screen.getByText(name));
}

describe('NetworkSwitcher', () => {
  it('renders trigger with current network name', () => {
    renderWithProvider(
      <NetworkSwitcher
        networks={networks}
        currentNetworkId="polygon"
        onNetworkChange={() => {}}
      />,
    );
    expect(screen.getByText('Polygon')).toBeInTheDocument();
  });

  it('renders "Select Network" when no current network', () => {
    renderWithProvider(
      <NetworkSwitcher networks={networks} onNetworkChange={() => {}} />,
    );
    expect(screen.getByText('Select Network')).toBeInTheDocument();
  });

  it('opens panel on trigger click', () => {
    renderWithProvider(
      <NetworkSwitcher networks={networks} onNetworkChange={() => {}} />,
    );
    openPanel();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows all networks in panel', () => {
    renderWithProvider(
      <NetworkSwitcher networks={networks} onNetworkChange={() => {}} />,
    );
    openPanel();
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('calls onNetworkChange when a network is selected', () => {
    const onChange = vi.fn();
    renderWithProvider(
      <NetworkSwitcher networks={networks} onNetworkChange={onChange} />,
    );
    openPanel();
    fireEvent.click(screen.getByText('Solana'));
    expect(onChange).toHaveBeenCalledWith('solana');
  });

  it('closes panel after selecting a network', () => {
    renderWithProvider(
      <NetworkSwitcher networks={networks} onNetworkChange={() => {}} />,
    );
    openPanel();
    fireEvent.click(screen.getByText('Solana'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes panel on Escape', () => {
    renderWithProvider(
      <NetworkSwitcher networks={networks} onNetworkChange={() => {}} />,
    );
    openPanel();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports arrow key navigation in panel', () => {
    renderWithProvider(
      <NetworkSwitcher networks={networks} onNetworkChange={() => {}} />,
    );
    openPanel();
    const listbox = screen.getByRole('listbox');
    const options = screen.getAllByRole('option');
    options[0].focus();
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[1]);
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[0]);
    fireEvent.keyDown(listbox, { key: 'End' });
    expect(document.activeElement).toBe(options[options.length - 1]);
    fireEvent.keyDown(listbox, { key: 'Home' });
    expect(document.activeElement).toBe(options[0]);
  });

  it('hides the Recent Networks section for a new user with no recents', () => {
    renderWithProvider(<Harness items={networks} />);
    openPanel();
    expect(screen.queryByText('Recent Networks')).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('shows recents section after networks are used', () => {
    renderWithProvider(<Harness items={networks} />);
    selectNetwork('Ethereum');
    selectNetwork('Polygon');
    openPanel();
    expect(screen.getByText('Recent Networks')).toBeInTheDocument();
    expect(screen.getByText('All Networks')).toBeInTheDocument();
  });

  it('lists recents most-recent-first and excludes them from All Networks', () => {
    renderWithProvider(<Harness items={networks} />);
    selectNetwork('Ethereum');
    selectNetwork('Polygon');
    openPanel();
    const recentsGroup = screen.getByRole('group', { name: /recent networks/i });
    const recents = screen.getAllByRole('option').filter((el) =>
      recentsGroup.contains(el),
    );
    expect(recents.map((el) => el.textContent)).toEqual(['Polygon', 'Ethereum']);
    const allGroup = screen.getByRole('group', { name: /all networks/i });
    const all = screen.getAllByRole('option').filter((el) => allGroup.contains(el));
    expect(all.map((el) => el.textContent)).toEqual(['Solana', 'Arbitrum']);
  });

  it('renders separator between recents and all networks', () => {
    renderWithProvider(<Harness items={networks} />);
    selectNetwork('Ethereum');
    selectNetwork('Polygon');
    openPanel();
    expect(screen.getByTestId('network-switcher-separator')).toBeInTheDocument();
  });

  it('moves a duplicate selection to the top without repeating it', () => {
    renderWithProvider(<Harness items={networks} />);
    selectNetwork('Ethereum');
    selectNetwork('Polygon');
    selectNetwork('Ethereum');
    openPanel();
    const recentsGroup = screen.getByRole('group', { name: /recent networks/i });
    const recents = screen.getAllByRole('option').filter((el) =>
      recentsGroup.contains(el),
    );
    expect(recents.map((el) => el.textContent)).toEqual(['Ethereum', 'Polygon']);
    const allGroup = screen.getByRole('group', { name: /all networks/i });
    const all = screen.getAllByRole('option').filter((el) => allGroup.contains(el));
    expect(all.map((el) => el.textContent)).toEqual(['Solana', 'Arbitrum']);
  });

  it('keeps only the three most recent networks', () => {
    renderWithProvider(<Harness items={networks} />);
    selectNetwork('Ethereum');
    selectNetwork('Polygon');
    selectNetwork('Solana');
    selectNetwork('Arbitrum');
    openPanel();
    const recentsGroup = screen.getByRole('group', { name: /recent networks/i });
    const recents = screen.getAllByRole('option').filter((el) =>
      recentsGroup.contains(el),
    );
    expect(recents).toHaveLength(3);
    expect(recents.map((el) => el.textContent)).toEqual([
      'Arbitrum',
      'Solana',
      'Polygon',
    ]);
    const allGroup = screen.getByRole('group', { name: /all networks/i });
    const all = screen.getAllByRole('option').filter((el) => allGroup.contains(el));
    expect(all.map((el) => el.textContent)).toEqual(['Ethereum']);
  });

  it('restores recents persisted from a previous session', () => {
    store['revora-recent-networks:default'] = JSON.stringify(['polygon', 'ethereum']);
    renderWithProvider(<Harness items={networks} />);
    openPanel();
    const recentsGroup = screen.getByRole('group', { name: /recent networks/i });
    const recents = screen.getAllByRole('option').filter((el) =>
      recentsGroup.contains(el),
    );
    expect(recents.map((el) => el.textContent)).toEqual(['Polygon', 'Ethereum']);
  });

  it('treats corrupted persisted recents as empty', () => {
    store['revora-recent-networks:default'] = 'not-json[';
    renderWithProvider(<Harness items={networks} />);
    openPanel();
    expect(screen.queryByText('Recent Networks')).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('supports keyboard navigation across recent and all-network sections', () => {
    store['revora-recent-networks:default'] = JSON.stringify(['polygon', 'ethereum']);
    renderWithProvider(<Harness items={networks} />);
    openPanel();
    const listbox = screen.getByRole('listbox');
    const options = screen.getAllByRole('option');
    expect(options.map((el) => el.textContent)).toEqual([
      'Polygon',
      'Ethereum',
      'Solana',
      'Arbitrum',
    ]);
    options[0].focus();
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[1]);
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[2]);
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[1]);
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[0]);
  });

  it('labels each section group from its visible heading', () => {
    store['revora-recent-networks:default'] = JSON.stringify(['polygon']);
    renderWithProvider(<Harness items={networks} />);
    openPanel();
    expect(screen.getByRole('group', { name: 'Recent Networks' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'All Networks' })).toBeInTheDocument();
  });

  it('shows an empty state when no networks are configured', () => {
    renderWithProvider(<Harness items={[]} />);
    openPanel();
    expect(screen.queryByText('Recent Networks')).not.toBeInTheDocument();
    expect(screen.queryByText('All Networks')).not.toBeInTheDocument();
    expect(screen.getByText('No networks available')).toBeInTheDocument();
  });

  it('passes axe in light and dark mode with recents present', async () => {
    store['revora-recent-networks:default'] = JSON.stringify(['polygon', 'ethereum']);
    const { container } = renderWithProvider(<Harness items={networks} />);
    openPanel();
    expect(await axe(container)).toHaveNoViolations();

    document.documentElement.setAttribute('data-theme', 'dark');
    expect(await axe(container)).toHaveNoViolations();
    document.documentElement.removeAttribute('data-theme');
  });

  it('closes on close button click', () => {
    renderWithProvider(
      <NetworkSwitcher networks={networks} onNetworkChange={() => {}} />,
    );
    openPanel();
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('has accessible aria attributes', () => {
    renderWithProvider(
      <NetworkSwitcher
        networks={networks}
        currentNetworkId="solana"
        onNetworkChange={() => {}}
      />,
    );
    const trigger = screen.getByRole('button', { name: /current network: solana/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
