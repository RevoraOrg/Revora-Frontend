import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReducedMotion } from "./useReducedMotion";

const QUERY = "(prefers-reduced-motion: reduce)";

function mockMatchMedia(matches: boolean, listenerApi: "modern" | "legacy") {
  let changeListener: ((event: MediaQueryListEvent) => void) | null = null;
  const addEventListener = vi.fn(
    (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      changeListener = listener;
    },
  );
  const removeEventListener = vi.fn();
  const addListener = vi.fn(
    (listener: (event: MediaQueryListEvent) => void) => {
      changeListener = listener;
    },
  );
  const removeListener = vi.fn();

  const mediaQueryList = {
    matches,
    media: QUERY,
    onchange: null,
    addListener,
    removeListener,
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  if (listenerApi === "modern") {
    Object.assign(mediaQueryList, { addEventListener, removeEventListener });
  }

  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      query === QUERY ? mediaQueryList : ({ ...mediaQueryList, matches: false } as MediaQueryList),
  );

  return {
    mediaQueryList,
    changeListener: () => changeListener,
    addEventListener,
    removeEventListener,
    addListener,
    removeListener,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useReducedMotion", () => {
  it("returns true when reduced motion is initially enabled", () => {
    mockMatchMedia(true, "modern");

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it("returns false when reduced motion is initially disabled", () => {
    mockMatchMedia(false, "modern");

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it("updates when the media query change event fires", () => {
    const mock = mockMatchMedia(false, "modern");
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      mock.changeListener()?.({
        matches: true,
      } as MediaQueryListEvent);
    });

    expect(result.current).toBe(true);
  });

  it("removes the modern change listener on unmount", () => {
    const mock = mockMatchMedia(true, "modern");
    const { unmount } = renderHook(() => useReducedMotion());

    unmount();

    expect(mock.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("uses the Safari listener fallback and removes it on unmount", () => {
    const mock = mockMatchMedia(false, "legacy");
    const { result, unmount } = renderHook(() => useReducedMotion());

    expect(mock.addListener).toHaveBeenCalledWith(expect.any(Function));

    act(() => {
      mock.changeListener()?.({
        matches: true,
      } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);

    unmount();

    expect(mock.removeListener).toHaveBeenCalledWith(expect.any(Function));
  });
});
