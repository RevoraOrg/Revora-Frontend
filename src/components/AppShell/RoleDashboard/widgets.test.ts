import {
	ROLE_CONFIGS,
	ROLE_WIDGET_IDS,
	INVESTOR_WIDGETS,
	ISSUER_WIDGETS,
	ADMIN_WIDGETS,
	DEFAULT_WIDGET_CONTENT,
	getRoleDashboardConfig,
	widgetTitle,
} from './widgets';
import { DASHBOARD_ROLES, SLOT_SPAN, isUserRole } from './roleDashboard.types';

describe('RoleDashboard widgets registry', () => {
	test('ROLE_CONFIGS covers exactly the canonical roles', () => {
		expect(Object.keys(ROLE_CONFIGS).sort()).toEqual(
			[...DASHBOARD_ROLES].sort()
		);
	});

	test.each(DASHBOARD_ROLES as ReadonlyArray<'investor' | 'issuer' | 'admin'>)(
		'%s config defines heading, summary, description and onboarding',
		(role) => {
			const config = ROLE_CONFIGS[role];

			expect(config.role).toBe(role);
			expect(config.heading.length).toBeGreaterThan(0);
			expect(config.summary.length).toBeGreaterThan(0);
			expect(config.description.length).toBeGreaterThan(0);
			expect(config.onboarding.title.length).toBeGreaterThan(0);
			expect(config.onboarding.body.length).toBeGreaterThan(0);
		}
	);

	test('every role composes three widgets with valid slots and ready default', () => {
		for (const role of DASHBOARD_ROLES) {
			const config = ROLE_CONFIGS[role];
			expect(config.widgets).toHaveLength(3);

			const ids = config.widgets.map((w) => w.id);
			expect(new Set(ids).size).toBe(3);

			for (const widget of config.widgets) {
				expect(Object.prototype.hasOwnProperty.call(SLOT_SPAN, widget.slot)).toBe(true);
				expect(widget.status).toBe('ready');
				expect(isUserRole(config.role)).toBe(true);
			}
		}
	});

	test('per-role widget sets are role-specific', () => {
		expect(INVESTOR_WIDGETS.map((w) => w.id)).toEqual([
			'portfolio-value',
			'allocation-snapshot',
			'performance-trend',
		]);
		expect(ISSUER_WIDGETS.map((w) => w.id)).toEqual([
			'fundraising-progress',
			'revenue-reports',
			'upcoming-payouts',
		]);
		expect(ADMIN_WIDGETS.map((w) => w.id)).toEqual([
			'oversight-incidents',
			'kyc-queue',
			'network-health',
		]);

		const investor = new Set(INVESTOR_WIDGETS.map((w) => w.id));
		const issuer = new Set(ISSUER_WIDGETS.map((w) => w.id));
		const admin = new Set(ADMIN_WIDGETS.map((w) => w.id));
		expect([...investor].some((id) => issuer.has(id))).toBe(false);
		expect([...admin].some((id) => investor.has(id) || issuer.has(id))).toBe(false);
	});

	test('ROLE_WIDGET_IDS matches each config widget order', () => {
		for (const role of DASHBOARD_ROLES) {
			expect(ROLE_WIDGET_IDS[role]).toEqual(
				ROLE_CONFIGS[role].widgets.map((w) => w.id)
			);
		}
	});

	test.each(DASHBOARD_ROLES as ReadonlyArray<'investor' | 'issuer' | 'admin'>)(
		'default content is defined for every %s widget',
		(role) => {
			for (const id of ROLE_WIDGET_IDS[role]) {
				const content = DEFAULT_WIDGET_CONTENT[id];
				expect(content).toBeDefined();
				expect(['metrics', 'rows', 'progress']).toContain(content.kind);
			}
		}
	);

	test('getRoleDashboardConfig returns the same config as the registry', () => {
		expect(getRoleDashboardConfig('issuer')).toBe(ROLE_CONFIGS.issuer);
	});

	test('widgetTitle resolves a title for known ids', () => {
		expect(widgetTitle('portfolio-value')).toBe('Portfolio value');
		expect(widgetTitle('kyc-queue')).toBe('KYC queue');
	});

	test('widgetTitle falls back to empty string for unknown ids', () => {
		expect(widgetTitle('no-such-widget' as never)).toBe('');
	});
});