import { describe, test, expect, expectTypeOf } from 'vitest';
import {
	DASHBOARD_ROLES,
	GRID_COLUMNS,
	SLOT_SPAN,
	WIDGET_SLOTS,
	isUserRole,
} from './roleDashboard.types';
import type {
	DashboardSlot,
	DashboardWidget,
	DashboardWidgetStatus,
	RoleDashboardConfig,
	UserRole,
} from './roleDashboard.types';

const KNOWN_ROLES = ['investor', 'issuer', 'admin'] as const;

const WIDGET_STATUSES: readonly DashboardWidgetStatus[] = [
	'loading',
	'error',
	'empty',
	'ready',
];

const TERMINAL_STATUSES: readonly DashboardWidgetStatus[] = [
	'error',
	'empty',
	'ready',
];

describe('UserRole contract', () => {
	test('is exactly the three canonical role literals', () => {
		expectTypeOf<UserRole>().toEqualTypeOf<'investor' | 'issuer' | 'admin'>();
	});

	test('DASHBOARD_ROLES enumerates the canonical roles in order', () => {
		expect(DASHBOARD_ROLES).toEqual(['investor', 'issuer', 'admin']);
	});

	test('DASHBOARD_ROLES is the single source of truth (no dupes, full coverage)', () => {
		expect(new Set(DASHBOARD_ROLES).size).toBe(DASHBOARD_ROLES.length);
		expect([...DASHBOARD_ROLES].sort()).toEqual([...KNOWN_ROLES].sort());
	});
});

describe('isUserRole', () => {
	test.each(DASHBOARD_ROLES)('accepts the known role %s', (role) => {
		expect(isUserRole(role)).toBe(true);
	});

	test('accepts every entry in DASHBOARD_ROLES', () => {
		for (const role of DASHBOARD_ROLES) {
			expect(isUserRole(role)).toBe(true);
		}
	});

	test('success path narrows the value to UserRole', () => {
		const value: unknown = 'issuer';

		expect(isUserRole(value)).toBe(true);
		if (isUserRole(value)) {
			expectTypeOf(value).toEqualTypeOf<UserRole>();
		}
	});

	describe('representative invalid inputs', () => {
		const invalidInputs: Array<[string, unknown]> = [
			['undefined', undefined],
			['null', null],
			['empty string', ''],
			['whitespace-only string', '   '],
			['unknown role string', 'superadmin'],
			['mixed case', 'Investor'],
			['surrounding whitespace', ' investor '],
			['pluralised role', 'investors'],
			['zero', 0],
			['NaN', Number.NaN],
			['boolean true', true],
			['boolean false', false],
			['plain object', {}],
			['array of roles', ['investor']],
			['function', () => 'investor'],
			['symbol', Symbol('investor')],
			['object with toString', { toString: () => 'investor' }],
			['prototype key __proto__', '__proto__'],
			['Object.prototype key constructor', 'constructor'],
			['Object.prototype key toString', 'toString'],
			['date', new Date()],
			['boxed string', Object('investor')],
		];

		test.each(invalidInputs)('rejects %s', (_label, value) => {
			expect(isUserRole(value)).toBe(false);
		});

		test('rejects an object whose properties would throw if read', () => {
			const hostile = {
				get value(): never {
					throw new Error('isUserRole must not read object properties');
				},
			};

			expect(() => isUserRole(hostile)).not.toThrow();
			expect(isUserRole(hostile)).toBe(false);
		});

		test('rejects an object that merely inherits a role field', () => {
			expect(isUserRole(Object.create({ role: 'admin' }))).toBe(false);
		});
	});
});

describe('shared grid contract', () => {
	test('GRID_COLUMNS is the 12-column shared grid', () => {
		expect(GRID_COLUMNS).toBe(12);
	});

	test('SLOT_SPAN defines a positive integer span for every slot', () => {
		expect(Object.keys(SLOT_SPAN).sort()).toEqual([
			'primary',
			'secondary',
			'tertiary',
		]);

		for (const span of Object.values(SLOT_SPAN)) {
			expect(Number.isInteger(span)).toBe(true);
			expect(span).toBeGreaterThan(0);
		}
	});

	test('slot spans fill the grid exactly (no overflow, no gap)', () => {
		const total = Object.values(SLOT_SPAN).reduce((sum, span) => sum + span, 0);
		expect(total).toBe(GRID_COLUMNS);
	});

	test('WIDGET_SLOTS mirrors the SLOT_SPAN keys in declaration order', () => {
		expect(WIDGET_SLOTS).toEqual(Object.keys(SLOT_SPAN));
		expectTypeOf(WIDGET_SLOTS).toEqualTypeOf<DashboardSlot[]>();
	});
});

describe('widget state machine', () => {
	test('is exactly loading, error, empty and ready', () => {
		expectTypeOf<DashboardWidgetStatus>().toEqualTypeOf<
			'loading' | 'error' | 'empty' | 'ready'
		>();
		expect(new Set(WIDGET_STATUSES).size).toBe(WIDGET_STATUSES.length);
	});

	test.each(WIDGET_STATUSES)(
		'a widget may be constructed in the %s state',
		(status) => {
			const widget: DashboardWidget = {
				id: 'portfolio-value',
				title: 'Portfolio value',
				slot: 'primary',
				status,
			};

			expect(widget.status).toBe(status);
		}
	);

	test('loading settles into exactly one terminal state', () => {
		for (const terminal of TERMINAL_STATUSES) {
			expect(WIDGET_STATUSES).toContain(terminal);
			expect(terminal).not.toBe('loading');
		}
	});

	test('every documented transition stays inside the state machine', () => {
		const transitions: Record<
			DashboardWidgetStatus,
			readonly DashboardWidgetStatus[]
		> = {
			loading: ['error', 'empty', 'ready'],
			error: ['loading'],
			empty: ['loading', 'ready'],
			ready: ['loading'],
		};

		for (const [from, targets] of Object.entries(transitions)) {
			expect(WIDGET_STATUSES).toContain(from as DashboardWidgetStatus);
			for (const target of targets) {
				expect(WIDGET_STATUSES).toContain(target);
			}
		}
	});

	test('rejects an unknown status at the type level', () => {
		const widget: DashboardWidget = {
			id: 'portfolio-value',
			title: 'Portfolio value',
			slot: 'primary',
			// @ts-expect-error status is closed to the four known states
			status: 'stale',
		};

		expect(widget.status as string).toBe('stale');
	});
});

describe('DashboardSlot and widget composition contract', () => {
	test('slots are primary, secondary or tertiary', () => {
		expectTypeOf<DashboardSlot>().toEqualTypeOf<
			'primary' | 'secondary' | 'tertiary'
		>();
	});

	test('a fully-populated RoleDashboardConfig is well formed', () => {
		const config: RoleDashboardConfig = {
			role: 'investor',
			heading: 'Investor dashboard',
			description: 'A summary of your portfolio.',
			summary: 'Overview',
			onboarding: {
				title: 'Getting started',
				body: 'Track your allocations here.',
			},
			widgets: [
				{
					id: 'portfolio-value',
					title: 'Portfolio value',
					slot: 'primary',
					status: 'ready',
				},
				{
					id: 'allocation-snapshot',
					title: 'Allocation snapshot',
					slot: 'secondary',
					status: 'empty',
					emptyMessage: 'No allocations yet.',
				},
			],
		};

		expect(isUserRole(config.role)).toBe(true);
		expect(config.widgets).toHaveLength(2);
		expect(config.widgets.map((widget) => widget.status)).toEqual([
			'ready',
			'empty',
		]);
	});
});
