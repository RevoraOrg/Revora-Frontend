import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { DashboardWidgetContent } from './DashboardWidgetContent';

// Issue #680 — regression suite for the empty-result path.
describe('DashboardWidgetContent — unknown-kind failure path (Issue #680)', () => {
	test('renders exactly nothing for an unrecognised content kind', () => {
		const { container } = render(
			<DashboardWidgetContent content={{ kind: 'unknown' } as never} />
		);

		expect(container).toBeEmptyDOMElement();
		// Null contract: not an empty wrapper — the component returns null itself.
		expect(container.firstChild).toBeNull();
	});

	test('renders nothing for several unexpected kinds', () => {
		const unexpected = ['table', 'chart', 'text', '', 'METRICS', null, undefined];
		for (const kind of unexpected) {
			const { container, unmount } = render(
				<DashboardWidgetContent content={{ kind } as never} />
			);
			expect(container.firstChild).toBeNull();
			unmount();
		}
	});

	test('recovers when a later render carries a valid kind after an invalid one', () => {
		const { container, rerender } = render(
			<DashboardWidgetContent content={{ kind: 'mystery' } as never} />
		);
		expect(container.firstChild).toBeNull();

		rerender(
			<DashboardWidgetContent
				content={{ kind: 'metrics', metrics: [{ label: 'OK', value: '1' }] }}
			/>
		);
		expect(screen.getByText('OK')).toBeInTheDocument();
		expect(container.querySelector('.rd-metrics')).toBeInTheDocument();
	});

	test('stays null across a rerender with another invalid kind', () => {
		const { container, rerender } = render(
			<DashboardWidgetContent content={{ kind: 'unknown' } as never} />
		);
		rerender(<DashboardWidgetContent content={{ kind: 'other' } as never} />);

		expect(container.firstChild).toBeNull();
		expect(container).toBeEmptyDOMElement();
	});

	test('unmounts cleanly after rendering the null path', () => {
		const { container, unmount } = render(
			<DashboardWidgetContent content={{ kind: 'unknown' } as never} />
		);
		expect(container.firstChild).toBeNull();
		unmount();
		expect(container).toBeEmptyDOMElement();
	});

	test('does not log errors or warnings for an unknown kind', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		try {
			render(<DashboardWidgetContent content={{ kind: 'unknown' } as never} />);
		} finally {
			errorSpy.mockRestore();
			warnSpy.mockRestore();
		}

		expect(errorSpy).not.toHaveBeenCalled();
		expect(warnSpy).not.toHaveBeenCalled();
	});

	test('renders all known kinds as the neighboring normal paths', () => {
		const metricsView = render(
			<DashboardWidgetContent
				content={{ kind: 'metrics', metrics: [{ label: 'M', value: '1' }] }}
			/>
		);
		expect(metricsView.container.querySelector('.rd-metrics')).toBeInTheDocument();
		metricsView.unmount();

		const rowsView = render(
			<DashboardWidgetContent
				content={{ kind: 'rows', rows: [{ label: 'R', value: '1' }] }}
			/>
		);
		expect(rowsView.container.querySelector('.rd-rows')).toBeInTheDocument();
		rowsView.unmount();

		const progressView = render(
			<DashboardWidgetContent
				content={{ kind: 'progress', label: 'P', value: 'v', progress: 1 }}
			/>
		);
		expect(progressView.container.querySelector('.rd-progress')).toBeInTheDocument();
	});
});

