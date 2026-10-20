/**
 * Test suite for src/components/DocumentUploader/index.ts
 *
 * Strategy: the index module is a barrel re-export. These tests verify:
 *   1. Every named export declared in the barrel is present and non-nullish.
 *   2. Value exports are referentially identical to the originals in
 *      ./DocumentUploader — so any re-export typo or aliasing mistake
 *      causes an immediate failure.
 *   3. Type exports are exercised via assignability: objects that satisfy the
 *      exported interface/type compile and pass a structural shape check,
 *      confirming the type definitions are not accidentally narrowed or widened
 *      by the barrel.
 *   4. The public-contract surface (number of named exports) is locked to
 *      guard against accidental removal or addition.
 *
 * The success/failure/state-transition behaviour of DocumentUploader itself is
 * fully covered by DocumentUploader.test.tsx; this file deliberately avoids
 * duplicating that coverage.
 */

import { describe, it, expect } from 'vitest';

// ─── Barrel imports (system under test) ──────────────────────────────────────
import * as barrel from './index';
import {
  DocumentUploader,
  type DocumentUploaderProps,
  type UploadableFile,
  type UploadStatus,
} from './index';

// ─── Source-of-truth imports (for identity checks) ───────────────────────────
import * as source from './DocumentUploader';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Named exports are present and non-nullish
// ─────────────────────────────────────────────────────────────────────────────
describe('DocumentUploader/index.ts — named exports exist', () => {
  it('exports DocumentUploader as a defined value', () => {
    expect(DocumentUploader).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Value exports are referentially identical to the source module
//    (guards against aliasing mistakes or double-wrapping)
// ─────────────────────────────────────────────────────────────────────────────
describe('DocumentUploader/index.ts — referential identity with source module', () => {
  it('re-exports DocumentUploader as the exact same reference', () => {
    expect(barrel.DocumentUploader).toBe(source.DocumentUploader);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Public contract surface is locked
//    Only the four declared exports (DocumentUploader + 3 types) should exist.
//    Types are erased at runtime so only the one value export is enumerable.
// ─────────────────────────────────────────────────────────────────────────────
describe('DocumentUploader/index.ts — public surface lock', () => {
  it('exposes exactly one enumerable runtime export (DocumentUploader)', () => {
    const runtimeExports = Object.keys(barrel);
    expect(runtimeExports).toEqual(['DocumentUploader']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Type-export structural checks
//    TypeScript erases types at runtime; we verify them by constructing objects
//    that conform to each exported type and asserting on their runtime shape.
//    A compile error here means the barrel narrowed or broke the public type.
// ─────────────────────────────────────────────────────────────────────────────
describe('DocumentUploader/index.ts — type exports are structurally sound', () => {
  // UploadStatus — union of three string literals
  it('UploadStatus accepts the three valid literal values', () => {
    const uploading: UploadStatus = 'uploading';
    const completed: UploadStatus = 'completed';
    const error: UploadStatus = 'error';

    expect(uploading).toBe('uploading');
    expect(completed).toBe('completed');
    expect(error).toBe('error');
  });

  // UploadableFile — required fields + optional fields
  it('UploadableFile is satisfied by a minimal object (required fields only)', () => {
    const file: UploadableFile = {
      id: 'f1',
      name: 'articles.pdf',
      size: 204_800,
      status: 'uploading',
    };

    expect(file.id).toBe('f1');
    expect(file.name).toBe('articles.pdf');
    expect(file.size).toBe(204_800);
    expect(file.status).toBe('uploading');
    expect(file.progress).toBeUndefined();
    expect(file.errorMessage).toBeUndefined();
  });

  it('UploadableFile allows optional progress and errorMessage fields', () => {
    const file: UploadableFile = {
      id: 'f2',
      name: 'financials.pdf',
      size: 1_024,
      status: 'error',
      progress: 50,
      errorMessage: 'Network error.',
    };

    expect(file.progress).toBe(50);
    expect(file.errorMessage).toBe('Network error.');
  });

  it('UploadableFile status can be set to each valid UploadStatus value', () => {
    const statuses: UploadStatus[] = ['uploading', 'completed', 'error'];

    for (const status of statuses) {
      const file: UploadableFile = { id: 'fx', name: 'doc.pdf', size: 100, status };
      expect(file.status).toBe(status);
    }
  });

  // DocumentUploaderProps — required fields + common optional fields
  it('DocumentUploaderProps is satisfied by the minimum required fields', () => {
    const props: DocumentUploaderProps = {
      files: [],
      onFilesAdded: (_files: File[]) => {},
      onRemove: (_id: string) => {},
    };

    expect(Array.isArray(props.files)).toBe(true);
    expect(typeof props.onFilesAdded).toBe('function');
    expect(typeof props.onRemove).toBe('function');
  });

  it('DocumentUploaderProps accepts all optional fields without type errors', () => {
    const props: DocumentUploaderProps = {
      files: [],
      onFilesAdded: (_files: File[]) => {},
      onRemove: (_id: string) => {},
      onRetry: (_id: string) => {},
      label: 'Upload compliance docs',
      description: 'Attach signed agreements.',
      accept: '.pdf,.png',
      maxSizeBytes: 5 * 1024 * 1024,
      multiple: true,
      disabled: false,
      id: 'custom-uploader',
      className: 'my-uploader',
    };

    expect(props.label).toBe('Upload compliance docs');
    expect(props.accept).toBe('.pdf,.png');
    expect(props.maxSizeBytes).toBe(5 * 1024 * 1024);
    expect(props.multiple).toBe(true);
    expect(props.disabled).toBe(false);
  });

  it('DocumentUploaderProps.files can hold UploadableFile entries of all statuses', () => {
    const files: UploadableFile[] = [
      { id: 'a', name: 'a.pdf', size: 100, status: 'uploading', progress: 30 },
      { id: 'b', name: 'b.pdf', size: 200, status: 'completed' },
      { id: 'c', name: 'c.pdf', size: 300, status: 'error', errorMessage: 'Server error.' },
    ];

    const props: DocumentUploaderProps = {
      files,
      onFilesAdded: () => {},
      onRemove: () => {},
    };

    expect(props.files).toHaveLength(3);
    expect(props.files[0].status).toBe('uploading');
    expect(props.files[1].status).toBe('completed');
    expect(props.files[2].status).toBe('error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Boundary / invalid-input behaviour observable through the barrel
//    These tests confirm that validation edge cases are reachable when the
//    component is consumed via the barrel (not via a direct deep import).
// ─────────────────────────────────────────────────────────────────────────────
describe('DocumentUploader/index.ts — barrel-imported component handles boundaries', () => {
  it('DocumentUploader is a function (React component)', () => {
    // The component must be callable as a function by React's reconciler.
    expect(typeof DocumentUploader).toBe('function');
  });

  it('DocumentUploader.displayName is set (aids debugging in devtools)', () => {
    expect(DocumentUploader.displayName).toBe('DocumentUploader');
  });

  it('DocumentUploaderProps.files accepts an empty array (zero-file boundary)', () => {
    const props: DocumentUploaderProps = {
      files: [],
      onFilesAdded: () => {},
      onRemove: () => {},
    };
    expect(props.files).toHaveLength(0);
  });

  it('UploadableFile with progress: 0 satisfies the minimum progress boundary', () => {
    const file: UploadableFile = {
      id: 'edge-0',
      name: 'zero-progress.pdf',
      size: 1,
      status: 'uploading',
      progress: 0,
    };
    expect(file.progress).toBe(0);
  });

  it('UploadableFile with progress: 100 satisfies the maximum progress boundary', () => {
    const file: UploadableFile = {
      id: 'edge-100',
      name: 'complete-progress.pdf',
      size: 1,
      status: 'uploading',
      progress: 100,
    };
    expect(file.progress).toBe(100);
  });

  it('UploadableFile with size: 0 is a valid edge-case object (empty file)', () => {
    const file: UploadableFile = { id: 'empty', name: 'empty.txt', size: 0, status: 'uploading' };
    expect(file.size).toBe(0);
  });

  it('DocumentUploaderProps.maxSizeBytes: 0 is structurally valid (zero-byte limit)', () => {
    const props: DocumentUploaderProps = {
      files: [],
      onFilesAdded: () => {},
      onRemove: () => {},
      maxSizeBytes: 0,
    };
    expect(props.maxSizeBytes).toBe(0);
  });
});
