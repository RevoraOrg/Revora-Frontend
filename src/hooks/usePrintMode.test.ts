import { renderHook, act } from "@testing-library/react";
import { usePrintMode } from "./usePrintMode";

describe("usePrintMode", () => {
  beforeEach(() => {
    // Reset any print state
    window.dispatchEvent(new Event("afterprint"));
  });

  it("should return false initially when not printing", () => {
    const { result } = renderHook(() => usePrintMode());
    expect(result.current).toBe(false);
  });

  it("should return true when beforeprint event fires", () => {
    const { result } = renderHook(() => usePrintMode());
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    expect(result.current).toBe(true);
  });

  it("should return false when afterprint event fires", () => {
    const { result } = renderHook(() => usePrintMode());

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });

    expect(result.current).toBe(false);
  });

  it("should handle multiple beforeprint/afterprint cycles", () => {
    const { result } = renderHook(() => usePrintMode());

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });
    expect(result.current).toBe(true);
  });

  it("should clean up event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => usePrintMode());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeprint", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("afterprint", expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