describe('DashboardWidgetContent', () => {
	test('renders metrics with delta and sparkline', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'metrics',
					metrics: [
						{
							label: 'Total value',
							value: '$84,320',
							delta: 12.4,
							tone: 'positive',
							sparkline: [20, 26, 22, 28, 24, 30, 34],
						},
					],
				}}
			/>
		);

		expect(screen.getByText('Total value')).toBeInTheDocument();
		expect(screen.getByText('$84,320')).toBeInTheDocument();
		expect(screen.getByText('+12.4%')).toBeInTheDocument();
		expect(
			screen.getByRole('img', { name: 'Sparkline for Total value' })
		).toBeInTheDocument();
	});

	test('renders negative delta without leading plus', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'metrics',
					metrics: [{ label: 'Q', value: '1', delta: -3.2, tone: 'negative' }],
				}}
			/>
		);

		expect(screen.getByText('-3.2%')).toBeInTheDocument();
	});

	test('omits delta text when delta is absent', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'metrics',
					metrics: [{ label: 'Q', value: '12' }],
				}}
			/>
		);

		expect(screen.getByText('12')).toBeInTheDocument();
		expect(screen.queryByText(/%$/, { selector: '.rd-metric__meta span' })).toBeNull();
	});

	test('renders rows list', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'rows',
					rows: [
						{ label: 'Equity', value: '46%', tone: 'positive' },
						{ label: 'Cash', value: '23%' },
					],
				}}
			/>
		);

		const list = screen.getByRole('list');
		expect(list).toBeInTheDocument();
		expect(screen.getByText('Equity')).toBeInTheDocument();
		expect(screen.getByText('46%')).toBeInTheDocument();
	});

	test('renders progress bar with bounded aria value', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'progress',
					label: 'Raised vs target',
					value: '$1.2M / $2.5M',
					progress: 48,
				}}
			/>
		);

		const bar = screen.getByRole('progressbar', {
			name: 'Raised vs target',
		});
		expect(bar).toHaveAttribute('aria-valuenow', '48');
		expect(bar).toHaveAttribute('aria-valuemin', '0');
		expect(bar).toHaveAttribute('aria-valuemax', '100');
		expect(screen.getByText('$1.2M / $2.5M')).toBeInTheDocument();
	});

	test('clamps progress values outside 0..100', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'progress',
					label: 'Clamped',
					value: 'x',
					progress: 150,
				}}
			/>
		);

		expect(screen.getByRole('progressbar', { name: 'Clamped' })).toHaveAttribute(
			'aria-valuenow',
			'100'
		);
	});

	test('clamps non-finite progress values to zero', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'progress',
					label: 'Non-finite',
					value: 'x',
					progress: Number.NaN,
				}}
			/>
		);

		expect(
			screen.getByRole('progressbar', { name: 'Non-finite' })
		).toHaveAttribute('aria-valuenow', '0');
	});

	test('renders nothing for an unrecognised content kind', () => {
		const { container } = render(
			<DashboardWidgetContent
				content={{ kind: 'unknown' } as never}
			/>
		);

		expect(container).toBeEmptyDOMElement();
	});

	test('renders progress note when provided', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'progress',
					label: 'L',
					value: 'v',
					progress: 10,
					note: '12 active commitments',
				}}
			/>
		);

		expect(screen.getByText('12 active commitments')).toBeInTheDocument();
	});

	// Issue #680 — boundary inputs on the neighboring normal paths.
	test('renders an empty metrics container when the metrics array is empty', () => {
		const { container } = render(
			<DashboardWidgetContent content={{ kind: 'metrics', metrics: [] }} />
		);

		expect(container.querySelector('.rd-metrics')).toBeInTheDocument();
		expect(container.querySelectorAll('.rd-metric')).toHaveLength(0);
	});

	test('renders an empty rows list when the rows array is empty', () => {
		const { container } = render(
			<DashboardWidgetContent content={{ kind: 'rows', rows: [] }} />
		);

		expect(screen.getByRole('list')).toBeInTheDocument();
		expect(container.querySelectorAll('.rd-row')).toHaveLength(0);
	});

	test('scales a single row to a full-width meter', () => {
		render(
			<DashboardWidgetContent
				content={{ kind: 'rows', rows: [{ label: 'Only', value: '46%' }] }}
			/>
		);

		const fill = document.querySelector<HTMLElement>('.rd-row__fill');
		expect(fill).not.toBeNull();
		expect(fill!.getAttribute('style')).toContain('width: 100%');
	});

	test('renders a zero-width meter for non-numeric row values instead of NaN', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'rows',
					rows: [{ label: 'Pending', value: 'N/A', tone: 'neutral' }],
				}}
			/>
		);

		expect(screen.getByText('Pending')).toBeInTheDocument();
		expect(screen.getByText('N/A')).toBeInTheDocument();
		const fill = document.querySelector<HTMLElement>('.rd-row__fill');
		expect(fill!.getAttribute('style')).toContain('width: 0%');
		// No NaN may leak into the style attribute.
		expect(fill!.getAttribute('style')).not.toContain('NaN');
	});

	test('clamps negative progress to zero width and aria-valuenow 0', () => {
		render(
			<DashboardWidgetContent
				content={{ kind: 'progress', label: 'Neg', value: 'v', progress: -20 }}
			/>
		);

		const bar = screen.getByRole('progressbar', { name: 'Neg' });
		expect(bar).toHaveAttribute('aria-valuenow', '0');
		const fill = document.querySelector<HTMLElement>('.rd-progress__fill');
		expect(fill!.getAttribute('style')).toContain('width: 0%');
	});

	test('accepts progress at the 100 boundary exactly', () => {
		render(
			<DashboardWidgetContent
				content={{ kind: 'progress', label: 'Full', value: 'v', progress: 100 }}
			/>
		);

		const bar = screen.getByRole('progressbar', { name: 'Full' });
		expect(bar).toHaveAttribute('aria-valuenow', '100');
		const fill = document.querySelector<HTMLElement>('.rd-progress__fill');
		expect(fill!.getAttribute('style')).toContain('width: 100%');
	});

	test('renders a zero delta with a leading plus sign', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'metrics',
					metrics: [{ label: 'Flat', value: '5', delta: 0 }],
				}}
			/>
		);

		expect(screen.getByText('+0.0%')).toBeInTheDocument();
	});

	test('renders a sparkline for a single-value series', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'metrics',
					metrics: [{ label: 'Solo', value: '7', sparkline: [42] }],
				}}
			/>
		);

		expect(
			screen.getByRole('img', { name: 'Sparkline for Solo' })
		).toBeInTheDocument();
	});

	test('omits the sparkline svg when the series is empty', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'metrics',
					metrics: [{ label: 'No spark', value: '7', sparkline: [] }],
				}}
			/>
		);

		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	test('renders a metric with a sparkline but no delta without crashing', () => {
		render(
			<DashboardWidgetContent
				content={{
					kind: 'metrics',
					metrics: [{ label: 'Spark only', value: '9', sparkline: [1, 2, 3] }],
				}}
			/>
		);

		expect(
			screen.getByRole('img', { name: 'Sparkline for Spark only' })
		).toBeInTheDocument();
		expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
	});
});