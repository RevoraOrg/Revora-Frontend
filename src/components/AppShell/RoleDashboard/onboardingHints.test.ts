import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import {
  HINT_KEY_PREFIX,
  LocalStorageHintStorage,
  DEFAULT_HINT_STORAGE,
  hintStorageKey,
  useOnboardingHint,
} from './onboardingHints';
import type { DashboardHintStorage } from './onboardingHints';
import type { UserRole } from './roleDashboard.types';

describe('HINT_KEY_PREFIX and hintStorageKey', () => {
  test('HINT_KEY_PREFIX constant is correctly defined', () => {
    expect(HINT_KEY_PREFIX).toBe('revora.dashboard-hint.');
  });

  test('produces role-scoped key for all platform roles', () => {
    const roles: UserRole[] = ['investor', 'issuer', 'admin'];
    roles.forEach((role) => {
      const key = hintStorageKey(role);
      expect(key).toBe(`${HINT_KEY_PREFIX}${role}`);
      expect(key.startsWith(HINT_KEY_PREFIX)).toBe(true);
      expect(key.endsWith(role)).toBe(true);
    });
  });

  test('handles arbitrary role strings consistently', () => {
    expect(hintStorageKey('custom-role' as UserRole)).toBe(
      `${HINT_KEY_PREFIX}custom-role`
    );
    expect(hintStorageKey('' as UserRole)).toBe(HINT_KEY_PREFIX);
  });
});

describe('LocalStorageHintStorage - HINT_KEY_PREFIX and Failure Handling', () => {
  const key = hintStorageKey('issuer');

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Line 26 empty-result branch: if (raw === null) return null', () => {
    test('returns null when key does not exist in localStorage', () => {
      const storage = new LocalStorageHintStorage();
      expect(window.localStorage.getItem(key)).toBeNull();
      expect(storage.read(key)).toBeNull();
    });

    test('returns null when an existing key is removed', () => {
      const storage = new LocalStorageHintStorage();
      storage.write(key, true);
      expect(storage.read(key)).toBe(true);

      window.localStorage.removeItem(key);
      expect(storage.read(key)).toBeNull();
    });

    test('returns null for all role hint keys prior to any dismissal', () => {
      const storage = new LocalStorageHintStorage();
      const roles: UserRole[] = ['investor', 'issuer', 'admin'];
      roles.forEach((role) => {
        expect(storage.read(hintStorageKey(role))).toBeNull();
      });
    });
  });

  describe('Line 31 error-handling branch: catch { return null; }', () => {
    test('returns null for malformed or corrupted JSON string', () => {
      const storage = new LocalStorageHintStorage();
      window.localStorage.setItem(key, '{not-valid-json');
      expect(storage.read(key)).toBeNull();
    });

    test('returns null for unclosed JSON objects and arrays', () => {
      const storage = new LocalStorageHintStorage();
      window.localStorage.setItem(key, '{"dismissed": true');
      expect(storage.read(key)).toBeNull();

      window.localStorage.setItem(key, '[true, false');
      expect(storage.read(key)).toBeNull();
    });

    test('returns null for empty string in storage (JSON.parse failure)', () => {
      const storage = new LocalStorageHintStorage();
      window.localStorage.setItem(key, '');
      expect(storage.read(key)).toBeNull();
    });

    test('returns null when storage.getItem throws an Error', () => {
      const storage = new LocalStorageHintStorage();
      const getItem = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new Error('Access to localStorage denied');
        });

      expect(storage.read(key)).toBeNull();
      expect(getItem).toHaveBeenCalledWith(key);
    });

    test('returns null when storage.getItem throws a SecurityError/DOMException', () => {
      const storage = new LocalStorageHintStorage();
      const getItem = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new DOMException('Security error in third-party context', 'SecurityError');
        });

      expect(storage.read(key)).toBeNull();
      expect(getItem).toHaveBeenCalledWith(key);
    });
  });

  describe('Normal path and boundary value interpretation', () => {
    test('reads a persisted true value as boolean true', () => {
      const storage = new LocalStorageHintStorage();
      storage.write(key, true);
      expect(window.localStorage.getItem(key)).toBe('true');
      expect(storage.read(key)).toBe(true);
    });

    test('reads a persisted false value as boolean false (not null and not true)', () => {
      const storage = new LocalStorageHintStorage();
      storage.write(key, false);
      expect(window.localStorage.getItem(key)).toBe('false');
      expect(storage.read(key)).toBe(false);
    });

    test('returns false for non-boolean JSON values without throwing', () => {
      const storage = new LocalStorageHintStorage();

      window.localStorage.setItem(key, 'null');
      expect(storage.read(key)).toBe(false);

      window.localStorage.setItem(key, '0');
      expect(storage.read(key)).toBe(false);

      window.localStorage.setItem(key, '1');
      expect(storage.read(key)).toBe(false);

      window.localStorage.setItem(key, '"true"');
      expect(storage.read(key)).toBe(false);

      window.localStorage.setItem(key, '{"dismissed":true}');
      expect(storage.read(key)).toBe(false);

      window.localStorage.setItem(key, '[true]');
      expect(storage.read(key)).toBe(false);
    });
  });

  describe('write failure handling', () => {
    test('silently suppresses QuotaExceededError when saving hint', () => {
      const storage = new LocalStorageHintStorage();
      const setItem = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        });

      expect(() => storage.write(key, true)).not.toThrow();
      expect(setItem).toHaveBeenCalledWith(key, 'true');
    });

    test('silently suppresses generic errors when saving hint', () => {
      const storage = new LocalStorageHintStorage();
      const setItem = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('Storage write failed');
        });

      expect(() => storage.write(key, true)).not.toThrow();
      expect(setItem).toHaveBeenCalledWith(key, 'true');
    });
  });
});

