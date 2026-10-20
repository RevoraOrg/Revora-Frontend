import { expectTypeOf, describe, it } from 'vitest';
import type { I18nFormatterPreviewProps, SampleRowData } from './I18nFormatterPreview.types';

describe('I18nFormatterPreview.types', () => {
  describe('I18nFormatterPreviewProps', () => {
    it('should accept valid props', () => {
      const validProps: I18nFormatterPreviewProps = {
        initialLocale: 'en-US',
        systemDefaultLocale: 'en-US',
        onLocaleChange: (locale: string) => {},
        className: 'test-class',
        ariaHeadingId: 'test-id',
      };
      expectTypeOf(validProps).toMatchTypeOf<I18nFormatterPreviewProps>();
    });

    it('should accept optional props', () => {
      const emptyProps: I18nFormatterPreviewProps = {};
      expectTypeOf(emptyProps).toMatchTypeOf<I18nFormatterPreviewProps>();
    });
  });

  describe('SampleRowData', () => {
    it('should accept valid row data', () => {
      const validRow: SampleRowData = {
        id: '1',
        category: 'number',
        categoryLabel: 'Number',
        description: 'Test number',
        rawSample: '1000',
        formatValue: (locale: string) => '1,000',
        diffNote: 'None',
      };
      expectTypeOf(validRow).toMatchTypeOf<SampleRowData>();
    });

    it('should enforce specific literal types for category', () => {
      // @ts-expect-error 'invalid' is not a valid category
      const invalidRow: SampleRowData = {
        id: '2',
        category: 'invalid', 
        categoryLabel: 'Invalid',
        description: 'Invalid category',
        rawSample: 'test',
        formatValue: (locale: string) => 'test',
        diffNote: 'None',
      };
    });
    
    it('should require all fields', () => {
      // @ts-expect-error missing fields
      const incompleteRow: SampleRowData = {
        id: '3',
      };
    });
  });
});
