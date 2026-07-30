import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Upload, FileUp } from 'lucide-react';
import { ThumbnailPreviewGrid } from '../components/ThumbnailPreviewGrid';
import type { UploadedFile, FileCategory } from '../types/file';
import { FILE_CATEGORY_MAP } from '../types/file';

const DEMO_FILES: UploadedFile[] = [
  {
    id: '1',
    name: 'revenue-report-q4-2025.pdf',
    size: 2_450_000,
    type: 'application/pdf',
    category: 'pdf',
    uploadedAt: new Date('2025-12-15'),
    status: 'complete',
  },
  {
    id: '2',
    name: 'product-mockup-final.png',
    size: 5_120_000,
    type: 'image/png',
    category: 'image',
    previewUrl: 'https://picsum.photos/seed/mockup/400/300',
    uploadedAt: new Date('2025-12-14'),
    status: 'complete',
  },
  {
    id: '3',
    name: 'financial-projections-2026.xlsx',
    size: 890_000,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    category: 'spreadsheet',
    uploadedAt: new Date('2025-12-13'),
    status: 'complete',
  },
  {
    id: '4',
    name: 'pitch-deck-investors.pptx',
    size: 12_300_000,
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    category: 'presentation',
    uploadedAt: new Date('2025-12-12'),
    status: 'complete',
  },
  {
    id: '5',
    name: 'team-photo-offsite.jpg',
    size: 3_780_000,
    type: 'image/jpeg',
    category: 'image',
    previewUrl: 'https://picsum.photos/seed/team/400/300',
    uploadedAt: new Date('2025-12-11'),
    status: 'complete',
  },
  {
    id: '6',
    name: 'source-code-archive.zip',
    size: 45_600_000,
    type: 'application/zip',
    category: 'archive',
    uploadedAt: new Date('2025-12-10'),
    status: 'uploading',
    progress: 67,
  },
];

function getDemoCategory(type: string): FileCategory {
  return FILE_CATEGORY_MAP[type] || 'other';
}

export const DistributionDashboard: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>(DEMO_FILES);

  const handleView = useCallback((fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file?.previewUrl) {
      window.open(file.previewUrl, '_blank', 'noopener,noreferrer');
    }
    console.log('View file:', fileId);
  }, [files]);

  const handleReplace = useCallback((fileId: string) => {
    console.log('Replace file:', fileId);
  }, []);

  const handleRemove = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: UploadedFile[] = Array.from(selected).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      category: getDemoCategory(f.type),
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      uploadedAt: new Date(),
      status: 'complete' as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const completedCount = files.filter((f) => f.status === 'complete').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;

  return (
    <div className="min-h-screen p-6 md:p-10 animate-fade-in">
      <div className="max-w-[1100px] mx-auto">
        <header className="mb-8">
          <Link to="/" className="text-sm text-muted hover:text-main transition-colors mb-4 inline-block">
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Document Preview</h1>
          <p className="text-muted text-sm">
            Review uploaded files before distribution. Drag to reorder or use keyboard shortcuts.
          </p>
        </header>

        <div className="glass-card p-6 md:p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold">Uploaded Files</h2>
              <p className="text-muted text-xs mt-1">
                {completedCount} ready
                {uploadingCount > 0 && <> &middot; {uploadingCount} uploading</>}
                &middot; {files.length} total
              </p>
            </div>
            <label className="btn-secondary cursor-pointer w-fit">
              <FileUp size={16} />
              Upload Files
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={handleUpload}
                aria-label="Upload files"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.mp4,.webm,.mp3,.wav,.txt,.html,.css,.js,.ts"
              />
            </label>
          </div>

          <ThumbnailPreviewGrid
            files={files}
            onView={handleView}
            onReplace={handleReplace}
            onRemove={handleRemove}
            onReorder={handleReorder}
          />
        </div>

        <div className="glass-card p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-3">
              <kbd className="kbd">Enter</kbd>
              <span className="text-muted">View file</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="kbd">Delete</kbd>
              <span className="text-muted">Remove file</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="kbd">&larr;</kbd>
              <kbd className="kbd">&rarr;</kbd>
              <span className="text-muted">Reorder files</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="kbd">Ctrl+R</kbd>
              <span className="text-muted">Replace file</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
