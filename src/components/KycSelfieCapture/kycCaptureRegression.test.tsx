// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import KycSelfieCapture from './KycSelfieCapture';
import { KycDocumentCapture } from '../KycDocumentCapture/KycDocumentCapture';

describe('KYC Capture Stream Attachment Regression', () => {
  let mockTrack: { stop: ReturnType<typeof vi.fn>; kind: string };
  let fakeStream: MediaStream;

  beforeEach(() => {
    mockTrack = { stop: vi.fn(), kind: 'video' };
    fakeStream = {
      getTracks: vi.fn().mockReturnValue([mockTrack]),
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(fakeStream),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('regression: KycSelfieCapture attaches MediaStream to video.srcObject after activation instead of leaving it null', async () => {
    render(<KycSelfieCapture />);

    // Click permission primer button to activate camera
    fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

    // On master, videoRef.current.srcObject was assigned while state was 'requesting',
    // so videoRef.current was null and video.srcObject was never attached.
    const video = (await screen.findByLabelText('Camera feed')) as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.srcObject).toBe(fakeStream);
  });

  it('regression: KycDocumentCapture attaches MediaStream to video.srcObject after activation instead of leaving it null', async () => {
    render(<KycDocumentCapture />);

    // Click permission prompt to activate camera
    fireEvent.click(screen.getByRole('button', { name: /enable camera/i }));

    // On master, CameraActiveView only mounted after active state, leaving videoRef.current null during requestCamera
    const video = (await screen.findByTestId('camera-video')) as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.srcObject).toBe(fakeStream);
  });

  it('regression: KycSelfieCapture disables capture until loadedmetadata with non-zero videoWidth', async () => {
    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

    const captureBtn = await screen.findByRole('button', { name: /capture photo/i });
    const video = screen.getByLabelText('Camera feed') as HTMLVideoElement;

    // Disabled before metadata loads
    expect(captureBtn).toBeDisabled();

    // Still disabled if loadedmetadata fires with 0 width
    Object.defineProperty(video, 'videoWidth', { value: 0, configurable: true });
    fireEvent(video, new Event('loadedmetadata'));
    expect(captureBtn).toBeDisabled();

    // Enabled only when videoWidth > 0
    Object.defineProperty(video, 'videoWidth', { value: 720, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 960, configurable: true });
    fireEvent(video, new Event('loadedmetadata'));
    expect(captureBtn).toBeEnabled();
  });

  it('regression: KycDocumentCapture disables capture until loadedmetadata with non-zero videoWidth', async () => {
    render(<KycDocumentCapture />);
    fireEvent.click(screen.getByRole('button', { name: /enable camera/i }));

    const captureBtn = await screen.findByRole('button', { name: /take photo/i });
    const video = screen.getByTestId('camera-video') as HTMLVideoElement;

    // Disabled before metadata loads
    expect(captureBtn).toBeDisabled();

    // Still disabled if loadedmetadata fires with 0 width
    Object.defineProperty(video, 'videoWidth', { value: 0, configurable: true });
    fireEvent(video, new Event('loadedmetadata'));
    expect(captureBtn).toBeDisabled();

    // Enabled only when videoWidth > 0
    Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
    fireEvent(video, new Event('loadedmetadata'));
    expect(captureBtn).toBeEnabled();
  });

  it('regression: null blob in KycSelfieCapture displays visible error and keeps stream alive for retry', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(null));

    render(<KycSelfieCapture />);
    fireEvent.click(screen.getByRole('button', { name: /allow camera access/i }));

    const captureBtn = await screen.findByRole('button', { name: /capture photo/i });
    const video = screen.getByLabelText('Camera feed') as HTMLVideoElement;
    Object.defineProperty(video, 'videoWidth', { value: 720, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 960, configurable: true });
    fireEvent(video, new Event('loadedmetadata'));

    fireEvent.click(captureBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/failed to capture/i);
    expect(mockTrack.stop).not.toHaveBeenCalled();
  });

  it('regression: null blob in KycDocumentCapture displays visible error and keeps stream alive for retry', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(null));

    render(<KycDocumentCapture />);
    fireEvent.click(screen.getByRole('button', { name: /enable camera/i }));

    const captureBtn = await screen.findByRole('button', { name: /take photo/i });
    const video = screen.getByTestId('camera-video') as HTMLVideoElement;
    Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
    fireEvent(video, new Event('loadedmetadata'));

    fireEvent.click(captureBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/failed to capture document/i);
    expect(mockTrack.stop).not.toHaveBeenCalled();
  });
});
