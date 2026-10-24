import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUploadQueue, type Uploader } from './useUploadQueue';

function makeFile(name = 'test.pdf', size = 1024): File {
  return new File(['x'.repeat(size)], name, { type: 'application/pdf' });
}

const successUploader: Uploader = (_file, onProgress) =>
  new Promise<void>((resolve) => {
    onProgress(50);
    onProgress(100);
    resolve();
  });

const failUploader: Uploader = () => Promise.reject(new Error('Network error'));

describe('useUploadQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('initialises with an empty queue and zero stats', () => {
    const { result } = renderHook(() => useUploadQueue());
    expect(result.current.queue).toHaveLength(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.overallProgress).toBe(0);
  });

  it('addFiles appends files as pending items', () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile('a.pdf'), makeFile('b.pdf')]); });
    expect(result.current.queue).toHaveLength(2);
    expect(result.current.queue[0].status).toBe('pending');
    expect(result.current.queue[1].status).toBe('pending');
    expect(result.current.totalCount).toBe(2);
  });

  it('addFiles with empty array is a no-op', () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([]); });
    expect(result.current.queue).toHaveLength(0);
  });

  it('removeFile removes the correct item', () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile('a.pdf'), makeFile('b.pdf')]); });
    const id = result.current.queue[0].id;
    act(() => { result.current.removeFile(id); });
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].file.name).toBe('b.pdf');
  });

  it('removeFile with unknown id is a no-op', () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile()]); });
    act(() => { result.current.removeFile('nonexistent'); });
    expect(result.current.queue).toHaveLength(1);
  });

  it('uploadFiles transitions pending items to uploading then success', async () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile()]); });

    await act(async () => { result.current.uploadFiles(successUploader); });

    expect(result.current.queue[0].status).toBe('success');
    expect(result.current.queue[0].progress).toBe(100);
    expect(result.current.successCount).toBe(1);
  });

  it('uploadFiles sets status to error on uploader rejection', async () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile()]); });

    await act(async () => { result.current.uploadFiles(failUploader); });

    expect(result.current.queue[0].status).toBe('error');
    expect(result.current.queue[0].errorMessage).toBe('Network error');
    expect(result.current.errorCount).toBe(1);
  });

  it('uploadFiles handles non-Error rejections gracefully', async () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile()]); });
    const stringRejectUploader: Uploader = () => Promise.reject('oops');

    await act(async () => { result.current.uploadFiles(stringRejectUploader); });

    expect(result.current.queue[0].status).toBe('error');
    expect(result.current.queue[0].errorMessage).toBe('Upload failed');
  });

  it('uploadFiles only processes pending items, skips others', async () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile('a.pdf'), makeFile('b.pdf')]); });

    // Upload first file to success
    await act(async () => { result.current.uploadFiles(successUploader); });
    expect(result.current.successCount).toBe(2);

    // Calling uploadFiles again should not re-upload (no pending items)
    const spy = vi.fn(successUploader);
    await act(async () => { result.current.uploadFiles(spy); });
    expect(spy).not.toHaveBeenCalled();
  });

  it('retryFile re-uploads a failed item', async () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile()]); });

    await act(async () => { result.current.uploadFiles(failUploader); });
    expect(result.current.queue[0].status).toBe('error');

    const id = result.current.queue[0].id;
    await act(async () => { result.current.retryFile(id, successUploader); });

    expect(result.current.queue[0].status).toBe('success');
    expect(result.current.successCount).toBe(1);
    expect(result.current.errorCount).toBe(0);
  });

  it('retryFile with unknown id is a no-op', async () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile()]); });
    await act(async () => { result.current.retryFile('ghost', successUploader); });
    expect(result.current.queue[0].status).toBe('pending');
  });

  it('clearComplete removes only successful items', async () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile('ok.pdf'), makeFile('fail.pdf')]); });

    const [okId] = result.current.queue.map((f) => f.id);

    // Upload first to success, second to error
    const mixedUploader: Uploader = (file, onProgress) => {
      if (file.name === 'ok.pdf') {
        onProgress(100);
        return Promise.resolve();
      }
      return Promise.reject(new Error('fail'));
    };

    await act(async () => { result.current.uploadFiles(mixedUploader); });
    expect(result.current.successCount).toBe(1);
    expect(result.current.errorCount).toBe(1);

    act(() => { result.current.clearComplete(); });

    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].file.name).toBe('fail.pdf');
    expect(result.current.queue.find((f) => f.id === okId)).toBeUndefined();
  });

  it('overallProgress is 0 when queue is empty', () => {
    const { result } = renderHook(() => useUploadQueue());
    expect(result.current.overallProgress).toBe(0);
  });

  it('overallProgress averages progress across all files', async () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile('a.pdf'), makeFile('b.pdf')]); });

    // Manually trigger partial progress via uploadFiles with a controlled uploader
    let resolveA!: () => void;
    const controlledUploader: Uploader = (_file, onProgress) =>
      new Promise<void>((resolve) => {
        onProgress(50);
        resolveA = resolve;
      });

    act(() => { result.current.uploadFiles(controlledUploader); });
    // Both files at 50% → overall = 50
    expect(result.current.overallProgress).toBe(50);

    await act(async () => { resolveA(); });
  });

  it('uploadingCount reflects in-flight uploads', () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile('a.pdf'), makeFile('b.pdf')]); });

    let resolveA!: () => void, resolveB!: () => void;
    const slowUploader: Uploader = () =>
      new Promise<void>((resolve) => {
        if (!resolveA) resolveA = resolve;
        else resolveB = resolve;
      });

    act(() => { result.current.uploadFiles(slowUploader); });
    expect(result.current.uploadingCount).toBe(2);

    act(() => { resolveA?.(); resolveB?.(); });
  });

  it('each added file gets a unique id', () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => {
      result.current.addFiles([makeFile('a.pdf'), makeFile('a.pdf'), makeFile('a.pdf')]);
    });
    const ids = result.current.queue.map((f) => f.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('progress is clamped between 0 and 100', async () => {
    const { result } = renderHook(() => useUploadQueue());
    act(() => { result.current.addFiles([makeFile()]); });

    const clampUploader: Uploader = (_file, onProgress) => {
      onProgress(-50);
      onProgress(150);
      return Promise.resolve();
    };

    await act(async () => { result.current.uploadFiles(clampUploader); });
    expect(result.current.queue[0].progress).toBe(100);
  });

  it('handles very large batches (100 files) without error', () => {
    const { result } = renderHook(() => useUploadQueue());
    const files = Array.from({ length: 100 }, (_, i) => makeFile(`file-${i}.pdf`));
    act(() => { result.current.addFiles(files); });
    expect(result.current.totalCount).toBe(100);
  });

  it('handles mixed success/failure in large batch', async () => {
    const { result } = renderHook(() => useUploadQueue());
    const files = Array.from({ length: 10 }, (_, i) => makeFile(`file-${i}.pdf`));
    act(() => { result.current.addFiles(files); });

    const mixedUploader: Uploader = (file) => {
      const idx = parseInt(file.name.replace('file-', '').replace('.pdf', ''));
      return idx % 2 === 0 ? Promise.resolve() : Promise.reject(new Error('fail'));
    };

    await act(async () => { result.current.uploadFiles(mixedUploader); });
    expect(result.current.successCount).toBe(5);
    expect(result.current.errorCount).toBe(5);
  });

  describe('duplicate prevention and cancellation', () => {
    function deferredUploader() {
      const calls: Array<{
        resolve: () => void;
        reject: (e: unknown) => void;
        onProgress: (pct: number) => void;
        signal?: AbortSignal;
      }> = [];
      const uploader = vi.fn<Uploader>(
        (_file, onProgress, signal) =>
          new Promise<void>((resolve, reject) => {
            calls.push({ resolve, reject, onProgress, signal });
          }),
      );
      return { uploader, calls };
    }

    it('passes an AbortSignal to the uploader', () => {
      const { result } = renderHook(() => useUploadQueue());
      act(() => { result.current.addFiles([makeFile()]); });
      const { uploader, calls } = deferredUploader();
      act(() => { result.current.uploadFiles(uploader); });
      expect(calls[0].signal).toBeInstanceOf(AbortSignal);
      expect(calls[0].signal?.aborted).toBe(false);
    });

    it('does not start a second upload for an item already in flight', () => {
      const { result } = renderHook(() => useUploadQueue());
      act(() => { result.current.addFiles([makeFile()]); });
      const { uploader } = deferredUploader();
      act(() => { result.current.uploadFiles(uploader); });
      act(() => { result.current.uploadFiles(uploader); });
      expect(uploader).toHaveBeenCalledTimes(1);
    });

    it('retryFile is a no-op while the item is still uploading', () => {
      const { result } = renderHook(() => useUploadQueue());
      act(() => { result.current.addFiles([makeFile()]); });
      const { uploader } = deferredUploader();
      act(() => { result.current.uploadFiles(uploader); });
      const id = result.current.queue[0].id;
      act(() => { result.current.retryFile(id, uploader); });
      expect(uploader).toHaveBeenCalledTimes(1);
    });

    it('removing an uploading item aborts it and ignores a late success', async () => {
      const { result } = renderHook(() => useUploadQueue());
      act(() => { result.current.addFiles([makeFile('a.pdf'), makeFile('b.pdf')]); });
      const { uploader, calls } = deferredUploader();
      act(() => { result.current.uploadFiles(uploader); });
      const removedId = result.current.queue[0].id;

      act(() => { result.current.removeFile(removedId); });
      expect(calls[0].signal?.aborted).toBe(true);
      expect(calls[1].signal?.aborted).toBe(false);

      await act(async () => {
        calls[0].onProgress(80);
        calls[0].resolve();
      });
      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].file.name).toBe('b.pdf');
      expect(result.current.queue[0].status).toBe('uploading');
      expect(result.current.successCount).toBe(0);
    });

    it('removing an uploading item ignores a late rejection', async () => {
      const { result } = renderHook(() => useUploadQueue());
      act(() => { result.current.addFiles([makeFile()]); });
      const { uploader, calls } = deferredUploader();
      act(() => { result.current.uploadFiles(uploader); });
      act(() => { result.current.removeFile(result.current.queue[0].id); });

      await act(async () => { calls[0].reject(new Error('aborted')); });
      expect(result.current.queue).toHaveLength(0);
      expect(result.current.errorCount).toBe(0);
    });

    it('aborts in-flight uploads on unmount', () => {
      const { result, unmount } = renderHook(() => useUploadQueue());
      act(() => { result.current.addFiles([makeFile('a.pdf'), makeFile('b.pdf')]); });
      const { uploader, calls } = deferredUploader();
      act(() => { result.current.uploadFiles(uploader); });
      unmount();
      expect(calls.map((c) => c.signal?.aborted)).toEqual([true, true]);
    });

    it('allows retrying an item after its upload settles', async () => {
      const { result } = renderHook(() => useUploadQueue());
      act(() => { result.current.addFiles([makeFile()]); });
      const { uploader, calls } = deferredUploader();
      act(() => { result.current.uploadFiles(uploader); });
      await act(async () => { calls[0].reject(new Error('boom')); });
      expect(result.current.queue[0].status).toBe('error');

      const id = result.current.queue[0].id;
      act(() => { result.current.retryFile(id, uploader); });
      expect(uploader).toHaveBeenCalledTimes(2);
      await act(async () => { calls[1].resolve(); });
      expect(result.current.queue[0].status).toBe('success');
      expect(result.current.queue[0].progress).toBe(100);
    });
  });
});
