import { renderHook } from '@testing-library/react';
import { useUnsavedChanges } from './useUnsavedChanges';
import { vi, type MockInstance } from 'vitest';
import { useBlocker } from 'react-router-dom';

vi.mock('react-router-dom', () => ({
  useBlocker: vi.fn(),
}));

describe('useUnsavedChanges', () => {
  let addEventListenerSpy: MockInstance;
  let removeEventListenerSpy: MockInstance;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    vi.clearAllMocks();
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('adds beforeunload listener when isDirty is true', () => {
    renderHook(() => useUnsavedChanges(true));
    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('removes beforeunload listener on unmount', () => {
    const { unmount } = renderHook(() => useUnsavedChanges(true));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('prevents default on beforeunload when isDirty is true', () => {
    renderHook(() => useUnsavedChanges(true));
    const handleBeforeUnload = addEventListenerSpy.mock.calls.find(
      (call: unknown[]) => call[0] === 'beforeunload'
    )[1];

    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;

    handleBeforeUnload(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe('');
  });

  it('does not prevent default on beforeunload when isDirty is false', () => {
    renderHook(() => useUnsavedChanges(false));
    const handleBeforeUnload = addEventListenerSpy.mock.calls.find(
      (call: unknown[]) => call[0] === 'beforeunload'
    )[1];

    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;

    handleBeforeUnload(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.returnValue).toBeUndefined();
  });

  it('calls useBlocker with a function that checks isDirty and path changes', () => {
    renderHook(() => useUnsavedChanges(true));
    
    expect(useBlocker).toHaveBeenCalledTimes(1);
    
    const blockerFn = vi.mocked(useBlocker).mock.calls[0][0] as (args: unknown) => boolean;
    
    // Different path and isDirty = true -> should block
    expect(blockerFn({
      currentLocation: { pathname: '/a' },
      nextLocation: { pathname: '/b' }
    })).toBe(true);

    // Same path -> should not block
    expect(blockerFn({
      currentLocation: { pathname: '/a' },
      nextLocation: { pathname: '/a' }
    })).toBe(false);
  });
});
