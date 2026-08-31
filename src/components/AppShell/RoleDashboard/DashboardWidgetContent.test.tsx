import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardWidgetContent } from './DashboardWidgetContent';

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
});