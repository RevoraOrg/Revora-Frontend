// @vitest-environment jsdom

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import * as IndexBarrel from './index';
import { KycSelfieCapture } from './index';
import type { KycSelfieCaptureProps, SelfieCameraState } from './index';
import DirectKycSelfieCapture from './KycSelfieCapture';

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('KycSelfieCapture index module - public contract & exported behavior', () => {
  it('exposes KycSelfieCapture as default named export matching the direct implementation', () => {
    expect(IndexBarrel.KycSelfieCapture).toBeDefined();
    expect(typeof IndexBarrel.KycSelfieCapture).toBe('function');
    expect(IndexBarrel.KycSelfieCapture).toBe(DirectKycSelfieCapture);
  });

  it('exposes type contract definitions compatible with expected consumer shapes', () => {
    // Type-level assertion validating KycSelfieCaptureProps and SelfieCameraState
    const validStates: SelfieCameraState[] = [
      'primer',
      'requesting',
      'active',
      'denied',
      'error',
      'unavailable',
    ];
    expect(validStates.length).toBe(6);

    const testProps: KycSelfieCaptureProps = {
      onCapture: (file: File) => file.name,
      onUseFileUpload: () => {},
      onClose: () => {},
      className: 'test-class',
    };
    expect(testProps.className).toBe('test-class');
  });

  it('does not export unintended runtime values on the index barrel', () => {
    const exportedKeys = Object.keys(IndexBarrel);
    expect(exportedKeys).toEqual(['KycSelfieCapture']);
  });
});

