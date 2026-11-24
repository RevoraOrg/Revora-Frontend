import { useCallback, useEffect, useReducer, useRef } from 'react';

export type UploadStatus = 'pending' | 'uploading' | 'retrying' | 'success' | 'error';

export interface UploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number; // 0–100
  errorMessage?: string;
}

type Action =
  | { type: 'ADD'; files: File[] }
  | { type: 'SET_STATUS'; id: string; status: UploadStatus; errorMessage?: string }
  | { type: 'SET_PROGRESS'; id: string; progress: number }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR_COMPLETE' };

function reducer(state: UploadFile[], action: Action): UploadFile[] {
  switch (action.type) {
    case 'ADD':
      return [
        ...state,
        ...action.files.map((file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
          file,
          status: 'pending' as UploadStatus,
          progress: 0,
        })),
      ];
    case 'SET_STATUS':
      return state.map((f) =>
        f.id === action.id
          ? { ...f, status: action.status, errorMessage: action.errorMessage }
          : f,
      );
    case 'SET_PROGRESS':
      return state.map((f) =>
        f.id === action.id ? { ...f, progress: Math.max(0, Math.min(100, action.progress)) } : f,
      );
    case 'REMOVE':
      return state.filter((f) => f.id !== action.id);
    case 'CLEAR_COMPLETE':
      return state.filter((f) => f.status !== 'success');
    default:
      return state;
  }
}

