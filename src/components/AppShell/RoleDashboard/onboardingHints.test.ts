import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import {
	LocalStorageHintStorage,
	DEFAULT_HINT_STORAGE,
	hintStorageKey,
	useOnboardingHint,
} from './onboardingHints';
import type { DashboardHintStorage } from './onboardingHints';

describe('hintStorageKey', () => {
	test('produces a role-scoped key', () => {
		expect(hintStorageKey('investor')).toBe('revora.dashboard-hint.investor');
		expect(hintStorageKey('admin')).toBe('revora.dashboard-hint.admin');
	});
});

describe('LocalStorageHintStorage', () => {
	const key = hintStorageKey('issuer');

	test('returns null when nothing is stored', () => {
		window.localStorage.removeItem(key);
		expect(new LocalStorageHintStorage().read(key)).toBeNull();
	});

	test('reads a persisted dismissal', () => {
		const storage = new LocalStorageHintStorage();
		storage.write(key, true);
		expect(storage.read(key)).toBe(true);
	});

	test('returns null for corrupt JSON (falls back to showing the hint)', () => {
		window.localStorage.setItem(key, '{not-valid-json');
		expect(new LocalStorageHintStorage().read(key)).toBeNull();
		window.localStorage.clear();
	});

	test('returns null when storage access throws', () => {
		const getItem = vi
			.spyOn(window.localStorage, 'getItem')
			.mockImplementation(() => {
				throw new Error('storage unavailable');
			});
		try {
			expect(new LocalStorageHintStorage().read(key)).toBeNull();
		} finally {
			getItem.mockRestore();
		}
	});

	test('write failures are non-fatal', () => {
		const setItem = vi
			.spyOn(window.localStorage, 'setItem')
			.mockImplementation(() => {
				throw new Error('quota exceeded');
			});
		try {
			expect(() =>
				new LocalStorageHintStorage().write(key, true)
			).not.toThrow();
		} finally {
			setItem.mockRestore();
		}
		window.localStorage.clear();
	});
});

describe('useOnboardingHint', () => {
	const createMock = (initial: boolean | null): DashboardHintStorage => {
		let value = initial;
		return {
			read: () => value,
			write: (_key, dismissed) => {
				value = dismissed;
			},
		};
	};

	test('shows the hint on first run', () => {
		const { result } = renderHook(() =>
			useOnboardingHint('investor', createMock(null))
		);
		expect(result.current.show).toBe(true);
	});

	test('hides the hint when it was previously dismissed', () => {
		const { result } = renderHook(() =>
			useOnboardingHint('investor', createMock(true))
		);
		expect(result.current.show).toBe(false);
	});

	test('dismiss calls write and flips show', () => {
		const storage = createMock(null);
		const writeSpy = vi.spyOn(storage, 'write');

		const { result } = renderHook(() =>
			useOnboardingHint('issuer', storage)
		);
		expect(result.current.show).toBe(true);

		act(() => result.current.dismiss());

		expect(result.current.show).toBe(false);
		expect(writeSpy).toHaveBeenCalledWith(
			hintStorageKey('issuer'),
			true
		);
	});

	test('dismissing one role does not affect another', () => {
		const storage = createMock(null);
		const investor = renderHook(() =>
			useOnboardingHint('investor', storage)
		);
		const admin = renderHook(() => useOnboardingHint('admin', storage));

		act(() => investor.result.current.dismiss());

		expect(investor.result.current.show).toBe(false);
		expect(admin.result.current.show).toBe(true);
	});

	test('initiallyDismissed forces the hint off', () => {
		const { result } = renderHook(() =>
			useOnboardingHint('admin', createMock(null), true)
		);
		expect(result.current.show).toBe(false);
	});

	test('storage is read per role on mount', () => {
		const readSpy = vi.spyOn(DEFAULT_HINT_STORAGE, 'read');
		renderHook(() => useOnboardingHint('admin'));

		expect(readSpy).toHaveBeenCalledWith(hintStorageKey('admin'));
	});
});