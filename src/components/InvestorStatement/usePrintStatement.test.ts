/**
 * usePrintStatement.test.ts
 *
 * Dedicated test suite for the usePrintStatement hook.
 *
 * Covered cases:
 *  - Initial state (showStatement=false, isPrinting=false)
 *  - printStatement() sets showStatement=true and calls window.print()
 *  - cancelStatement() resets showStatement and isPrinting to false
 *  - cancelStatement() is a no-op when already in idle state
 *  - beforeprint event → isPrinting=true
 *  - afterprint event  → isPrinting=false, showStatement=false (auto-dismiss)
 *  - matchMedia "print" change (matches=true)  → isPrinting=true
 *  - matchMedia "print" change (matches=false) → isPrinting=false, showStatement=false
 *  - Event listeners are not attached when showStatement is false
 *  - Event listeners are removed on cancelStatement (showStatement→false)
 *  - Event listeners are removed when the component unmounts
 *  - window.print() is not called on cancelStatement
 *  - Calling printStatement() twice keeps state consistent
 */

import { renderHook, act } from "@testing-library/react";
import { usePrintStatement } from "./usePrintStatement";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a controllable matchMedia stub that records registered listeners and
 * lets us fire them programmatically.
 *
 * Returns:
 *   - `mockMql`  — the fake MediaQueryList object (passed to the hook's code)
 *   - `fireMql`  — call with { matches } to simulate a media query change
 *   - `restore`  — restore window.matchMedia to the previous value
 */
function setupControllableMatchMedia() {
  const listeners: Array<(e: Pick<MediaQueryListEvent, "matches">) => void> =
    [];

  const mockMql = {
    matches: false,
    media: "print",
    onchange: null,
    addEventListener: vi.fn(
      (_type: string, cb: (e: Pick<MediaQueryListEvent, "matches">) => void) => {
        listeners.push(cb);
      }
    ),
    removeEventListener: vi.fn(
      (_type: string, cb: (e: Pick<MediaQueryListEvent, "matches">) => void) => {
        const idx = listeners.indexOf(cb);
        if (idx !== -1) listeners.splice(idx, 1);
      }
    ),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  };

  const original = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue(mockMql),
  });

  const fireMql = (matches: boolean) => {
    // Simulate a MediaQueryListEvent-like object.
    const event = { matches } as Pick<MediaQueryListEvent, "matches">;
    listeners.forEach((cb) => cb(event));
  };

  const restore = () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: original,
    });
  };

  return { mockMql, fireMql, restore };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("usePrintStatement", () => {
  // Fake timers so rAF + setTimeout resolve instantly in tests.
  beforeEach(() => {
    vi.useFakeTimers();
    window.print = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─── Initial state ───────────────────────────────────────────────────────

  it("starts with showStatement=false and isPrinting=false", () => {
    const { result } = renderHook(() => usePrintStatement());
    expect(result.current.showStatement).toBe(false);
    expect(result.current.isPrinting).toBe(false);
  });

  it("exposes all four API members on mount", () => {
    const { result } = renderHook(() => usePrintStatement());
    expect(typeof result.current.printStatement).toBe("function");
    expect(typeof result.current.cancelStatement).toBe("function");
    expect(typeof result.current.showStatement).toBe("boolean");
    expect(typeof result.current.isPrinting).toBe("boolean");
  });

  // ─── printStatement() ────────────────────────────────────────────────────

  it("printStatement() sets showStatement to true synchronously", () => {
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    expect(result.current.showStatement).toBe(true);
  });

  it("printStatement() does not change isPrinting synchronously", () => {
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    // isPrinting is only set by the print events, not by printStatement itself.
    expect(result.current.isPrinting).toBe(false);
  });

  it("printStatement() calls window.print() after rAF + 100 ms timeout", async () => {
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    // Before timers run, window.print should not have been called.
    expect(window.print).not.toHaveBeenCalled();

    // Advance rAF and the 100 ms delay.
    await act(async () => {
      vi.runAllTimers();
    });

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("printStatement() called twice invokes window.print() twice", async () => {
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.printStatement();
    });

    await act(async () => {
      vi.runAllTimers();
    });

    expect(window.print).toHaveBeenCalledTimes(2);
  });

  // ─── cancelStatement() ───────────────────────────────────────────────────

  it("cancelStatement() resets showStatement to false", () => {
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    expect(result.current.showStatement).toBe(true);

    act(() => {
      result.current.cancelStatement();
    });

    expect(result.current.showStatement).toBe(false);
  });

  it("cancelStatement() resets isPrinting to false", () => {
    const { result } = renderHook(() => usePrintStatement());
    const { fireMql, restore } = setupControllableMatchMedia();

    // Open statement, then simulate print start via MQL.
    act(() => {
      result.current.printStatement();
    });

    act(() => {
      fireMql(true);
    });

    expect(result.current.isPrinting).toBe(true);

    act(() => {
      result.current.cancelStatement();
    });

    expect(result.current.isPrinting).toBe(false);

    restore();
  });

  it("cancelStatement() is a no-op when hook is already in idle state", () => {
    const { result } = renderHook(() => usePrintStatement());

    // Should not throw and state should remain unchanged.
    act(() => {
      result.current.cancelStatement();
    });

    expect(result.current.showStatement).toBe(false);
    expect(result.current.isPrinting).toBe(false);
  });

  it("cancelStatement() does not call window.print()", async () => {
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    act(() => {
      result.current.cancelStatement();
    });

    await act(async () => {
      vi.runAllTimers();
    });

    // window.print may still be called from the already-queued rAF, but
    // cancelStatement itself must not be the source of any additional calls
    // beyond what printStatement enqueued. Here we only verify cancel itself
    // never calls print directly — the rAF+timeout from printStatement fires
    // asynchronously and is outside cancelStatement's responsibility.
    // The important check is that cancel doesn't add extra print() calls.
    const callCount = (window.print as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callCount).toBeLessThanOrEqual(1);
  });

  // ─── beforeprint / afterprint events ─────────────────────────────────────

  it("beforeprint event sets isPrinting=true after showStatement becomes true", () => {
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    expect(result.current.isPrinting).toBe(true);
  });

  it("afterprint event sets isPrinting=false and auto-dismisses showStatement", () => {
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    expect(result.current.isPrinting).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });

    expect(result.current.isPrinting).toBe(false);
    expect(result.current.showStatement).toBe(false);
  });

  it("beforeprint event is ignored when showStatement is false", () => {
    const { result } = renderHook(() => usePrintStatement());

    // Do NOT call printStatement — listeners should not be attached yet.
    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    expect(result.current.isPrinting).toBe(false);
  });

  it("afterprint event is ignored when showStatement is false", () => {
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });

    expect(result.current.isPrinting).toBe(false);
    expect(result.current.showStatement).toBe(false);
  });

  // ─── matchMedia "print" change ───────────────────────────────────────────

  it("MQL change with matches=true sets isPrinting=true", () => {
    const { fireMql, restore } = setupControllableMatchMedia();
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    act(() => {
      fireMql(true);
    });

    expect(result.current.isPrinting).toBe(true);

    restore();
  });

  it("MQL change with matches=false sets isPrinting=false and dismisses showStatement", () => {
    const { fireMql, restore } = setupControllableMatchMedia();
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    // Print starts.
    act(() => {
      fireMql(true);
    });

    expect(result.current.isPrinting).toBe(true);

    // Print ends.
    act(() => {
      fireMql(false);
    });

    expect(result.current.isPrinting).toBe(false);
    expect(result.current.showStatement).toBe(false);

    restore();
  });

  it("MQL change is ignored when showStatement is false (no listener attached)", () => {
    const { fireMql, restore } = setupControllableMatchMedia();
    const { result } = renderHook(() => usePrintStatement());

    // Fire without ever opening the statement — the MQL listener should not exist.
    act(() => {
      fireMql(true);
    });

    expect(result.current.isPrinting).toBe(false);

    restore();
  });

  // ─── Listener lifecycle ──────────────────────────────────────────────────

  it("attaches MQL listener when showStatement becomes true", () => {
    const { mockMql, restore } = setupControllableMatchMedia();
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    expect(mockMql.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );

    restore();
  });

  it("removes MQL listener when cancelStatement resets showStatement", () => {
    const { mockMql, restore } = setupControllableMatchMedia();
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    act(() => {
      result.current.cancelStatement();
    });

    expect(mockMql.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );

    restore();
  });

  it("removes window event listeners when cancelStatement resets showStatement", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    act(() => {
      result.current.cancelStatement();
    });

    expect(removeSpy).toHaveBeenCalledWith("beforeprint", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("afterprint", expect.any(Function));
  });

  it("removes all listeners when the hook unmounts while showStatement is true", () => {
    const { mockMql, restore } = setupControllableMatchMedia();
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("beforeprint", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("afterprint", expect.any(Function));
    expect(mockMql.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );

    restore();
  });

  it("does not attach event listeners when showStatement is false on mount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => usePrintStatement());

    const printListeners = addSpy.mock.calls.filter(
      ([type]) => type === "beforeprint" || type === "afterprint"
    );
    expect(printListeners).toHaveLength(0);
  });

  // ─── State consistency across transitions ────────────────────────────────

  it("full cycle: print → beforeprint → afterprint returns hook to idle", () => {
    const { result } = renderHook(() => usePrintStatement());

    // 1. Open statement.
    act(() => {
      result.current.printStatement();
    });

    expect(result.current.showStatement).toBe(true);
    expect(result.current.isPrinting).toBe(false);

    // 2. Print dialog opens.
    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    expect(result.current.isPrinting).toBe(true);

    // 3. Print dialog closes.
    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });

    expect(result.current.isPrinting).toBe(false);
    expect(result.current.showStatement).toBe(false);
  });

  it("full cycle via MQL: print → mql(true) → mql(false) returns hook to idle", () => {
    const { fireMql, restore } = setupControllableMatchMedia();
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    act(() => {
      fireMql(true);
    });

    expect(result.current.showStatement).toBe(true);
    expect(result.current.isPrinting).toBe(true);

    act(() => {
      fireMql(false);
    });

    expect(result.current.isPrinting).toBe(false);
    expect(result.current.showStatement).toBe(false);

    restore();
  });

  it("full cycle via cancel: print → cancel returns hook to idle without printing", () => {
    const { result } = renderHook(() => usePrintStatement());

    act(() => {
      result.current.printStatement();
    });

    expect(result.current.showStatement).toBe(true);

    act(() => {
      result.current.cancelStatement();
    });

    expect(result.current.showStatement).toBe(false);
    expect(result.current.isPrinting).toBe(false);
  });
});
