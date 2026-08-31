import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe } from 'jest-axe';
import { vi } from 'vitest';
import { RoleDashboard } from './RoleDashboard';
import type { DashboardHintStorage } from './onboardingHints';

const INVESTOR_METRIC = 'Portfolio value';
const ISSUER_METRIC = 'Fundraising progress';
const ADMIN_METRIC = 'Oversight incidents';

describe('RoleDashboard', () => {
	test('renders investor dashboard by default', () => {
		render(<RoleDashboard />);

		expect(
			screen.getByRole('heading', { level: 1, name: 'Investor dashboard' })
		).toBeInTheDocument();
		expect(screen.getByText('Portfolio value')).toBeInTheDocument();
		expect(screen.getByText('Allocation snapshot')).toBeInTheDocument();
		expect(screen.getByText('Performance trend')).toBeInTheDocument();
		expect(screen.getByText('$84,320')).toBeInTheDocument();
	});

	test('renders issuer variant', () => {
		render(<RoleDashboard role="issuer" />);

		expect(
			screen.getByRole('heading', { level: 1, name: 'Issuer dashboard' })
		).toBeInTheDocument();
		expect(screen.getByText('Raised vs target')).toBeInTheDocument();
		expect(screen.getByText('Revenue reports')).toBeInTheDocument();
		expect(screen.getByText('Upcoming payouts')).toBeInTheDocument();
	});

	test('renders admin variant', () => {
		render(<RoleDashboard role="admin" />);

		expect(
			screen.getByRole('heading', { level: 1, name: 'Oversight dashboard' })
		).toBeInTheDocument();
		expect(screen.getByText('Critical')).toBeInTheDocument();
		expect(screen.getByText('KYC queue')).toBeInTheDocument();
		expect(screen.getByText('Network health')).toBeInTheDocument();
	});

	test('exposes exactly one h1 per dashboard variant', () => {
		render(<RoleDashboard role="issuer" />);

		const headings = screen.getAllByRole('heading', { level: 1 });
		expect(headings).toHaveLength(1);
		expect(
			screen.getAllByRole('heading', { level: 2 }).length
		).toBeGreaterThanOrEqual(3);
	});

	test('multi-role user can switch variants via radio group', () => {
		render(
			<RoleDashboard role="investor" roles={['investor', 'issuer']} />
		);

		const radioGroup = screen.getByRole('radiogroup', {
			name: 'Dashboard role',
		});
		expect(
			within(radioGroup).getByRole('radio', { name: 'Investor' })
		).toBeChecked();

		fireEvent.click(screen.getByRole('radio', { name: 'Issuer' }));

		expect(screen.getByRole('radio', { name: 'Issuer' })).toBeChecked();
		expect(
			screen.getByRole('heading', { level: 1, name: 'Issuer dashboard' })
		).toBeInTheDocument();
		expect(screen.getByText('Revenue reports')).toBeInTheDocument();
		expect(screen.queryByText(INVESTOR_METRIC)).not.toBeInTheDocument();
	});

	test('singleton whitelist does not show a switcher', () => {
		render(<RoleDashboard role="investor" roles={['investor']} />);

		expect(
			screen.queryByRole('radiogroup', { name: 'Dashboard role' })
		).not.toBeInTheDocument();
	});

	test('requested role outside whitelist downgrades to first allowed role', () => {
		render(<RoleDashboard role="admin" roles={['investor', 'issuer']} />);

		expect(
			screen.getByRole('heading', { level: 1, name: 'Investor dashboard' })
		).toBeInTheDocument();
		expect(screen.queryByText(ADMIN_METRIC)).not.toBeInTheDocument();
	});

	test('invalid role renders unavailable boundary, never another widget set', () => {
		render(<RoleDashboard role={'spy' as never} />);

		expect(
			screen.getByRole('alert', { name: 'Dashboard unavailable' })
		).toBeInTheDocument();
		expect(screen.queryByText(INVESTOR_METRIC)).not.toBeInTheDocument();
		expect(screen.queryByText(ISSUER_METRIC)).not.toBeInTheDocument();
		expect(screen.queryByText(ADMIN_METRIC)).not.toBeInTheDocument();
	});

	test('widgetStatus overrides drive loading/empty/ready states', () => {
		render(
			<RoleDashboard
				widgetStatus={{
					'portfolio-value': 'loading',
					'allocation-snapshot': 'empty',
				}}
			/>
		);

		expect(screen.getByText('Loading')).toBeInTheDocument();
		expect(
			screen.getByRole('status', { name: 'Loading Portfolio value' })
		).toBeInTheDocument();

		expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
		expect(screen.getByText('No allocations yet.')).toBeInTheDocument();
	});

	test('widgetStatus error renders alert surface', () => {
		render(
			<RoleDashboard widgetStatus={{ 'portfolio-value': 'error' }} />
		);

		expect(
			screen.getByRole('alert', { name: 'Portfolio value error' })
		).toBeInTheDocument();
		expect(
			screen.getByText('This widget could not be loaded right now.')
		).toBeInTheDocument();
	});

	test('widgetData injects live content into widgets', () => {
		render(
			<RoleDashboard
				widgetData={{
					'portfolio-value': {
						kind: 'metrics',
						metrics: [{ label: 'Total value', value: '$9,999' }],
					},
				}}
			/>
		);

		expect(screen.getByText('$9,999')).toBeInTheDocument();
	});

	test('onboarding hint shows on first run with dismiss action', () => {
		render(<RoleDashboard />);

		expect(
			screen.getByRole('complementary', { name: 'Getting started' })
		).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole('button', {
				name: 'Dismiss Investor onboarding hint',
			})
		);

		expect(
			screen.queryByRole('complementary', { name: 'Getting started' })
		).not.toBeInTheDocument();
	});

	test('dismissOnboarding hides hint without user interaction', () => {
		render(<RoleDashboard dismissOnboarding />);

		expect(
			screen.queryByRole('complementary', { name: 'Getting started' })
		).not.toBeInTheDocument();
	});

	test('onboarding dismissal persists through injectable storage', () => {
		const storage: DashboardHintStorage = {
			read: () => null,
			write: () => {},
		};
		const writeSpy = vi.spyOn(storage, 'write');

		const { rerender } = render(<RoleDashboard storage={storage} />);
		fireEvent.click(
			screen.getByRole('button', {
				name: 'Dismiss Investor onboarding hint',
			})
		);
		expect(writeSpy).toHaveBeenCalledWith(
			'revora.dashboard-hint.investor',
			true
		);

		rerender(<RoleDashboard storage={{ read: () => true, write: () => {} }} />);
		expect(
			screen.queryByRole('complementary', { name: 'Getting started' })
		).not.toBeInTheDocument();
	});

	test('widgets expose slot classes and grid region', () => {
		render(<RoleDashboard role="admin" />);

		const grid = screen.getByTestId('role-dashboard-grid');
		expect(grid).toHaveAttribute(
			'aria-label',
			'Admin dashboard grid'
		);

		const cards = screen.getAllByRole('article');
		expect(cards.some((card) => card.classList.contains('rd-slot--primary'))).toBe(true);
		expect(cards.some((card) => card.classList.contains('rd-slot--secondary'))).toBe(true);
		expect(cards.some((card) => card.classList.contains('rd-slot--tertiary'))).toBe(true);
	});

	test.each(['investor', 'issuer', 'admin'] as const)(
		'%s dashboard passes axe with no violations',
		async (role) => {
			const { container } = render(<RoleDashboard role={role} />);
			const results = await axe(container);
			expect(results).toHaveNoViolations();
		}
	);

	test('loading and error states pass axe with no violations', async () => {
		const { container } = render(
			<RoleDashboard
				widgetStatus={{ 'portfolio-value': 'loading', 'performance-trend': 'error' }}
			/>
		);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});
});