export interface UseUploadQueueReturn {
  queue: UploadFile[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  retryFile: (id: string, uploader: Uploader) => void;
  uploadFiles: (uploader: Uploader) => void;
  clearComplete: () => void;
  totalCount: number;
  successCount: number;
  errorCount: number;
  uploadingCount: number;
  overallProgress: number;
}

export interface UseUploadQueueOptions {
  /** Maximum number of concurrent uploads. Defaults to Infinity (unbounded). */
  maxConcurrent?: number;
  /** Maximum number of automatic retry attempts after initial failure. Defaults to 0. */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (`baseDelayMs * 2 ** attempt`). Defaults to 1000. */
  baseDelayMs?: number;
}

/** Minimal uploader contract — returns a promise that resolves on success. */
export type Uploader = (
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
) => Promise<void>;

function waitWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function useUploadQueue(options: UseUploadQueueOptions = {}): UseUploadQueueReturn {
  const {
    maxConcurrent = Infinity,
    maxRetries = 0,
    baseDelayMs = 1000,
  } = options;

  const [queue, dispatch] = useReducer(reducer, []);
  const inFlightRef = useRef<Set<string>>(new Set());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const queueRef = useRef<UploadFile[]>([]);
  const uploaderRef = useRef<Uploader | null>(null);
  const unmountedRef = useRef(false);
  const pumpRef = useRef<() => void>(() => {});
  const optionsRef = useRef({
    maxConcurrent: Math.max(1, maxConcurrent),
    maxRetries: Math.max(0, maxRetries),
    baseDelayMs: Math.max(0, baseDelayMs),
  });
  optionsRef.current = {
    maxConcurrent: Math.max(1, maxConcurrent),
    maxRetries: Math.max(0, maxRetries),
    baseDelayMs: Math.max(0, baseDelayMs),
  };

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    unmountedRef.current = false;
    const controllers = controllersRef.current;
    const inFlight = inFlightRef.current;
    return () => {
      unmountedRef.current = true;
      // Abort every in-flight upload (and any active backoff timer) so nothing dispatches after unmount.
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
      inFlight.clear();
    };
  }, []);

  const dispatchAction = useCallback((action: Action) => {
    queueRef.current = reducer(queueRef.current, action);
    dispatch(action);
  }, []);

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    dispatchAction({ type: 'ADD', files });
  }, [dispatchAction]);

  const removeFile = useCallback((id: string) => {
    // Abort an in-flight upload or backoff timer for this item before dropping it.
    controllersRef.current.get(id)?.abort();
    controllersRef.current.delete(id);
    inFlightRef.current.delete(id);
    dispatchAction({ type: 'REMOVE', id });
  }, [dispatchAction]);

  const runUpload = useCallback(
    // Callers (pumpQueue / retryFile) skip ids already in inFlightRef.
    async (item: UploadFile, uploader: Uploader) => {
      const controller = new AbortController();
      controllersRef.current.set(item.id, controller);
      inFlightRef.current.add(item.id);
      // An upload is stale once aborted (removed/unmounted) or no longer queued;
      // stale uploads must not write status back into the queue.
      const isStale = () =>
        controller.signal.aborted ||
        unmountedRef.current ||
        !queueRef.current.some((f) => f.id === item.id);

      try {
        const { maxRetries: retriesAllowed, baseDelayMs: delayBase } = optionsRef.current;
        for (let attempt = 0; ; attempt += 1) {
          dispatchAction({ type: 'SET_STATUS', id: item.id, status: 'uploading' });
          dispatchAction({ type: 'SET_PROGRESS', id: item.id, progress: 0 });
          try {
            await uploader(
              item.file,
              (pct) => {
                if (controller.signal.aborted) {
                  return;
                }
                dispatchAction({ type: 'SET_PROGRESS', id: item.id, progress: pct });
              },
              controller.signal,
            );
            if (isStale()) return;
            dispatchAction({ type: 'SET_PROGRESS', id: item.id, progress: 100 });
            dispatchAction({ type: 'SET_STATUS', id: item.id, status: 'success' });
            return;
          } catch (err) {
            if (isStale()) return;
            if (attempt >= retriesAllowed) {
              const msg = err instanceof Error ? err.message : 'Upload failed';
              dispatchAction({ type: 'SET_STATUS', id: item.id, status: 'error', errorMessage: msg });
              return;
            }
            dispatchAction({ type: 'SET_STATUS', id: item.id, status: 'retrying' });
            const delayMs = delayBase * 2 ** attempt;
            await waitWithAbort(delayMs, controller.signal);
          }
        }
      } catch {
        // waitWithAbort rejects when aborted during backoff; exit without dispatching.
      } finally {
        inFlightRef.current.delete(item.id);
        controllersRef.current.delete(item.id);
        if (!unmountedRef.current) {
          pumpRef.current();
        }
      }
    },
    [dispatchAction],
  );

  const pumpQueue = useCallback(() => {
    const uploader = uploaderRef.current;
    if (!uploader) return;
    const limit = optionsRef.current.maxConcurrent;
    while (inFlightRef.current.size < limit) {
      const next = queueRef.current.find(
        (f) => f.status === 'pending' && !inFlightRef.current.has(f.id),
      );
      if (!next) break;
      runUpload(next, uploader);
    }
  }, [runUpload]);

  pumpRef.current = pumpQueue;

  const uploadFiles = useCallback(
    (uploader: Uploader) => {
      uploaderRef.current = uploader;
      pumpQueue();
    },
    [pumpQueue],
  );

  const retryFile = useCallback(
    (id: string, uploader: Uploader) => {
      if (inFlightRef.current.has(id)) {
        return;
      }
      const item = queueRef.current.find((f) => f.id === id);
      if (!item) return;
      uploaderRef.current = uploader;
      if (inFlightRef.current.size < optionsRef.current.maxConcurrent) {
        runUpload({ ...item, status: 'pending', progress: 0 }, uploader);
      } else {
        dispatchAction({ type: 'SET_STATUS', id, status: 'pending' });
        dispatchAction({ type: 'SET_PROGRESS', id, progress: 0 });
      }
    },
    [dispatchAction, runUpload],
  );

  const clearComplete = useCallback(() => {
    dispatchAction({ type: 'CLEAR_COMPLETE' });
  }, [dispatchAction]);

  const totalCount = queue.length;
  const successCount = queue.filter((f) => f.status === 'success').length;
  const errorCount = queue.filter((f) => f.status === 'error').length;
  const uploadingCount = queue.filter((f) => f.status === 'uploading').length;
  const overallProgress =
    totalCount === 0
      ? 0
      : Math.round(queue.reduce((sum, f) => sum + f.progress, 0) / totalCount);

  return {
    queue,
    addFiles,
    removeFile,
    retryFile,
    uploadFiles,
    clearComplete,
    totalCount,
    successCount,
    errorCount,
    uploadingCount,
    overallProgress,
  };
}
