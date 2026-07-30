import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileArchive,
  Film,
  Music,
  FileCode,
  File,
  FileType,
  type LucideIcon,
} from 'lucide-react';
import type { FileCategory } from '../types/file';

interface FileIconProps {
  category: FileCategory;
  className?: string;
  size?: number;
}

const CATEGORY_ICON_CONFIG: Record<FileCategory, LucideIcon> = {
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  pdf: FileType,
  archive: FileArchive,
  video: Film,
  audio: Music,
  code: FileCode,
  other: File,
  image: File,
};

const CATEGORY_COLORS: Record<FileCategory, string> = {
  document: '#3b82f6',
  spreadsheet: '#10b981',
  presentation: '#f59e0b',
  pdf: '#ef4444',
  archive: '#8b5cf6',
  video: '#ec4899',
  audio: '#14b8a6',
  code: '#6366f1',
  other: '#9ca3af',
  image: '#3b82f6',
};

export const FileIcon: React.FC<FileIconProps> = ({ category, className = '', size = 40 }) => {
  const Icon = CATEGORY_ICON_CONFIG[category] || File;
  const color = CATEGORY_COLORS[category] || '#9ca3af';

  return (
    <div
      className={`file-icon-wrapper ${className}`}
      style={{ color }}
      aria-hidden="true"
    >
      <Icon size={size} />
    </div>
  );
};
