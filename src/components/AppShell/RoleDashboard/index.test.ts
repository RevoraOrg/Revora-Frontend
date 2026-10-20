import { describe, it, expect } from 'vitest';

import * as KycDocumentCaptureIndex from './index';

describe('KycDocumentCapture Public API', () => {
  it('exposes the KycDocumentCapture component', () => {
    expect(KycDocumentCaptureIndex.KycDocumentCapture).toBeDefined();
    expect(typeof KycDocumentCaptureIndex.KycDocumentCapture).toBe('function');
  });

  it('exposes the default export', () => {
    expect(KycDocumentCaptureIndex.default).toBeDefined();
    expect(typeof KycDocumentCaptureIndex.default).toBe('function');
  });

  it('exposes document capture types and constants', () => {
    expect(KycDocumentCaptureIndex.DOCUMENT_TYPES).toBeDefined();
    expect(KycDocumentCaptureIndex.DOCUMENT_SIDES).toBeDefined();
    expect(KycDocumentCaptureIndex.CAPTURE_STEPS).toBeDefined();
  });

  it('exposes document capture utilities', () => {
    expect(KycDocumentCaptureIndex.isDocumentType).toBeDefined();
    expect(typeof KycDocumentCaptureIndex.isDocumentType).toBe('function');

    expect(KycDocumentCaptureIndex.isDocumentSide).toBeDefined();
    expect(typeof KycDocumentCaptureIndex.isDocumentSide).toBe('function');

    expect(KycDocumentCaptureIndex.getDocumentCaptureStep).toBeDefined();
    expect(typeof KycDocumentCaptureIndex.getDocumentCaptureStep).toBe('function');
  });

  it('validates document types with success and failure paths', () => {
    expect(KycDocumentCaptureIndex.isDocumentType('passport')).toBe(true);
    expect(KycDocumentCaptureIndex.isDocumentType('invalid')).toBe(false);
    expect(KycDocumentCaptureIndex.isDocumentType(null)).toBe(false);
    expect(KycDocumentCaptureIndex.isDocumentType(undefined)).toBe(false);
  });

  it('validates document sides with success and failure paths', () => {
    expect(KycDocumentCaptureIndex.isDocumentSide('front')).toBe(true);
    expect(KycDocumentCaptureIndex.isDocumentSide('back')).toBe(true);
    expect(KycDocumentCaptureIndex.isDocumentSide('invalid')).toBe(false);
    expect(KycDocumentCaptureIndex.isDocumentSide(null)).toBe(false);
  });

  it('resolves capture steps deterministically', () => {
    expect(KycDocumentCaptureIndex.getDocumentCaptureStep('front')).toBeDefined();
    expect(KycDocumentCaptureIndex.getDocumentCaptureStep('back')).toBeDefined();
    expect(KycDocumentCaptureIndex.getDocumentCaptureStep('invalid')).toBeUndefined();
  });

  it('does not expose unexpected properties', () => {
    const expectedExports = [
      'KycDocumentCapture',
      'default',
      'DOCUMENT_TYPES',
      'DOCUMENT_SIDES',
      'CAPTURE_STEPS',
      'isDocumentType',
      'isDocumentSide',
      'getDocumentCaptureStep'
    ];

    const actualExports = Object.keys(KycDocumentCaptureIndex);

    for (const key of actualExports) {
      expect(expectedExports.includes(key)).toBe(true);
    }

    for (const key of expectedExports) {
      expect(actualExports.includes(key)).toBe(true);
    }
  });
});
