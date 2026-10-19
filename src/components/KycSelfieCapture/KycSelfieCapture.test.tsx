// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import KycSelfieCapture from "./KycSelfieCapture";

afterEach(cleanup);

const createMockStream = (trackStopSpy: ReturnType<typeof vi.fn>) => ({
  getTracks: () => [{ stop: trackStopSpy }],
});

const setupCanvasMock = () => {
  const mockContext = {
    translate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
  };
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);
  HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
    callback(new Blob(['mock'], { type: 'image/png' }));
  });
};

describe("KycSelfieCapture", () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let trackStopSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    trackStopSpy = vi.fn();
    mockGetUserMedia = vi.fn().mockResolvedValue(createMockStream(trackStopSpy));
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });
    Object.defineProperty(global, "URL", {
      value: {
        createObjectURL: vi.fn(() => "blob:mock-url"),
        revokeObjectURL: vi.fn(),
      },
      configurable: true,
    });
    setupCanvasMock();
  });

  it("renders the permission primer by default", () => {
    render(<KycSelfieCapture />);
    expect(screen.getByText("Verify Your Identity")).toBeTruthy();
    expect(screen.getByText("Camera access needed")).toBeTruthy();
    expect(screen.getByRole("button", { name: /allow camera access/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /upload a photo instead/i })).toBeTruthy();
  });

  it("lists three privacy reasons in the primer", () => {
    render(<KycSelfieCapture />);
    const listItems = document.querySelectorAll(".ksc-permission-primer__reason");
    expect(listItems.length).toBe(3);
  });

  it("shows a privacy policy link in the primer", () => {
    render(<KycSelfieCapture />);
    const link = screen.getByText(/data-retention policy/i);
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/privacy");
  });

  it("calls onUseFileUpload when upload fallback is clicked", () => {
    const onUpload = vi.fn();
    render(<KycSelfieCapture onUseFileUpload={onUpload} />);
    fireEvent.click(screen.getByRole("button", { name: /upload a photo instead/i }));
    expect(onUpload).toHaveBeenCalledOnce();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<KycSelfieCapture onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close selfie capture/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows requesting state when camera access is clicked", async () => {
    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));
    await waitFor(() => {
      expect(screen.getByText("Waiting for camera permission…")).toBeTruthy();
    });
  });

  it("shows denied state when camera permission is not granted", async () => {
    mockGetUserMedia.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError")
    );

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByText("Camera access denied")).toBeTruthy();
    });
  });

  it("shows unavailable state when no camera hardware", async () => {
    mockGetUserMedia.mockRejectedValueOnce(
      new DOMException("Not found", "NotFoundError")
    );

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByText("No camera found")).toBeTruthy();
    });
  });

  it("shows error state on generic camera error", async () => {
    mockGetUserMedia.mockRejectedValueOnce(
      new DOMException("Unknown error", "NotReadableError")
    );

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByText("Camera error")).toBeTruthy();
    });
  });

  it("shows retry and upload buttons in denied state", async () => {
    mockGetUserMedia.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError")
    );

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /upload a photo/i })).toBeTruthy();
    });
  });

  it("forwards className to the container", () => {
    const { container } = render(<KycSelfieCapture className="custom-class" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("custom-class");
  });

  it("renders with accessible heading hierarchy", () => {
    render(<KycSelfieCapture />);
    const heading = screen.getByRole("heading", { level: 2, name: "Verify Your Identity" });
    expect(heading).toBeTruthy();
  });

  describe("Camera lifecycle and cleanup (regression tests for #934)", () => {
    it("stops camera tracks when component unmounts while getUserMedia is pending", async () => {
      let resolveGetUserMedia: (stream: MediaStream) => void;
      const pendingPromise = new Promise<MediaStream>((resolve) => {
        resolveGetUserMedia = resolve;
      });
      mockGetUserMedia.mockReturnValueOnce(pendingPromise);

      const { unmount } = render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

      // Verify getUserMedia was called
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });

      // Unmount before getUserMedia resolves
      unmount();

      // Now resolve the promise (simulating getUserMedia resolving after unmount)
      // Use the same trackStopSpy from beforeEach
      const stream = createMockStream(trackStopSpy);
      resolveGetUserMedia!(stream);
      await pendingPromise;

      // Track stop should have been called because component was unmounted
      expect(trackStopSpy).toHaveBeenCalled();
    });

    it("revokes object URL on unmount when selfie is captured", async () => {
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

      const { unmount } = render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByText("Take a Selfie")).toBeTruthy();
      });

      // Capture photo
      fireEvent.click(screen.getByRole("button", { name: /capture photo/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Your Selfie")).toBeTruthy();
      });

      // Unmount while preview is shown
      unmount();

      // URL.revokeObjectURL should have been called for the captured image
      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
    });

    it("revokes object URL on retake", async () => {
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByText("Take a Selfie")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", { name: /capture photo/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Your Selfie")).toBeTruthy();
      });

      // Click retake
      fireEvent.click(screen.getByRole("button", { name: /retake photo/i }));

      // URL.revokeObjectURL should have been called for the captured image
      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
    });

    it("revokes object URL on confirm", async () => {
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");
      const onCapture = vi.fn();

      render(<KycSelfieCapture onCapture={onCapture} />);
      fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByText("Take a Selfie")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", { name: /capture photo/i }));

      await waitFor(() => {
        expect(screen.getByText("Review Your Selfie")).toBeTruthy();
      });

      // Click confirm
      fireEvent.click(screen.getByRole("button", { name: /use this photo/i }));

      // URL.revokeObjectURL should have been called for the captured image
      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
      expect(onCapture).toHaveBeenCalled();
    });
  });
});
