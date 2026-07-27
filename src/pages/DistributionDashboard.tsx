import React, { useCallback } from 'react';
import { EmptyState } from '../components/designSystem/EmptyState';
import { UploadQueue } from '../components/UploadQueue';
import { useUploadQueue, type Uploader } from '../hooks/useUploadQueue';

/**
 * Simulated uploader — replace with a real API call (e.g. fetch / axios).
 * Resolves after ~2 s with incremental progress ticks.
 */
const mockUploader: Uploader = (file, onProgress) =>
  new Promise<void>((resolve, reject) => {
    // Simulate occasional failures for demo purposes
    if (file.name.startsWith('fail_')) {
      setTimeout(() => reject(new Error('Server rejected the file')), 800);
      return;
    }
    let pct = 0;
    const interval = setInterval(() => {
      pct = Math.min(100, pct + Math.floor(Math.random() * 20) + 10);
      onProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        resolve();
      }
    }, 200);
  });

export const DistributionDashboard: React.FC = () => {
  const {
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
  } = useUploadQueue();

  const handleUploadAll = useCallback(() => {
    uploadFiles(mockUploader);
  }, [uploadFiles]);

  const handleRetry = useCallback(
    (id: string, uploader: Uploader) => {
      retryFile(id, uploader);
    },
    [retryFile],
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Distribution Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          Track RevenueShare distributions across your portfolio.
        </p>
      </div>

      {/* Document upload queue */}
      <section aria-labelledby="upload-section-heading">
        <h2
          id="upload-section-heading"
          className="text-xl font-semibold mb-4"
          style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-md)' }}
        >
          Upload Documents
        </h2>
        <UploadQueue
          queue={queue}
          onAddFiles={addFiles}
          onRemove={removeFile}
          onRetry={handleRetry}
          onUploadAll={handleUploadAll}
          onClearComplete={clearComplete}
          totalCount={totalCount}
          successCount={successCount}
          errorCount={errorCount}
          uploadingCount={uploadingCount}
          overallProgress={overallProgress}
          uploader={mockUploader}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
        />
      </section>

      <EmptyState
        variant="distribution-dashboard"
        title="No distributions yet"
        description="When revenue is reported and payouts are processed, your distribution history will appear here."
        primaryAction={{
          label: 'Report Revenue',
          href: '/startup/report-revenue',
        }}
        secondaryAction={{
          label: 'Back to Discovery',
          href: '/investor/portal',
        }}
      />
    </div>
  );
};
