import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

// Test direct imports from the index module under test
import * as IndexModule from './index';
import {
  DistributionFilterToolbar,
  type DistributionFilterState,
  type DateRangeOption,
  type SegmentOption,
  type FilterPreset,
  type DistributionFilterToolbarProps,
} from './index';

expect.extend(toHaveNoViolations);

describe('src/components/DistributionFilterToolbar/index.ts', () => {
  const initialFilterState: DistributionFilterState = {
    searchQuery: '',
    dateRange: 'all',
    issuer: 'all',
    region: 'all',
    status: 'all',
    segmentBy: 'none',
    compareMode: false,
  };

  const createProps = (overrides?: Partial<DistributionFilterToolbarProps>): DistributionFilterToolbarProps => ({
    filters: { ...initialFilterState },
    onFilterChange: vi.fn(),
    onResetFilters: vi.fn(),
    onSavePreset: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Module Exports Contract', () => {
    it('exposes DistributionFilterToolbar as a defined React component function', () => {
      expect(IndexModule.DistributionFilterToolbar).toBeDefined();
      expect(typeof IndexModule.DistributionFilterToolbar).toBe('function');
      expect(DistributionFilterToolbar).toBe(IndexModule.DistributionFilterToolbar);
    });

    it('validates typescript interface typing compatibility for exported types', () => {
      const sampleDateRange: DateRangeOption = '90d';
      const sampleSegment: SegmentOption = 'region';
      const samplePreset: FilterPreset = {
        id: 'test-preset',
        name: 'Test Preset',
        filterState: {
          dateRange: sampleDateRange,
          segmentBy: sampleSegment,
        },
      };

      const sampleState: DistributionFilterState = {
        searchQuery: 'Series A',
        dateRange: sampleDateRange,
        issuer: 'Nexus',
        region: 'Europe',
        status: 'completed',
        segmentBy: sampleSegment,
        compareMode: true,
      };

      expect(sampleState.dateRange).toBe('90d');
      expect(sampleState.segmentBy).toBe('region');
      expect(samplePreset.id).toBe('test-preset');
    });
  });

  describe('Primary State Transitions & Rendering via index export', () => {
    it('renders the toolbar and handles search query updates', () => {
      const props = createProps();
      render(<DistributionFilterToolbar {...props} />);

      const searchInput = screen.getByTestId('filter-search-input');
      expect(searchInput).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: 'AeroDynamics' } });

      expect(props.onFilterChange).toHaveBeenCalledTimes(1);
      expect(props.onFilterChange).toHaveBeenCalledWith({
        ...initialFilterState,
        searchQuery: 'AeroDynamics',
      });
    });

    it('triggers filter change when selecting a predefined date range', () => {
      const props = createProps();
      render(<DistributionFilterToolbar {...props} />);

      const dateTrigger = screen.getByTestId('filter-trigger-date');
      fireEvent.click(dateTrigger);

      const popover = screen.getByRole('dialog', { name: /date range options/i });
      expect(popover).toBeInTheDocument();

      const thirtyDayOption = screen.getByRole('button', { name: /last 30 days/i });
      fireEvent.click(thirtyDayOption);

      expect(props.onFilterChange).toHaveBeenCalledWith({
        ...initialFilterState,
        dateRange: '30d',
      });
    });

    it('triggers filter change when custom date range boundaries are applied', () => {
      const customProps = createProps({
        filters: {
          ...initialFilterState,
          dateRange: 'custom',
        },
      });

      render(<DistributionFilterToolbar {...customProps} />);

      const dateTrigger = screen.getByTestId('filter-trigger-date');
      fireEvent.click(dateTrigger);

      const startInput = screen.getByLabelText('Start date');
      const endInput = screen.getByLabelText('End date');

      fireEvent.change(startInput, { target: { value: '2026-01-01' } });
      expect(customProps.onFilterChange).toHaveBeenCalledWith({
        ...initialFilterState,
        dateRange: 'custom',
        customStartDate: '2026-01-01',
      });

      fireEvent.change(endInput, { target: { value: '2026-03-31' } });
      expect(customProps.onFilterChange).toHaveBeenCalledWith({
        ...initialFilterState,
        dateRange: 'custom',
        customEndDate: '2026-03-31',
      });
    });

    it('handles issuer selection popover transitions', () => {
      const props = createProps({
        issuerOptions: ['All Issuers', 'Custom Issuer A', 'Custom Issuer B'],
      });
      render(<DistributionFilterToolbar {...props} />);

      const issuerTrigger = screen.getByTestId('filter-trigger-issuer');
      fireEvent.click(issuerTrigger);

      const optionA = screen.getByRole('button', { name: /custom issuer a/i });
      fireEvent.click(optionA);

      expect(props.onFilterChange).toHaveBeenCalledWith({
        ...initialFilterState,
        issuer: 'Custom Issuer A',
      });
    });

    it('handles region and status selections correctly', () => {
      const props = createProps();
      render(<DistributionFilterToolbar {...props} />);

      // Region selection
      const regionTrigger = screen.getByTestId('filter-trigger-region');
      fireEvent.click(regionTrigger);
      const europeOption = screen.getByRole('button', { name: /europe/i });
      fireEvent.click(europeOption);

      expect(props.onFilterChange).toHaveBeenCalledWith({
        ...initialFilterState,
        region: 'Europe',
      });

      // Status selection
      const statusTrigger = screen.getByTestId('filter-trigger-status');
      fireEvent.click(statusTrigger);
      const failedOption = screen.getByRole('button', { name: /failed/i });
      fireEvent.click(failedOption);

      expect(props.onFilterChange).toHaveBeenCalledWith({
        ...initialFilterState,
        status: 'failed',
      });
    });

    it('handles segmentation selector and compare mode checkbox transitions', () => {
      const props = createProps();
      render(<DistributionFilterToolbar {...props} />);

      // Segmentation change
      const segmentSelect = screen.getByTestId('filter-segment-select');
      fireEvent.change(segmentSelect, { target: { value: 'tier' } });

      expect(props.onFilterChange).toHaveBeenCalledWith({
        ...initialFilterState,
        segmentBy: 'tier',
      });

      // Compare mode toggle
      const compareCheckbox = screen.getByTestId('filter-compare-toggle');
      fireEvent.click(compareCheckbox);

      expect(props.onFilterChange).toHaveBeenCalledWith({
        ...initialFilterState,
        compareMode: true,
      });
    });

    it('invokes onResetFilters when clicking the Clear All button', () => {
      const dirtyState: DistributionFilterState = {
        searchQuery: 'Test',
        dateRange: '30d',
        issuer: 'Nexus',
        region: 'North America',
        status: 'failed',
        segmentBy: 'region',
        compareMode: true,
      };

      const props = createProps({ filters: dirtyState });
      render(<DistributionFilterToolbar {...props} />);

      const resetBtn = screen.getByTestId('filter-clear-all-btn');
      expect(resetBtn).toBeInTheDocument();
      fireEvent.click(resetBtn);

      expect(props.onResetFilters).toHaveBeenCalledTimes(1);
    });

    it('handles active filter pills dismissal per filter key', () => {
      const activeState: DistributionFilterState = {
        searchQuery: 'Nexus',
        dateRange: '90d',
        issuer: 'Nexus Cloud Series A',
        region: 'North America',
        status: 'failed',
        segmentBy: 'region',
        compareMode: true,
      };

      const props = createProps({ filters: activeState });
      render(<DistributionFilterToolbar {...props} />);

      expect(screen.getByTestId('active-filter-pills-row')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /remove search filter/i }));
      expect(props.onFilterChange).toHaveBeenCalledWith({ ...activeState, searchQuery: '' });

      fireEvent.click(screen.getByRole('button', { name: /remove date range filter/i }));
      expect(props.onFilterChange).toHaveBeenCalledWith({ ...activeState, dateRange: 'all' });

      fireEvent.click(screen.getByRole('button', { name: /remove issuer filter/i }));
      expect(props.onFilterChange).toHaveBeenCalledWith({ ...activeState, issuer: 'all' });

      fireEvent.click(screen.getByRole('button', { name: /remove region filter/i }));
      expect(props.onFilterChange).toHaveBeenCalledWith({ ...activeState, region: 'all' });

      fireEvent.click(screen.getByRole('button', { name: /remove status filter/i }));
      expect(props.onFilterChange).toHaveBeenCalledWith({ ...activeState, status: 'all' });

      fireEvent.click(screen.getByRole('button', { name: /remove segmentation/i }));
      expect(props.onFilterChange).toHaveBeenCalledWith({ ...activeState, segmentBy: 'none' });

      fireEvent.click(screen.getByRole('button', { name: /turn off compare mode/i }));
      expect(props.onFilterChange).toHaveBeenCalledWith({ ...activeState, compareMode: false });
    });
  });

  describe('Presets Management via Exported Component', () => {
    it('applies an existing preset', () => {
      const customPresets: FilterPreset[] = [
        {
          id: 'custom-p1',
          name: 'High Risk Filter',
          filterState: {
            status: 'failed',
            dateRange: '90d',
          },
        },
      ];

      const activeState: DistributionFilterState = {
        ...initialFilterState,
        region: 'Europe',
      };

      const props = createProps({ filters: activeState, savedPresets: customPresets });
      render(<DistributionFilterToolbar {...props} />);

      const presetTrigger = screen.getByTestId('filter-presets-trigger');
      fireEvent.click(presetTrigger);

      const applyPresetBtn = screen.getByTestId('preset-option-custom-p1');
      fireEvent.click(applyPresetBtn);

      expect(props.onFilterChange).toHaveBeenCalledWith({
        ...activeState,
        status: 'failed',
        dateRange: '90d',
      });
    });

    it('allows creating and saving a new preset with callback invocation', () => {
      const activeState: DistributionFilterState = {
        ...initialFilterState,
        region: 'Europe',
      };
      const props = createProps({ filters: activeState });
      render(<DistributionFilterToolbar {...props} />);

      const presetTrigger = screen.getByTestId('filter-presets-trigger');
      fireEvent.click(presetTrigger);

      const nameInput = screen.getByTestId('preset-name-input');
      const saveBtn = screen.getByTestId('save-preset-btn');

      fireEvent.change(nameInput, { target: { value: 'My Saved Preset' } });
      fireEvent.click(saveBtn);

      expect(props.onSavePreset).toHaveBeenCalledWith('My Saved Preset', activeState);
    });
  });

  describe('Boundary and Keyboard Navigation Behavior', () => {
    it('closes open popover when Escape key is pressed', () => {
      const props = createProps();
      render(<DistributionFilterToolbar {...props} />);

      const dateTrigger = screen.getByTestId('filter-trigger-date');
      fireEvent.click(dateTrigger);
      expect(screen.getByRole('dialog', { name: /date range options/i })).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: /date range options/i })).not.toBeInTheDocument();
    });

    it('closes popovers when clicking outside toolbar area', () => {
      const props = createProps();
      render(
        <div>
          <div data-testid="outside-element">Outside</div>
          <DistributionFilterToolbar {...props} />
        </div>
      );

      const dateTrigger = screen.getByTestId('filter-trigger-date');
      fireEvent.click(dateTrigger);
      expect(screen.getByRole('dialog', { name: /date range options/i })).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside-element'));
      expect(screen.queryByRole('dialog', { name: /date range options/i })).not.toBeInTheDocument();
    });

    it('handles mobile sheet open, interactions, and dismissals', () => {
      const props = createProps();
      render(<DistributionFilterToolbar {...props} />);

      const mobileTrigger = screen.getByTestId('mobile-filter-trigger');
      fireEvent.click(mobileTrigger);

      const mobileSheet = screen.getByTestId('mobile-filter-sheet');
      expect(mobileSheet).toBeInTheDocument();

      const searchInput = within(mobileSheet).getByPlaceholderText(/search id or offering/i);
      fireEvent.change(searchInput, { target: { value: 'Mobile Query' } });
      expect(props.onFilterChange).toHaveBeenCalledWith({
        ...initialFilterState,
        searchQuery: 'Mobile Query',
      });

      // Apply button dismisses the mobile sheet
      const applyBtn = screen.getByTestId('mobile-apply-btn');
      fireEvent.click(applyBtn);
      expect(screen.queryByTestId('mobile-filter-sheet')).not.toBeInTheDocument();
    });

    it('recovers gracefully when localStorage throws during preset load', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('SecurityError: localStorage is disabled');
      });

      const props = createProps();
      expect(() => {
        render(<DistributionFilterToolbar {...props} />);
      }).not.toThrow();

      getItemSpy.mockRestore();
    });
  });

  describe('Accessibility Compliance', () => {
    it('passes automated axe audit with no violations', async () => {
      const props = createProps();
      const { container } = render(<DistributionFilterToolbar {...props} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