describe('KycSelfieCapture index export - primary state transitions', () => {
  // Helper to create mock media stream
  const createMockMediaStream = () => {
    const mockTrack = {
      stop: vi.fn(),
      kind: 'video',
      readyState: 'live',
    };
    return {
      getTracks: vi.fn().mockReturnValue([mockTrack]),
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
      _mockTrack: mockTrack,
    } as unknown as MediaStream & { _mockTrack: typeof mockTrack };
  };

  describe('Permission Primer (Initial State)', () => {
    it('renders the initial permission primer with all informative elements', () => {
      render(<KycSelfieCapture />);

      expect(screen.getByRole('heading', { level: 2, name: /verify your identity/i })).toBeTruthy();
      expect(screen.getByText(/take a selfie to complete verification/i)).toBeTruthy();
      expect(screen.getByRole('heading', { level: 3, name: /camera access needed/i })).toBeTruthy();

      const reasons = document.querySelectorAll('.ksc-permission-primer__reason');
      expect(reasons.length).toBe(3);

      const privacyLink = screen.getByRole('link', { name: /data-retention policy/i });
      expect(privacyLink.getAttribute('href')).toBe('/privacy');
      expect(privacyLink.getAttribute('target')).toBe('_blank');

      expect(screen.getByRole('button', { name: /allow camera access/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /upload a photo instead/i })).toBeTruthy();
    });

    it('triggers onUseFileUpload when fallback button is clicked', () => {
      const handleFallback = vi.fn();
      render(<KycSelfieCapture onUseFileUpload={handleFallback} />);

      fireEvent.click(screen.getByRole('button', { name: /upload a photo instead/i }));
      expect(handleFallback).toHaveBeenCalledTimes(1);
    });

    it('renders and invokes onClose when provided', () => {
      const handleClose = vi.fn();
      render(<KycSelfieCapture onClose={handleClose} />);

      const closeBtn = screen.getByRole('button', { name: /close selfie capture/i });
      expect(closeBtn).toBeTruthy();
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not render close button when onClose is omitted', () => {
      render(<KycSelfieCapture />);
      expect(screen.queryByRole('button', { name: /close selfie capture/i })).toBeNull();
    });
  });

  describe('Transition: Primer -> Requesting -> Active', () => {
    it('transitions to requesting state before camera stream is established', async () => {
      // Mock getUserMedia that stays pending
      let resolveStream!: (stream: MediaStream) => void;
      const streamPromise = new Promise<MediaStream>((resolve) => {
        resolveStream = resolve;
      });
      const mockStream = createMockMediaStream();

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockReturnValue(streamPromise) },
        configurable: true,
      });

      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

      // Immediately upon clicking, requesting state is active
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /starting camera…/i })).toBeTruthy();
        expect(screen.getByText(/waiting for camera permission…/i)).toBeTruthy();
      });

      // Resolve stream to cleanup
      await act(async () => {
        resolveStream(mockStream);
      });
    });

    it('transitions to active state when camera permission is granted', async () => {
      const mockStream = createMockMediaStream();
      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        configurable: true,
      });

      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /take a selfie/i })).toBeTruthy();
        expect(screen.getByText(/align your face inside the oval frame/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /capture photo/i })).toBeTruthy();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      });
    });
  });

  describe('Transition: Active -> Capture -> Preview & Retake / Confirm', () => {
    let mockStream: ReturnType<typeof createMockMediaStream>;

    beforeEach(() => {
      mockStream = createMockMediaStream();
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
        configurable: true,
      });

      // Mock canvas getContext and toBlob
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        translate: vi.fn(),
        scale: vi.fn(),
        drawImage: vi.fn(),
      }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

      HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
        const fakeBlob = new Blob(['test-selfie-data'], { type: 'image/png' });
        callback(fakeBlob);
      });

      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/fake-selfie');
      global.URL.revokeObjectURL = vi.fn();
    });

    it('captures photo, stops video tracks, and transitions to review preview screen', async () => {
      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /capture photo/i })).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: /capture photo/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /review your selfie/i })).toBeTruthy();
        expect(screen.getByAltText(/captured selfie/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /retake photo/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /use this photo/i })).toBeTruthy();
      });

      // Verify camera tracks were stopped upon capture
      expect(mockStream._mockTrack.stop).toHaveBeenCalled();
    });

    it('allows retaking photo by revoking image and restarting camera', async () => {
      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /capture photo/i })).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: /capture photo/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retake photo/i })).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: /retake photo/i }));

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake-selfie');

      // Camera reactivates
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /take a selfie/i })).toBeTruthy();
      });
    });

    it('confirms photo and triggers onCapture callback with file', async () => {
      const handleCapture = vi.fn();
      render(<KycSelfieCapture onCapture={handleCapture} />);

      fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /capture photo/i })).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: /capture photo/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use this photo/i })).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: /use this photo/i }));

      expect(handleCapture).toHaveBeenCalledTimes(1);
      const capturedFile = handleCapture.mock.calls[0][0];
      expect(capturedFile).toBeInstanceOf(File);
      expect(capturedFile.name).toBe('selfie.png');
      expect(capturedFile.type).toBe('image/png');
    });
  });

  describe('Transition: Error & Failure Paths', () => {
    it('transitions to denied state on NotAllowedError with retry and fallback options', async () => {
      const mockGetUserMedia = vi.fn().mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      );
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        configurable: true,
      });

      const handleFallback = vi.fn();
      render(<KycSelfieCapture onUseFileUpload={handleFallback} />);
      fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(screen.getByRole('heading', { level: 3, name: /camera access denied/i })).toBeTruthy();
        expect(screen.getByText(/camera permission was denied/i)).toBeTruthy();
      });

      // Retry re-triggers startCamera
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
      });

      // Fallback triggers onUseFileUpload
      fireEvent.click(screen.getByRole('button', { name: /upload a photo/i }));
      expect(handleFallback).toHaveBeenCalledTimes(1);
    });

    it('transitions to denied state on PermissionDeniedError', async () => {
      const mockGetUserMedia = vi.fn().mockRejectedValue(
        new DOMException('Permission denied', 'PermissionDeniedError')
      );
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        configurable: true,
      });

      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: /camera access denied/i })).toBeTruthy();
      });
    });

    it('transitions to unavailable state on NotFoundError', async () => {
      const mockGetUserMedia = vi.fn().mockRejectedValue(
        new DOMException('Device not found', 'NotFoundError')
      );
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        configurable: true,
      });

      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: /no camera found/i })).toBeTruthy();
        expect(screen.getByText(/no compatible camera device was detected/i)).toBeTruthy();
      });
    });

    it('transitions to generic error state on NotReadableError or hardware failures', async () => {
      const mockGetUserMedia = vi.fn().mockRejectedValue(
        new DOMException('Hardware error', 'NotReadableError')
      );
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        configurable: true,
      });

      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: /camera error/i })).toBeTruthy();
        expect(screen.getByText(/an error occurred while attempting to access your camera/i)).toBeTruthy();
      });
    });

    it('transitions deterministically to error state on unexpected non-DOMException rejections', async () => {
      const mockGetUserMedia = vi.fn().mockRejectedValue('unexpected network failure string');
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        configurable: true,
      });

      render(<KycSelfieCapture />);
      fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: /camera error/i })).toBeTruthy();
      });
    });
  });
});

