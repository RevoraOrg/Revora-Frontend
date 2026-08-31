import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WidgetCard } from './WidgetCard';

describe('WidgetCard', () => {
	test('renders children in ready state without a status badge', () => {
		render(
			<WidgetCard id="demo" title="Demo" slot="primary" status="ready">
				<p>Body content</p>
			</WidgetCard>
		);

		expect(
			screen.getByRole('heading', { level: 2, name: 'Demo' })
		).toBeInTheDocument();
		expect(screen.getByText('Body content')).toBeInTheDocument();
		expect(screen.queryByText('Ready')).not.toBeInTheDocument();
	});

	test('empty state falls back to a default message when none is provided', () => {
		render(
			<WidgetCard id="demo" title="Demo" slot="secondary" status="empty" />
		);

		expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
		expect(screen.getByText('No data available yet.')).toBeInTheDocument();
		expect(screen.getByText('No data')).toBeInTheDocument();
	});

	test('error state renders the alert surface with an overridable message', () => {
		render(
			<WidgetCard
				id="demo"
				title="Demo"
				slot="tertiary"
				status="error"
				errorMessage="Outage detected."
			/>
		);

		expect(
			screen.getByRole('alert', { name: 'Demo error' })
		).toBeInTheDocument();
		expect(screen.getByText('Outage detected.')).toBeInTheDocument();
		expect(screen.getByText('Unavailable')).toBeInTheDocument();
	});

	test('loading state exposes a labelled busy surface', () => {
		render(
			<WidgetCard id="demo" title="Demo" slot="primary" status="loading" />
		);

		const card = screen.getByRole('article', { name: 'Demo' });
		expect(card).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByRole('status', { name: 'Loading Demo' })).toBeInTheDocument();
	});

	test('unrecognised status falls through to the ready body', () => {
		render(
			<WidgetCard
				id="demo"
				title="Demo"
				slot="primary"
				status={'weird' as never}
			>
				<p>Fallback body</p>
			</WidgetCard>
		);

		expect(screen.getByText('Fallback body')).toBeInTheDocument();
	});

	test('exposes slot classes on the card', () => {
		render(
			<WidgetCard id="demo" title="Demo" slot="secondary" status="ready">
				<p>x</p>
			</WidgetCard>
		);

		expect(screen.getByRole('article', { name: 'Demo' })).toHaveClass(
			'rd-slot--secondary'
		);
	});
});