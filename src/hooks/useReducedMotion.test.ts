/**
 * useReducedMotion — unit tests
 *
 * Verifies prefers-reduced-motion detection: synchronous initial read,
 * live "change" events (system-level accessibility toggle), listener
 * teardown on unmount, and the legacy addListener fallback (Safari < 14).
 */

import { renderHook, act } from "@testing-library/react";
import { useReducedMotion } from "./useReducedMotion";

type Listener = (event: { matches: boolean }) => void;

interface MockMql {
  matches: boolean;
  onchange: unknown;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
}

/** Build a MediaQueryList double with the modern event API. */
function createModernMql(initialMatches: boolean) {
  const listeners: Listener[] = [];
  const mql = {
    matches: initialMatches,
    onchange: null,
    addEventListener: vi.fn((_type: string, cb: Listener) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_type: string, cb: Listener) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
  return {
    mql,
    emit(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((cb) => cb({ matches }));
    },
    listenerCount() {
      return listeners.length;
    },
  };
}

describe("useReducedMotion", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  function installMatchMedia(mql: Partial<MockMql> & { matches: boolean }) {
    window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  }

  it("returns true when prefers-reduced-motion matches on mount", () => {
    const { mql } = createModernMql(true);
    installMatchMedia(mql);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it("returns false when the media query does not match", () => {
    const { mql } = createModernMql(false);
    installMatchMedia(mql);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it("updates when the system-level accessibility toggle fires a change event", () => {
    const handle = createModernMql(false);
    installMatchMedia(handle.mql);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // User enables "reduce motion" in OS settings
    act(() => handle.emit(true));
    expect(result.current).toBe(true);

    // User disables it again
    act(() => handle.emit(false));
    expect(result.current).toBe(false);
  });

  it("removes the change listener on unmount", () => {
    const handle = createModernMql(false);
    installMatchMedia(handle.mql);

    const { unmount } = renderHook(() => useReducedMotion());
    expect(handle.listenerCount()).toBe(1);

    unmount();
    expect(handle.listenerCount()).toBe(0);
    expect(handle.mql.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("falls back to addListener/removeListener when addEventListener is unavailable (Safari < 14)", () => {
    const legacy = {
      matches: false,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
    // Modern API absent — forces the legacy branch
    delete (legacy as Record<string, unknown>).addEventListener;
    installMatchMedia(legacy);

    const { result, unmount } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    expect(legacy.addListener).toHaveBeenCalledWith(expect.any(Function));

    unmount();
    expect(legacy.removeListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it("returns false when window.matchMedia is unavailable", () => {
    (window as { matchMedia?: typeof window.matchMedia }).matchMedia = undefined;

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });
});
