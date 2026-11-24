import type { DiffSummary, DocumentVersion } from './types';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1,
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function computeMockDiff(
  oldVersion: DocumentVersion,
  newVersion: DocumentVersion,
): DiffSummary {
  const bytesAdded = Math.max(newVersion.fileSizeBytes - oldVersion.fileSizeBytes, 0);
  const bytesRemoved = Math.max(oldVersion.fileSizeBytes - newVersion.fileSizeBytes, 0);

  const linesAdded =
    newVersion.lineCount && oldVersion.lineCount
      ? Math.max(newVersion.lineCount - oldVersion.lineCount, 0)
      : undefined;
  const linesRemoved =
    newVersion.lineCount && oldVersion.lineCount
      ? Math.max(oldVersion.lineCount - newVersion.lineCount, 0)
      : undefined;

  const pagesAdded =
    newVersion.pageCount && oldVersion.pageCount
      ? Math.max(newVersion.pageCount - oldVersion.pageCount, 0)
      : undefined;
  const pagesRemoved =
    newVersion.pageCount && oldVersion.pageCount
      ? Math.max(oldVersion.pageCount - newVersion.pageCount, 0)
      : undefined;

  const parts: string[] = [];
  if (bytesAdded > 0 || bytesRemoved > 0) {
    parts.push(
      `${formatBytes(bytesAdded)} added, ${formatBytes(bytesRemoved)} removed`,
    );
  }
  if (linesAdded !== undefined || linesRemoved !== undefined) {
    parts.push(`${linesAdded ?? 0} lines +, ${linesRemoved ?? 0} lines −`);
  }
  if (pagesAdded !== undefined || pagesRemoved !== undefined) {
    if ((pagesAdded ?? 0) > 0 || (pagesRemoved ?? 0) > 0) {
      parts.push(`${pagesAdded ?? 0} pages +, ${pagesRemoved ?? 0} pages −`);
    }
  }

  const summaryText =
    parts.length > 0 ? parts.join(' · ') : 'File size and contents unchanged.';

  return {
    bytesAdded,
    bytesRemoved,
    linesAdded,
    linesRemoved,
    pagesAdded,
    pagesRemoved,
    highConfidenceMatch: true,
    summaryText,
    fieldsChanged: undefined,
  };
}
