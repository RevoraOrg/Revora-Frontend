/**
 * useCommandPalette — unit tests
 * Coverage target: ≥95%
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  useCommandPalette,
  RECENT_LIMIT,
  recentCommandsKey,
  clearRecentCommandsForUser,
} from './useCommandPalette';
import type { CommandItem } from '../components/CommandPalette/commandPaletteData';
import { COMMAND_BY_ID } from '../components/CommandPalette/commandPaletteData';

const ITEM_A: CommandItem = { id: 'nav:dashboard', group: 'navigate', label: 'Dashboard' };
const ITEM_B: CommandItem = { id: 'action:sign-out', group: 'actions', label: 'Sign Out' };
const ITEM_C: CommandItem = { id: 'settings:profile', group: 'settings', label: 'Profile' };

function Harness({ userId }: { userId?: string }) {
  const { isOpen, isMac, open, close, toggle, recentCommands, addRecent, clearRecent } =
    useCommandPalette({ userId });
  return (
    <div>
      <span data-testid="state">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="mac">{isMac ? 'mac' : 'not-mac'}</span>
      <span data-testid="recent-count">{recentCommands.length}</span>
      <span data-testid="recent-ids">{recentCommands.map((r) => r.id).join(',')}</span>
      <button data-testid="open" onClick={open}>open</button>
      <button data-testid="close" onClick={close}>close</button>
      <button data-testid="toggle" onClick={toggle}>toggle</button>
      <button data-testid="add-a" onClick={() => addRecent(ITEM_A)}>add-a</button>
      <button data-testid="add-b" onClick={() => addRecent(ITEM_B)}>add-b</button>
      <button data-testid="add-c" onClick={() => addRecent(ITEM_C)}>add-c</button>
      <button data-testid="clear" onClick={clearRecent}>clear</button>
      <input data-testid="input" type="text" />
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useCommandPalette', () => {
  describe('open/close/toggle', () => {
    it('starts closed', () => {
      render(<Harness />);
      expect(screen.getByTestId('state')).toHaveTextContent('closed');
    });

    it('opens via open()', () => {
      render(<Harness />);
      fireEvent.click(screen.getByTestId('open'));
      expect(screen.getByTestId('state')).toHaveTextContent('open');
    });

    it('closes via close()', () => {
      render(<Harness />);
      fireEvent.click(screen.getByTestId('open'));
      fireEvent.click(screen.getByTestId('close'));
      expect(screen.getByTestId('state')).toHaveTextContent('closed');
    });

    it('toggles open then closed', () => {
      render(<Harness />);
      fireEvent.click(screen.getByTestId('toggle'));
      expect(screen.getByTestId('state')).toHaveTextContent('open');
      fireEvent.click(screen.getByTestId('toggle'));
      expect(screen.getByTestId('state')).toHaveTextContent('closed');
    });

    it('opens via Cmd+K', () => {
      render(<Harness />);
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
      expect(screen.getByTestId('state')).toHaveTextContent('open');
    });

    it('opens via Ctrl+K', () => {
      render(<Harness />);
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      expect(screen.getByTestId('state')).toHaveTextContent('open');
    });

    it('closes via Escape when open', () => {
      render(<Harness />);
      fireEvent.click(screen.getByTestId('open'));
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.getByTestId('state')).toHaveTextContent('closed');
    });

    it('Escape does nothing when already closed', () => {
      render(<Harness />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.getByTestId('state')).toHaveTextContent('closed');
    });

    it('does not open Ctrl+K when focused in input', () => {
      render(<Harness />);
      const input = screen.getByTestId('input');
      fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
      expect(screen.getByTestId('state')).toHaveTextContent('closed');
    });

    it('open is idempotent', () => {
      render(<Harness />);
      fireEvent.click(screen.getByTestId('open'));
      fireEvent.click(screen.getByTestId('open'));
      expect(screen.getByTestId('state')).toHaveTextContent('open');
    });

    it('close is idempotent', () => {
      render(<Harness />);
      fireEvent.click(screen.getByTestId('close'));
      expect(screen.getByTestId('state')).toHaveTextContent('closed');
    });

    it('removes keydown listener on unmount', () => {
      const spy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<Harness />);
      unmount();
      expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('platform detection', () => {
    it('detects Mac', () => {
      Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
      render(<Harness />);
      expect(screen.getByTestId('mac')).toHaveTextContent('mac');
      Object.defineProperty(navigator, 'platform', { value: '', configurable: true });
    });

    it('detects non-Mac', () => {
      Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true });
      render(<Harness />);
      expect(screen.getByTestId('mac')).toHaveTextContent('not-mac');
      Object.defineProperty(navigator, 'platform', { value: '', configurable: true });
    });
  });

  describe('recent commands', () => {
    it('starts empty', () => {
      render(<Harness />);
      expect(screen.getByTestId('recent-count')).toHaveTextContent('0');
    });

    it('addRecent prepends item', () => {
      render(<Harness />);
      fireEvent.click(screen.getByTestId('add-a'));
      expect(screen.getByTestId('recent-ids')).toHaveTextContent(ITEM_A.id);
    });

    it('addRecent deduplicates — most-recent wins', () => {
      render(<Harness />);
      fireEvent.click(screen.getByTestId('add-a'));
      fireEvent.click(screen.getByTestId('add-b'));
      fireEvent.click(screen.getByTestId('add-a')); // re-add A
      const ids = screen.getByTestId('recent-ids').textContent!.split(',');
      expect(ids[0]).toBe(ITEM_A.id);
      expect(ids.filter((id) => id === ITEM_A.id)).toHaveLength(1);
    });

    it(`caps list at RECENT_LIMIT (${RECENT_LIMIT})`, () => {
      // Test 1: simulate stored entries exceeding limit with catalog items
      const catalogIds = [
        'nav:home',
        'nav:dashboard',
        'nav:discovery',
        'nav:revenue',
        'nav:payout-schedule',
        'nav:audit-trail',
        'nav:sessions',
      ];
      const key = recentCommandsKey(undefined);
      localStorage.setItem(
        key,
        JSON.stringify(catalogIds.map((id, idx) => ({ id, timestamp: idx }))),
      );

      // Mount hook and verify loaded recents are capped at RECENT_LIMIT
      const { unmount } = render(<Harness />);
      const count = parseInt(screen.getByTestId('recent-count').textContent ?? '0');
      expect(count).toBe(RECENT_LIMIT);
      unmount();
    });

    it('clearRecent resets to empty', () => {
      render(<Harness />);
      fireEvent.click(screen.getByTestId('add-a'));
      fireEvent.click(screen.getByTestId('clear'));
      expect(screen.getByTestId('recent-count')).toHaveTextContent('0');
    });

    it('clearRecent removes localStorage entry', () => {
      render(<Harness userId="u1" />);
      fireEvent.click(screen.getByTestId('add-a'));
      fireEvent.click(screen.getByTestId('clear'));
      expect(localStorage.getItem(recentCommandsKey('u1'))).toBeNull();
    });

    it('persists recents as id and timestamp to localStorage', () => {
      render(<Harness userId="u2" />);
      fireEvent.click(screen.getByTestId('add-a'));
      const stored = JSON.parse(localStorage.getItem(recentCommandsKey('u2'))!);
      expect(stored[0].id).toBe(ITEM_A.id);
      expect(typeof stored[0].timestamp).toBe('number');
      expect(stored[0].label).toBeUndefined();
      expect(stored[0].group).toBeUndefined();
    });

    it('drops unknown command ids that no longer exist in catalog', () => {
      const key = recentCommandsKey('user-unknown');
      localStorage.setItem(
        key,
        JSON.stringify([
          { id: 'unknown:deleted-command', timestamp: 123 },
          { id: 'nav:dashboard', timestamp: 456 },
          { id: 'non-existent:action', timestamp: 789 },
        ]),
      );

      let hookResult: ReturnType<typeof useCommandPalette>;
      function TestUnknown() {
        hookResult = useCommandPalette({ userId: 'user-unknown' });
        return null;
      }
      render(<TestUnknown />);

      expect(hookResult!.recentCommands).toHaveLength(1);
      expect(hookResult!.recentCommands[0].id).toBe('nav:dashboard');

      // Check that localStorage was migrated to drop unknown ids
      const migrated = JSON.parse(localStorage.getItem(key)!);
      expect(migrated).toHaveLength(1);
      expect(migrated[0].id).toBe('nav:dashboard');
    });

    it('migrates legacy stored format (full object array) to id and timestamp format', () => {
      const key = recentCommandsKey('legacy-user');
      const legacyObjects = [
        {
          id: 'nav:dashboard',
          group: 'navigate',
          label: 'Dashboard',
          description: '/dashboard',
          icon: 'LayoutDashboard',
        },
        {
          id: 'nav:home',
          group: 'navigate',
          label: 'Home',
          icon: 'Home',
        },
      ];
      localStorage.setItem(key, JSON.stringify(legacyObjects));

      let hookResult: ReturnType<typeof useCommandPalette>;
      function TestLegacy() {
        hookResult = useCommandPalette({ userId: 'legacy-user' });
        return null;
      }
      render(<TestLegacy />);

      expect(hookResult!.recentCommands).toHaveLength(2);
      expect(hookResult!.recentCommands[0].id).toBe('nav:dashboard');
      expect(hookResult!.recentCommands[1].id).toBe('nav:home');

      // Verify localStorage was updated to new schema
      const migrated = JSON.parse(localStorage.getItem(key)!);
      expect(migrated).toHaveLength(2);
      expect(migrated[0].id).toBe('nav:dashboard');
      expect(typeof migrated[0].timestamp).toBe('number');
      expect(migrated[0].label).toBeUndefined();
    });

    it('rehydrates recent commands from catalog and preserves onExecute after reload (regression)', () => {
      const catalogDashboard = COMMAND_BY_ID.get('nav:dashboard')!;
      const originalOnExecute = catalogDashboard.onExecute;
      const mockOnExecute = vi.fn();
      catalogDashboard.onExecute = mockOnExecute;

      try {
        // 1. First session: add command to recents
        const { unmount } = render(<Harness userId="regression-user" />);
        fireEvent.click(screen.getByTestId('add-a'));
        unmount();

        // 2. Simulated reload: mount new hook instance for same user
        let hookResult: ReturnType<typeof useCommandPalette>;
        function TestReload() {
          hookResult = useCommandPalette({ userId: 'regression-user' });
          return null;
        }
        render(<TestReload />);

        // 3. Selecting/executing the reloaded recent item must call onExecute
        expect(hookResult!.recentCommands).toHaveLength(1);
        expect(hookResult!.recentCommands[0].id).toBe('nav:dashboard');
        expect(hookResult!.recentCommands[0].onExecute).toBeDefined();
        expect(typeof hookResult!.recentCommands[0].onExecute).toBe('function');
        hookResult!.recentCommands[0].onExecute?.();
        expect(mockOnExecute).toHaveBeenCalledTimes(1);
      } finally {
        catalogDashboard.onExecute = originalOnExecute;
      }
    });
  });

  describe('recentCommandsKey', () => {
    it('returns key with userId', () => {
      expect(recentCommandsKey('user-123')).toBe('revora:recent-commands:user-123');
    });

    it('returns anonymous key when no userId', () => {
      expect(recentCommandsKey()).toBe('revora:recent-commands:anonymous');
    });
  });

  describe('clearRecentCommandsForUser', () => {
    it('removes the storage entry', () => {
      localStorage.setItem(recentCommandsKey('u3'), JSON.stringify([ITEM_A]));
      clearRecentCommandsForUser('u3');
      expect(localStorage.getItem(recentCommandsKey('u3'))).toBeNull();
    });

    it('does not throw when key does not exist', () => {
      expect(() => clearRecentCommandsForUser('nobody')).not.toThrow();
    });
  });

  describe('localStorage error resilience', () => {
    it('does not throw when localStorage.getItem throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('quota'); });
      expect(() => render(<Harness />)).not.toThrow();
    });

    it('does not throw when localStorage.setItem throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
      render(<Harness />);
      expect(() => fireEvent.click(screen.getByTestId('add-a'))).not.toThrow();
    });

    it('handles corrupted JSON in localStorage', () => {
      localStorage.setItem(recentCommandsKey(), 'not-valid-json{{');
      expect(() => render(<Harness />)).not.toThrow();
      expect(screen.getByTestId('recent-count')).toHaveTextContent('0');
    });

    it('handles non-array JSON in localStorage', () => {
      localStorage.setItem(recentCommandsKey(), JSON.stringify({ foo: 'bar' }));
      expect(() => render(<Harness />)).not.toThrow();
      expect(screen.getByTestId('recent-count')).toHaveTextContent('0');
    });

    it('handles string id items and null/invalid entries in stored array', () => {
      localStorage.setItem(
        recentCommandsKey(),
        JSON.stringify(['nav:dashboard', null, 123, { id: 456 }, {}]),
      );
      expect(() => render(<Harness />)).not.toThrow();
      expect(screen.getByTestId('recent-ids')).toHaveTextContent('nav:dashboard');
    });

    it('handles localStorage.setItem throwing inside loadRecent gracefully', () => {
      localStorage.setItem(recentCommandsKey(), JSON.stringify([{ id: 'nav:dashboard', timestamp: 123 }]));
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      expect(() => render(<Harness />)).not.toThrow();
      expect(screen.getByTestId('recent-ids')).toHaveTextContent('nav:dashboard');
    });
  });
});