describe('KycSelfieCapture index export - representative invalid inputs & boundary handling', () => {
  it('handles missing or undefined optional callbacks without crashing', async () => {
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
      getVideoTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
    });

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
      callback(new Blob(['data'], { type: 'image/png' }));
    });
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');

    // Render with zero props (all callbacks undefined)
    const { unmount } = render(<KycSelfieCapture />);

    // Fallback click on primer
    fireEvent.click(screen.getByRole('button', { name: /upload a photo instead/i }));

    // Start camera
    fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /capture photo/i })).toBeTruthy();
    });

    // Capture photo
    fireEvent.click(screen.getByRole('button', { name: /capture photo/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /use this photo/i })).toBeTruthy();
    });

    // Confirm photo without onCapture prop
    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: /use this photo/i }));
    }).not.toThrow();

    // Clean unmount
    expect(() => unmount()).not.toThrow();
  });

  it('handles environment with missing navigator.mediaDevices gracefully', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: /no camera found/i })).toBeTruthy();
    });
  });

  it('handles environment with missing getUserMedia function gracefully', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {},
      configurable: true,
    });

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: /no camera found/i })).toBeTruthy();
    });
  });

  it('handles failure when canvas.getContext("2d") returns null during capture', async () => {
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
      getVideoTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
    });

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /capture photo/i })).toBeTruthy();
    });

    // Clicking capture when 2d context fails returns cleanly without crashing
    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: /capture photo/i }));
    }).not.toThrow();

    // Still remains on active camera screen because capture could not complete
    expect(screen.getByRole('button', { name: /capture photo/i })).toBeTruthy();
  });

  it('handles null blob produced by canvas.toBlob', async () => {
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
      getVideoTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
    });

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    // Simulate toBlob producing null blob
    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
      callback(null);
    });

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /capture photo/i })).toBeTruthy();
    });

    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: /capture photo/i }));
    }).not.toThrow();
  });

  it('stops media tracks on unmount when stream is active', async () => {
    const mockTrack = { stop: vi.fn() };
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([mockTrack]),
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
    });

    const { unmount } = render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /capture photo/i })).toBeTruthy();
    });

    unmount();
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it('safely handles empty string or undefined className', () => {
    const { container: emptyContainer } = render(<KycSelfieCapture className="" />);
    const rootEmpty = emptyContainer.firstChild as HTMLElement;
    expect(rootEmpty.className).toBe('ksc-container');

    const { container: undefContainer } = render(<KycSelfieCapture className={undefined} />);
    const rootUndef = undefContainer.firstChild as HTMLElement;
    expect(rootUndef.className).toBe('ksc-container');
  });

  it('forwards custom className across rendered states', async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue(
      new DOMException('Denied', 'NotAllowedError')
    );
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

    const { container } = render(<KycSelfieCapture className="custom-kyc-modal" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('custom-kyc-modal');

    fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
    expect(root.className).toContain('custom-kyc-modal');
  });
});

describe('KycSelfieCapture index export - accessibility & contract compliance', () => {
  it('satisfies axe accessibility rules on permission primer state', async () => {
    const { container } = render(<KycSelfieCapture onClose={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('satisfies axe accessibility rules on error/denied state', async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue(
      new DOMException('Permission denied', 'NotAllowedError')
    );
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

    const { container } = render(<KycSelfieCapture onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('maintains proper heading hierarchy and aria labels across screens', async () => {
    render(<KycSelfieCapture onClose={() => {}} />);

    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2.textContent).toContain('Verify Your Identity');

    const h3 = screen.getByRole('heading', { level: 3 });
    expect(h3.textContent).toContain('Camera access needed');

    const region = screen.getByRole('region');
    expect(region.getAttribute('aria-labelledby')).toBe(h2.id);
  });
});
