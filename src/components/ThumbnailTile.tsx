import React, { useRef, useState } from 'react';
import { Eye, Replace, Trash2, GripVertical } from 'lucide-react';
import { FileIcon } from './FileIcon';
import { PREVIEWABLE_CATEGORIES } from '../types/file';
import type { UploadedFile } from '../types/file';

interface ThumbnailTileProps {
  file: UploadedFile;
  index: number;
  totalFiles: number;
  onView: (fileId: string) => void;
  onReplace: (fileId: string) => void;
  onRemove: (fileId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const ThumbnailTile: React.FC<ThumbnailTileProps> = ({
  file,
  index,
  totalFiles,
  onView,
  onReplace,
  onRemove,
  onReorder,
}) => {
  const tileRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const canPreview = PREVIEWABLE_CATEGORIES.has(file.category);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) onReorder(index, index - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (index < totalFiles - 1) onReorder(index, index + 1);
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        onRemove(file.id);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onView(file.id);
        break;
      case 'r':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onReplace(file.id);
        }
        break;
    }
  };

  return (
    <div
      ref={tileRef}
      className={`thumbnail-tile glass-card ${isFocused ? 'thumbnail-tile--focused' : ''}`}
      tabIndex={0}
      role="listitem"
      aria-label={`${file.name}, ${formatFileSize(file.size)}, ${file.category} file. ${index + 1} of ${totalFiles}. Use arrow keys to reorder, Enter to view, Delete to remove.`}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      data-index={index}
    >
      <div className="thumbnail-tile__preview">
        {canPreview && file.previewUrl ? (
          <img
            src={file.previewUrl}
            alt={`Preview of ${file.name}`}
            className="thumbnail-tile__image"
            loading="lazy"
          />
        ) : (
          <div className="thumbnail-tile__icon-placeholder">
            <FileIcon category={file.category} size={40} />
          </div>
        )}

        <div className="thumbnail-tile__overlay">
          <button
            className="thumbnail-tile__action"
            onClick={() => onView(file.id)}
            aria-label={`View ${file.name}`}
            title="View"
            type="button"
          >
            <Eye size={16} />
          </button>
          <button
            className="thumbnail-tile__action"
            onClick={() => onReplace(file.id)}
            aria-label={`Replace ${file.name}`}
            title="Replace"
            type="button"
          >
            <Replace size={16} />
          </button>
          <button
            className="thumbnail-tile__action thumbnail-tile__action--danger"
            onClick={() => onRemove(file.id)}
            aria-label={`Remove ${file.name}`}
            title="Remove"
            type="button"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="thumbnail-tile__drag-handle" aria-hidden="true">
          <GripVertical size={14} />
        </div>

        {file.status === 'uploading' && (
          <div className="thumbnail-tile__progress">
            <div
              className="thumbnail-tile__progress-bar"
              style={{ width: `${file.progress ?? 0}%` }}
              role="progressbar"
              aria-valuenow={file.progress ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Uploading ${file.name}`}
            />
          </div>
        )}

        {file.status === 'error' && (
          <div className="thumbnail-tile__error-badge" role="alert">
            Error
          </div>
        )}
      </div>

      <div className="thumbnail-tile__info">
        <span className="thumbnail-tile__name" title={file.name}>
          {file.name}
        </span>
        <span className="thumbnail-tile__size">{formatFileSize(file.size)}</span>
      </div>
    </div>
  );
};
