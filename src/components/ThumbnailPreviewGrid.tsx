import React, { useCallback, useRef } from 'react';
import { ThumbnailTile } from './ThumbnailTile';
import type { UploadedFile } from '../types/file';

interface ThumbnailPreviewGridProps {
  files: UploadedFile[];
  onView: (fileId: string) => void;
  onReplace: (fileId: string) => void;
  onRemove: (fileId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export const ThumbnailPreviewGrid: React.FC<ThumbnailPreviewGridProps> = ({
  files,
  onView,
  onReplace,
  onRemove,
  onReorder,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= files.length) return;
      onReorder(fromIndex, toIndex);

      requestAnimationFrame(() => {
        const tiles = gridRef.current?.querySelectorAll('[role="listitem"]');
        const targetTile = tiles?.[toIndex] as HTMLElement;
        targetTile?.focus();
      });
    },
    [files.length, onReorder],
  );

  if (files.length === 0) {
    return (
      <div className="thumbnail-grid-empty" role="status">
        <p className="text-muted text-sm">No files uploaded yet.</p>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className="thumbnail-grid"
      role="list"
      aria-label={`Uploaded files, ${files.length} item${files.length !== 1 ? 's' : ''}. Use arrow keys to navigate between items.`}
    >
      {files.map((file, index) => (
        <ThumbnailTile
          key={file.id}
          file={file}
          index={index}
          totalFiles={files.length}
          onView={onView}
          onReplace={onReplace}
          onRemove={onRemove}
          onReorder={handleReorder}
        />
      ))}
    </div>
  );
};
