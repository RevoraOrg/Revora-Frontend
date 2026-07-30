export type FileCategory = 'image' | 'document' | 'spreadsheet' | 'presentation' | 'pdf' | 'archive' | 'video' | 'audio' | 'code' | 'other';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: FileCategory;
  previewUrl?: string;
  uploadedAt: Date;
  status: 'uploading' | 'complete' | 'error';
  progress?: number;
}

export interface ThumbnailAction {
  id: string;
  label: string;
  icon: string;
  onClick: (fileId: string) => void;
  variant?: 'default' | 'danger';
}

export const FILE_CATEGORY_MAP: Record<string, FileCategory> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'application/pdf': 'pdf',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/vnd.ms-powerpoint': 'presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive',
  'video/mp4': 'video',
  'video/webm': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'text/plain': 'code',
  'text/html': 'code',
  'text/css': 'code',
  'application/javascript': 'code',
  'application/typescript': 'code',
};

export const PREVIEWABLE_CATEGORIES: Set<FileCategory> = new Set(['image']);
