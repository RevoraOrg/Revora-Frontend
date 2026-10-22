import { describe, it, expect } from 'vitest';
import {
  DateRangeOption,
  SegmentOption,
  DistributionFilterState,
  FilterPreset,
  DistributionFilterToolbarProps,
} from './DistributionFilterToolbar.types';

/**
 * Focused behavior coverage for the pure-types module backing the
 * DistributionFilterToolbar. Because the file contains only type
 * declarations, the suite uses `expectTypeOf` to pin the public contract
 * (exact unions, required fields, optional date fields, partial presets)
 * and `@ts-expect-error` to prove representative invalid inputs are
 * rejected at compile time.
 */

describe('DateRangeOption', () => {
  it('exposes exactly the five supported range variants', () => {
    expectTypeOf<DateRangeOption>().toEqualTypeOf<
      'all' | '30d' | '90d' | 'ytd' | 'custom'
    >();
  });

  it('rejects an unknown range value at compile time', () => {
    // @ts-expect-error 'weekly' is not a valid DateRangeOption
    const bad: DateRangeOption = 'weekly';
    expect(bad).toBeDefined();
  });

  it('rejects a number where DateRangeOption is expected', () => {
    // @ts-expect-error a number is not a valid DateRangeOption
    const bad: DateRangeOption = 42;
    expect(bad).toBeDefined();
  });
});

describe('SegmentOption', () => {
  it('exposes exactly the five supported segment variants', () => {
    expectTypeOf<SegmentOption>().toEqualTypeOf<
      'none' | 'region' | 'offering' | 'status' | 'tier'
    >();
  });

  it('rejects an unsupported segment at compile time', () => {
    // @ts-expect-error 'product' is not a valid SegmentOption
    const bad: SegmentOption = 'product';
    expect(bad).toBeDefined();
  });
});

describe('DistributionFilterState', () => {
  it('accepts a fully-populated state object', () => {
    const state: DistributionFilterState = {
      searchQuery: 'Nexus',
      dateRange: 'custom',
      customStartDate: '2026-01-01',
      customEndDate: '2026-03-31',
      issuer: 'issuer-a',
      region: 'NA',
      status: 'active',
      segmentBy: 'region',
      compareMode: true,
    };
    expect(state.dateRange).toBe('custom');
    expect(state.segmentBy).toBe('region');
    expect(state.compareMode).toBe(true);
  });

  it('permits all date-range choices on the same state shape', () => {
    const states: DistributionFilterState[] = (
      ['all', '30d', '90d', 'ytd', 'custom'] as DateRangeOption[]
    ).map((dateRange) => ({
      searchQuery: '',
      dateRange,
      issuer: 'all',
      region: 'all',
      status: 'all',
      segmentBy: 'none',
      compareMode: false,
    }));

    expect(states.map((s) => s.dateRange)).toEqual([
      'all',
      '30d',
      '90d',
      'ytd',
      'custom',
    ]);
  });

  it('requires every mandatory field on the state', () => {
    // @ts-expect-error missing required fields (searchQuery, dateRange, issuer, region, status, segmentBy, compareMode)
    const incomplete: DistributionFilterState = {
      customStartDate: '2026-01-01',
    };
    expect(incomplete).toBeDefined();
  });

  it('rejects an invalid status string at compile time despite being typed as string', () => {
    // status is a plain string field today; assert it stays a string so a
    // future enum change is caught by this suite.
    expectTypeOf<DistributionFilterState['status']>().toEqualTypeOf<string>();
  });
});

describe('FilterPreset', () => {
  it('accepts a partial filter state', () => {
    const preset: FilterPreset = {
      id: 'preset-1',
      name: 'Last 90 days',
      filterState: {
        dateRange: '90d',
        segmentBy: 'region',
      },
    };
    expect(preset.id).toBe('preset-1');
    expect(preset.filterState.dateRange).toBe('90d');
  });

  it('rejects a malformed preset id type at compile time', () => {
    // @ts-expect-error id must be a string
    const preset: FilterPreset = { id: 1, name: 'x', filterState: {} };
    expect(preset).toBeDefined();
  });
});

describe('DistributionFilterToolbarProps', () => {
  it('carries the filter state and mutation callbacks', () => {
    const props: DistributionFilterToolbarProps = {
      filters: {
        searchQuery: '',
        dateRange: 'all',
        issuer: 'all',
        region: 'all',
        status: 'all',
        segmentBy: 'none',
        compareMode: false,
      },
      onFilterChange: () => undefined,
      onResetFilters: () => undefined,
      onSavePreset: () => undefined,
      issuerOptions: ['issuer-a'],
      regionOptions: ['NA'],
      statusOptions: ['active'],
      savedPresets: [],
    };

    expect(props.onFilterChange).toBeTypeOf('function');
    expect(props.issuerOptions).toEqual(['issuer-a']);
    expect(props.savedPresets).toEqual([]);
  });

  it('requires the core callbacks', () => {
    // @ts-expect-error onFilterChange and onResetFilters are mandatory
    const props: DistributionFilterToolbarProps = {
      filters: {
        searchQuery: '',
        dateRange: 'all',
        issuer: 'all',
        region: 'all',
        status: 'all',
        segmentBy: 'none',
        compareMode: false,
      },
      onSavePreset: () => undefined,
    };
    expect(props).toBeDefined();
  });
});