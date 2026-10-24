import { useCallback, useEffect, useReducer, useRef } from 'react';

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

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

/** Minimal uploader contract — returns a promise that resolves on success. */
export type Uploader = (
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
) => Promise<void>;

export function useUploadQueue(): UseUploadQueueReturn {
  const [queue, dispatch] = useReducer(reducer, []);
  const inFlightRef = useRef<Set<string>>(new Set());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const queueRef = useRef<UploadFile[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    const controllers = controllersRef.current;
    const inFlight = inFlightRef.current;
    return () => {
      // Abort every in-flight upload so nothing dispatches after unmount.
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
      inFlight.clear();
    };
  }, []);

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    dispatch({ type: 'ADD', files });
  }, []);

  const removeFile = useCallback((id: string) => {
    // Abort an in-flight upload for this item before dropping it.
    controllersRef.current.get(id)?.abort();
    controllersRef.current.delete(id);
    inFlightRef.current.delete(id);
    dispatch({ type: 'REMOVE', id });
  }, []);

  const runUpload = useCallback(
    // Callers (uploadFiles / retryFile) skip ids already in inFlightRef.
    async (item: UploadFile, uploader: Uploader, dispatchFn: React.Dispatch<Action>) => {
      const controller = new AbortController();
      controllersRef.current.set(item.id, controller);
      inFlightRef.current.add(item.id);
      dispatchFn({ type: 'SET_STATUS', id: item.id, status: 'uploading' });
      dispatchFn({ type: 'SET_PROGRESS', id: item.id, progress: 0 });
      // An upload is stale once aborted (removed/unmounted) or no longer queued;
      // stale uploads must not write status back into the queue.
      const isStale = () =>
        controller.signal.aborted || !queueRef.current.some((f) => f.id === item.id);
      try {
        await uploader(
          item.file,
          (pct) => {
            if (controller.signal.aborted) {
              return;
            }
            dispatchFn({ type: 'SET_PROGRESS', id: item.id, progress: pct });
          },
          controller.signal,
        );
        if (isStale()) return;
        dispatchFn({ type: 'SET_PROGRESS', id: item.id, progress: 100 });
        dispatchFn({ type: 'SET_STATUS', id: item.id, status: 'success' });
      } catch (err) {
        if (isStale()) return;
        const msg = err instanceof Error ? err.message : 'Upload failed';
        dispatchFn({ type: 'SET_STATUS', id: item.id, status: 'error', errorMessage: msg });
      } finally {
        inFlightRef.current.delete(item.id);
        controllersRef.current.delete(item.id);
      }
    },
    [],
  );

  const uploadFiles = useCallback(
    (uploader: Uploader) => {
      const pending = queueRef.current.filter(
        (f) => f.status === 'pending' && !inFlightRef.current.has(f.id),
      );
      pending.forEach((item) => {
        runUpload(item, uploader, dispatch);
      });
    },
    [runUpload],
  );

  const retryFile = useCallback(
    (id: string, uploader: Uploader) => {
      if (inFlightRef.current.has(id)) {
        return;
      }
      const item = queueRef.current.find((f) => f.id === id);
      if (!item) return;
      runUpload({ ...item, status: 'pending', progress: 0 }, uploader, dispatch);
    },
    [runUpload],
  );

  const clearComplete = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETE' });
  }, []);

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
