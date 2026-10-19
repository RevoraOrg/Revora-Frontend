/**
 * Tests for KycDocumentCapture (Issue #227).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KycDocumentCapture, DocumentType } from './KycDocumentCapture';

expect.extend(toHaveNoViolations);

// Mock getUserMedia
const mockGetUserMedia = vi.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  configurable: true,
});

const createMockStream = (trackStopSpy: ReturnType<typeof vi.fn>) => ({
  getTracks: () => [{ stop: trackStopSpy }],
});

const setupCanvasMock = () => {
  const mockContext = {
    drawImage: vi.fn(),
  };
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);
  HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
    callback(new Blob(['mock'], { type: 'image/jpeg' }));
  });
};

describe('KycDocumentCapture', () => {
  let trackStopSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetUserMedia.mockReset();
    trackStopSpy = vi.fn();
    Object.defineProperty(global, 'URL', {
      value: {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn(),
      },
      configurable: true,
    });
    setupCanvasMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('renders with camera permission prompt by default', () => {
      render(<KycDocumentCapture />);

      expect(screen.getByTestId('kyc-document-capture')).toBeInTheDocument();
      expect(screen.getByTestId('camera-prompt')).toBeInTheDocument();
      expect(
        screen.getByText('Camera Access Required'),
      ).toBeInTheDocument();
    });

    it('renders the appropriate document type label', () => {
      render(<KycDocumentCapture documentType="passport" />);

      expect(
        screen.getByText(/photo of your passport photo page/i),
      ).toBeInTheDocument();
    });

    it('renders with document type "id_card" by default', () => {
      render(<KycDocumentCapture />);

      expect(
        screen.getByText(/photo of your government-issued ID card/i),
      ).toBeInTheDocument();
    });

    it('renders driver\'s license label', () => {
      render(<KycDocumentCapture documentType="drivers_license" />);

      expect(
        screen.getByText(/photo of your driver's license/i),
      ).toBeInTheDocument();
    });
  });

  describe('Tip Carousel', () => {
    it('renders tip carousel on the permission prompt', () => {
      render(<KycDocumentCapture />);

      expect(screen.getByTestId('tip-carousel')).toBeInTheDocument();
      expect(screen.getByText('Capture Tips')).toBeInTheDocument();
    });

    it('shows the first tip by default', () => {
      render(<KycDocumentCapture />);

      expect(screen.getByTestId('tip-card-0')).toBeInTheDocument();
      expect(screen.getByText('Good Lighting')).toBeInTheDocument();
    });

    it('navigates tips with next button', () => {
      render(<KycDocumentCapture />);

      const nextBtn = screen.getByLabelText('Next tip');
      fireEvent.click(nextBtn);

      expect(screen.getByTestId('tip-card-1')).toBeInTheDocument();
      expect(screen.getByText('Avoid Glare')).toBeInTheDocument();
    });

    it('navigates tips with previous button', () => {
      render(<KycDocumentCapture />);

      const nextBtn = screen.getByLabelText('Next tip');
      fireEvent.click(nextBtn);
      fireEvent.click(nextBtn);

      const prevBtn = screen.getByLabelText('Previous tip');
      fireEvent.click(prevBtn);

      expect(screen.getByTestId('tip-card-1')).toBeInTheDocument();
    });

    it('wraps around from last tip to first', () => {
      render(<KycDocumentCapture />);

      const nextBtn = screen.getByLabelText('Next tip');
      // Click 5 times to go through all 5 tips and wrap
      for (let i = 0; i < 5; i++) {
        fireEvent.click(nextBtn);
      }

      expect(screen.getByTestId('tip-card-0')).toBeInTheDocument();
    });

    it('allows jumping to a specific tip via dot buttons', () => {
      render(<KycDocumentCapture />);

      const dot3 = screen.getByLabelText('Tip 3 of 5');
      fireEvent.click(dot3);

      expect(screen.getByTestId('tip-card-2')).toBeInTheDocument();
      expect(screen.getByText('Show All Edges')).toBeInTheDocument();
    });

    it('marks the active dot with aria-current', () => {
      render(<KycDocumentCapture />);

      const firstDot = screen.getByLabelText('Tip 1 of 5');
      expect(firstDot).toHaveAttribute('aria-current', 'true');
    });
  });

  describe('Camera Request Flow', () => {
    it('shows requesting state when Enable Camera is clicked', () => {
      mockGetUserMedia.mockImplementation(
        () => new Promise(() => {}), // never resolves
      );

      render(<KycDocumentCapture />);
      fireEvent.click(screen.getByText('Enable Camera'));

      expect(screen.getByText('Requesting access…')).toBeInTheDocument();
    });

    it('shows denied state when camera permission is denied', async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        new DOMException('Permission denied', 'NotAllowedError')
      );

      render(<KycDocumentCapture />);
      fireEvent.click(screen.getByText('Enable Camera'));

      // Wait for async rejection
      expect(await screen.findByTestId('camera-denied')).toBeInTheDocument();
      expect(screen.getByText('Camera Access Denied')).toBeInTheDocument();
    });

    it('shows denied state for unavailable cameras', async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        new DOMException('No camera found', 'NotFoundError')
      );

      render(<KycDocumentCapture />);
      fireEvent.click(screen.getByText('Enable Camera'));

      expect(await screen.findByTestId('camera-denied')).toBeInTheDocument();
    });
  });

  describe('File Upload Fallback', () => {
    it('shows file upload button on permission prompt', () => {
      render(<KycDocumentCapture />);

      expect(
        screen.getByText('Upload a photo instead'),
      ).toBeInTheDocument();
    });

    it('shows file upload option in denied state', async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        new DOMException('Permission denied', 'NotAllowedError')
      );

      render(<KycDocumentCapture />);
      fireEvent.click(screen.getByText('Enable Camera'));

      expect(await screen.findByText(/Select a photo from your device/i)).toBeInTheDocument();
    });

    it('shows retry camera button in denied state', async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        new DOMException('Permission denied', 'NotAllowedError')
      );
      mockGetUserMedia.mockResolvedValueOnce(createMockStream(trackStopSpy));

      render(<KycDocumentCapture />);
      fireEvent.click(screen.getByText('Enable Camera'));

      expect(await screen.findByText(/Try camera again/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has no axe violations on permission prompt', async () => {
      const { container } = render(<KycDocumentCapture />);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations on denied fallback', async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        new DOMException('Permission denied', 'NotAllowedError')
      );

      const { container } = render(<KycDocumentCapture />);
      fireEvent.click(screen.getByText('Enable Camera'));

      await screen.findByTestId('camera-denied');
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('Camera lifecycle and cleanup (regression tests for #934)', () => {
    it('stops camera tracks when component unmounts while getUserMedia is pending', async () => {
      let resolveGetUserMedia: (stream: MediaStream) => void;
      const pendingPromise = new Promise<MediaStream>((resolve) => {
        resolveGetUserMedia = resolve;
      });
      mockGetUserMedia.mockReturnValueOnce(pendingPromise);

      const { unmount } = render(<KycDocumentCapture />);
      fireEvent.click(screen.getByText('Enable Camera'));

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

    it('stops camera when switching to file upload', async () => {
      mockGetUserMedia.mockResolvedValue(createMockStream(trackStopSpy));

      render(<KycDocumentCapture />);
      fireEvent.click(screen.getByText('Enable Camera'));

      await waitFor(() => {
        expect(screen.findByTestId('camera-active'));
      });

      expect(await screen.findByTestId('camera-active')).toBeInTheDocument();

      // Click "Upload file instead"
      fireEvent.click(screen.getByText('Upload file instead'));

      // Track stop should have been called
      expect(trackStopSpy).toHaveBeenCalled();
    });

    it('revokes object URL on unmount when document is captured', async () => {
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
      mockGetUserMedia.mockResolvedValue(createMockStream(trackStopSpy));

      const { unmount } = render(<KycDocumentCapture />);
      fireEvent.click(screen.getByText('Enable Camera'));

      await waitFor(() => {
        expect(screen.findByTestId('camera-active'));
      });

      expect(await screen.findByTestId('camera-active')).toBeInTheDocument();

      // Capture document by clicking the "Take photo" button
      fireEvent.click(screen.getByRole('button', { name: /take photo/i }));

      await waitFor(() => {
        expect(screen.getByTestId('captured-preview')).toBeInTheDocument();
      });

      // Unmount while preview is shown
      unmount();

      // URL.revokeObjectURL should have been called for the captured image
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('revokes object URL on retake', async () => {
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
      mockGetUserMedia.mockResolvedValue(createMockStream(trackStopSpy));

      render(<KycDocumentCapture />);
      fireEvent.click(screen.getByText('Enable Camera'));

      await waitFor(() => {
        expect(screen.findByTestId('camera-active'));
      });

      expect(await screen.findByTestId('camera-active')).toBeInTheDocument();

      // Capture document by clicking the "Take photo" button
      fireEvent.click(screen.getByRole('button', { name: /take photo/i }));

      await waitFor(() => {
        expect(screen.getByTestId('captured-preview')).toBeInTheDocument();
      });

      // Click retake
      fireEvent.click(screen.getByText('Retake'));

      // URL.revokeObjectURL should have been called for the captured image
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('revokes object URL on confirm', async () => {
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
      mockGetUserMedia.mockResolvedValue(createMockStream(trackStopSpy));

      render(<KycDocumentCapture />);
      fireEvent.click(screen.getByText('Enable Camera'));

      await waitFor(() => {
        expect(screen.findByTestId('camera-active'));
      });

      expect(await screen.findByTestId('camera-active')).toBeInTheDocument();

      // Capture document by clicking the "Take photo" button
      fireEvent.click(screen.getByRole('button', { name: /take photo/i }));

      await waitFor(() => {
        expect(screen.getByTestId('captured-preview')).toBeInTheDocument();
      });

      // Click confirm
      fireEvent.click(screen.getByText('Use this photo'));

      // URL.revokeObjectURL should have been called for the captured image
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});