describe('useOnboardingHint', () => {
  const createMockStorage = (initial: boolean | null): DashboardHintStorage => {
    let value = initial;
    return {
      read: vi.fn(() => value),
      write: vi.fn((_key, dismissed) => {
        value = dismissed;
      }),
    };
  };

  test('shows the hint on first run when storage returns null', () => {
    const storage = createMockStorage(null);
    const { result } = renderHook(() =>
      useOnboardingHint('investor', storage)
    );
    expect(result.current.show).toBe(true);
    expect(storage.read).toHaveBeenCalledWith('revora.dashboard-hint.investor');
  });

  test('shows the hint when storage fails / degrades to null', () => {
    const brokenStorage: DashboardHintStorage = {
      read: vi.fn(() => null),
      write: vi.fn(),
    };
    const { result } = renderHook(() =>
      useOnboardingHint('admin', brokenStorage)
    );
    expect(result.current.show).toBe(true);
  });

  test('shows the hint when storage returns false', () => {
    const storage = createMockStorage(false);
    const { result } = renderHook(() =>
      useOnboardingHint('issuer', storage)
    );
    expect(result.current.show).toBe(true);
  });

  test('hides the hint when storage returns true (persisted dismissal)', () => {
    const storage = createMockStorage(true);
    const { result } = renderHook(() =>
      useOnboardingHint('investor', storage)
    );
    expect(result.current.show).toBe(false);
  });

  test('dismiss action persists dismissal and flips show to false', () => {
    const storage = createMockStorage(null);

    const { result } = renderHook(() =>
      useOnboardingHint('issuer', storage)
    );
    expect(result.current.show).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.show).toBe(false);
    expect(storage.write).toHaveBeenCalledWith(
      'revora.dashboard-hint.issuer',
      true
    );
  });

  test('dismissing one role does not affect another role key', () => {
    const storage = createMockStorage(null);
    const investor = renderHook(() =>
      useOnboardingHint('investor', storage)
    );
    const admin = renderHook(() => useOnboardingHint('admin', storage));

    act(() => {
      investor.result.current.dismiss();
    });

    expect(investor.result.current.show).toBe(false);
    expect(admin.result.current.show).toBe(true);
    expect(storage.write).toHaveBeenCalledWith(
      'revora.dashboard-hint.investor',
      true
    );
  });

  test('initiallyDismissed forces hint off without relying on storage read', () => {
    const storage = createMockStorage(null);
    const { result } = renderHook(() =>
      useOnboardingHint('admin', storage, true)
    );
    expect(result.current.show).toBe(false);
  });

  test('reads storage using DEFAULT_HINT_STORAGE when storage parameter is omitted', () => {
    const readSpy = vi.spyOn(DEFAULT_HINT_STORAGE, 'read');
    renderHook(() => useOnboardingHint('admin'));

    expect(readSpy).toHaveBeenCalledWith('revora.dashboard-hint.admin');
    readSpy.mockRestore();
  });

  test('re-evaluates storage when role changes dynamically', () => {
    const storage: DashboardHintStorage = {
      read: vi.fn((key: string) => {
        if (key === 'revora.dashboard-hint.investor') return true;
        if (key === 'revora.dashboard-hint.issuer') return null;
        return false;
      }),
      write: vi.fn(),
    };

    let role: UserRole = 'investor';
    const { result, rerender } = renderHook(() =>
      useOnboardingHint(role, storage)
    );

    expect(result.current.show).toBe(false);

    role = 'issuer';
    rerender();

    expect(result.current.show).toBe(true);
  });
});
