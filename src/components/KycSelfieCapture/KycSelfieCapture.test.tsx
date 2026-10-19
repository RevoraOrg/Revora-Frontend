// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import KycSelfieCapture from "./KycSelfieCapture";

afterEach(cleanup);

describe("KycSelfieCapture", () => {
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
    // Mock getUserMedia to reject with NotAllowedError
    const mockGetUserMedia = vi.fn().mockRejectedValue(
      new DOMException("Permission denied", "NotAllowedError")
    );
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByText("Camera access denied")).toBeTruthy();
    });
  });

  it("shows unavailable state when no camera hardware", async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue(
      new DOMException("Not found", "NotFoundError")
    );
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByText("No camera found")).toBeTruthy();
    });
  });

  it("shows error state on generic camera error", async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue(
      new DOMException("Unknown error", "NotReadableError")
    );
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByText("Camera error")).toBeTruthy();
    });
  });

  it("shows retry and upload buttons in denied state", async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue(
      new DOMException("Permission denied", "NotAllowedError")
    );
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

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

  describe("Camera stream attachment and capture flow", () => {
    it("attaches stream to video.srcObject and calls play() after camera activation", async () => {
      const mockTrack = { stop: vi.fn(), kind: "video" };
      const fakeStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack]),
        getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
      } as unknown as MediaStream;

      const playSpy = vi.fn().mockResolvedValue(undefined);
      window.HTMLMediaElement.prototype.play = playSpy;

      Object.defineProperty(navigator, "mediaDevices", {
        value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
        configurable: true,
      });

      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

      const video = await screen.findByLabelText("Camera feed") as HTMLVideoElement;
      expect(video).toBeTruthy();
      expect(video.srcObject).toBe(fakeStream);
      expect(playSpy).toHaveBeenCalled();
    });

    it("keeps capture button disabled until loadedmetadata fires with non-zero videoWidth", async () => {
      const mockTrack = { stop: vi.fn(), kind: "video" };
      const fakeStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack]),
        getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
      } as unknown as MediaStream;
      window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, "mediaDevices", {
        value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
        configurable: true,
      });

      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

      const captureBtn = await screen.findByRole("button", { name: /capture photo/i });
      const video = screen.getByLabelText("Camera feed") as HTMLVideoElement;

      // Initially disabled before metadata
      expect(captureBtn).toBeDisabled();

      // If loadedmetadata fires with videoWidth === 0, stays disabled
      Object.defineProperty(video, "videoWidth", { value: 0, configurable: true });
      fireEvent(video, new Event("loadedmetadata"));
      expect(captureBtn).toBeDisabled();

      // Once loadedmetadata fires with non-zero videoWidth, becomes enabled
      Object.defineProperty(video, "videoWidth", { value: 720, configurable: true });
      Object.defineProperty(video, "videoHeight", { value: 960, configurable: true });
      fireEvent(video, new Event("loadedmetadata"));

      expect(captureBtn).toBeEnabled();
    });

    it("handles null blob from toBlob with a visible error and keeps stream running for retry", async () => {
      const mockTrack = { stop: vi.fn(), kind: "video" };
      const fakeStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack]),
        getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
      } as unknown as MediaStream;
      window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, "mediaDevices", {
        value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
        configurable: true,
      });

      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        translate: vi.fn(),
        scale: vi.fn(),
        drawImage: vi.fn(),
      }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

      // First produce null blob
      HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
        callback(null);
      });

      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole("button", { name: /allow camera access/i }));

      const captureBtn = await screen.findByRole("button", { name: /capture photo/i });
      const video = screen.getByLabelText("Camera feed") as HTMLVideoElement;

      Object.defineProperty(video, "videoWidth", { value: 720, configurable: true });
      Object.defineProperty(video, "videoHeight", { value: 960, configurable: true });
      fireEvent(video, new Event("loadedmetadata"));
      expect(captureBtn).toBeEnabled();

      // Click capture with null blob
      fireEvent.click(captureBtn);

      // Visible error shown
      const errorMsg = await screen.findByRole("alert");
      expect(errorMsg).toHaveTextContent(/failed to capture/i);

      // Stream is not stopped (kept running for retry)
      expect(mockTrack.stop).not.toHaveBeenCalled();

      // Now retry when toBlob produces a valid blob
      global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/selfie-ok");
      (HTMLCanvasElement.prototype.toBlob as ReturnType<typeof vi.fn>).mockImplementation((callback) => {
        callback(new Blob(["selfie"], { type: "image/png" }));
      });

      fireEvent.click(captureBtn);

      // Transitions to preview and stops stream on success
      await screen.findByRole("heading", { level: 2, name: /review your selfie/i });
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });
});
