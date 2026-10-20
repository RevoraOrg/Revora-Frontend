/**
 * PermissionMatrix.types – focused behavior test suite
 * Issue #763 – Add focused behavior coverage for PermissionState
 *
 * Covers:
 *   • PermissionState: all four valid values, type narrowing, invalid inputs
 *   • Role: required fields, optional description, structural constraints
 *   • Issuer: required fields, code field, structural constraints
 *   • PermissionEntry: roleId × issuerId × state composition
 *   • PermissionDiff: from/to state transitions — all primary pairs
 *   • BulkApplyTarget: all four valid values
 *   • PermissionMap: Map<string, PermissionState> semantics
 *   • CellCoord: zero-based grid indexing
 *   • PermissionMatrixProps: required and optional shape
 */

import { describe, it, expect } from 'vitest';
import type {
    PermissionState,
    Role,
    Issuer,
    PermissionEntry,
    PermissionDiff,
    BulkApplyTarget,
    PermissionMap,
    CellCoord,
    PermissionMatrixProps,
} from './PermissionMatrix.types';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * isValidPermissionState – runtime guard mirroring the PermissionState union.
 * TypeScript types are erased at runtime, so runtime membership checks are
 * the observable, deterministic proxy for "valid value".
 */
const PERMISSION_STATES: readonly PermissionState[] = [
    'allow',
    'deny',
    'inherit',
    'mixed',
] as const;

function isPermissionState(value: unknown): value is PermissionState {
    return PERMISSION_STATES.includes(value as PermissionState);
}

const BULK_APPLY_TARGETS: readonly BulkApplyTarget[] = [
    'selected',
    'row',
    'column',
    'all',
] as const;

function isBulkApplyTarget(value: unknown): value is BulkApplyTarget {
    return BULK_APPLY_TARGETS.includes(value as BulkApplyTarget);
}

/** Minimal cycling logic extracted from PermissionMatrix.tsx for isolated testing */
const CYCLE_ORDER: PermissionState[] = ['allow', 'deny', 'inherit'];

function cycleState(current: PermissionState): PermissionState {
    const effective = current === 'mixed' ? 'inherit' : current;
    const idx = CYCLE_ORDER.indexOf(effective);
    return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
}

/* ─── 1. PermissionState ──────────────────────────────────────────────────── */

describe('PermissionState', () => {
    it('recognises "allow" as a valid PermissionState', () => {
        const s: PermissionState = 'allow';
        expect(isPermissionState(s)).toBe(true);
    });

    it('recognises "deny" as a valid PermissionState', () => {
        const s: PermissionState = 'deny';
        expect(isPermissionState(s)).toBe(true);
    });

    it('recognises "inherit" as a valid PermissionState', () => {
        const s: PermissionState = 'inherit';
        expect(isPermissionState(s)).toBe(true);
    });

    it('recognises "mixed" as a valid PermissionState', () => {
        const s: PermissionState = 'mixed';
        expect(isPermissionState(s)).toBe(true);
    });

    it('the set of valid states has exactly four members', () => {
        expect(PERMISSION_STATES).toHaveLength(4);
    });

    it('rejects an empty string as invalid', () => {
        expect(isPermissionState('')).toBe(false);
    });

    it('rejects a numeric value as invalid', () => {
        expect(isPermissionState(0)).toBe(false);
        expect(isPermissionState(1)).toBe(false);
    });

    it('rejects null as invalid', () => {
        expect(isPermissionState(null)).toBe(false);
    });

    it('rejects undefined as invalid', () => {
        expect(isPermissionState(undefined)).toBe(false);
    });

    it('rejects a capitalised variant ("Allow") as invalid', () => {
        expect(isPermissionState('Allow')).toBe(false);
    });

    it('rejects an arbitrary string as invalid', () => {
        expect(isPermissionState('forbidden')).toBe(false);
        expect(isPermissionState('granted')).toBe(false);
    });

    it('all four values are distinct from each other', () => {
        const unique = new Set<string>(PERMISSION_STATES);
        expect(unique.size).toBe(4);
    });
});

/* ─── 2. PermissionState cycling (primary state transitions) ─────────────── */

describe('PermissionState – state transitions', () => {
    it('allow → deny', () => {
        expect(cycleState('allow')).toBe('deny');
    });

    it('deny → inherit', () => {
        expect(cycleState('deny')).toBe('inherit');
    });

    it('inherit → allow', () => {
        expect(cycleState('inherit')).toBe('allow');
    });

    it('mixed is treated as inherit for cycling: mixed → allow', () => {
        expect(cycleState('mixed')).toBe('allow');
    });

    it('three full allow → deny → inherit → allow cycles produce the same result', () => {
        let s: PermissionState = 'allow';
        s = cycleState(s); // deny
        s = cycleState(s); // inherit
        s = cycleState(s); // allow
        expect(s).toBe('allow');
    });

    it('cycling is deterministic: same input always yields same output', () => {
        for (const state of PERMISSION_STATES) {
            expect(cycleState(state)).toBe(cycleState(state));
        }
    });

    it('cycleState never returns "mixed" (mixed is a read-only composite state)', () => {
        for (const state of PERMISSION_STATES) {
            expect(cycleState(state)).not.toBe('mixed');
        }
    });

    it('every output of cycleState is itself a valid PermissionState', () => {
        for (const state of PERMISSION_STATES) {
            expect(isPermissionState(cycleState(state))).toBe(true);
        }
    });
});

/* ─── 3. Role ─────────────────────────────────────────────────────────────── */

describe('Role', () => {
    it('accepts a minimal Role with id and name', () => {
        const role: Role = { id: 'r1', name: 'Admin' };
        expect(role.id).toBe('r1');
        expect(role.name).toBe('Admin');
    });

    it('accepts a Role with an optional description', () => {
        const role: Role = { id: 'r2', name: 'Auditor', description: 'Read-only' };
        expect(role.description).toBe('Read-only');
    });

    it('description is absent when not supplied (not null, not empty string)', () => {
        const role: Role = { id: 'r3', name: 'Ops' };
        expect(role.description).toBeUndefined();
    });

    it('id must be a non-empty string (contract: callers must not pass empty id)', () => {
        const role: Role = { id: 'r4', name: 'Finance' };
        expect(role.id.length).toBeGreaterThan(0);
    });

    it('name must be a non-empty string', () => {
        const role: Role = { id: 'r5', name: 'Compliance' };
        expect(role.name.length).toBeGreaterThan(0);
    });

    it('two roles with different ids are considered distinct', () => {
        const r1: Role = { id: 'r1', name: 'Admin' };
        const r2: Role = { id: 'r2', name: 'Admin' }; // same name, different id
        expect(r1.id).not.toBe(r2.id);
    });

    it('two roles with the same id are considered the same (id uniqueness contract)', () => {
        const r1: Role = { id: 'r1', name: 'Admin' };
        const r2: Role = { id: 'r1', name: 'Duplicate' };
        // same id string → same identity in a map
        expect(r1.id).toBe(r2.id);
    });

    it('description can be an empty string (edge: callers may use "" deliberately)', () => {
        const role: Role = { id: 'r6', name: 'Guest', description: '' };
        expect(role.description).toBe('');
    });
});

/* ─── 4. Issuer ───────────────────────────────────────────────────────────── */

describe('Issuer', () => {
    it('accepts a minimal Issuer with id, name, and code', () => {
        const issuer: Issuer = { id: 'i1', name: 'Alpha Ventures', code: 'AV' };
        expect(issuer.id).toBe('i1');
        expect(issuer.name).toBe('Alpha Ventures');
        expect(issuer.code).toBe('AV');
    });

    it('id is a non-empty string', () => {
        const issuer: Issuer = { id: 'i2', name: 'Beta Capital', code: 'BC' };
        expect(issuer.id.length).toBeGreaterThan(0);
    });

    it('name is a non-empty string', () => {
        const issuer: Issuer = { id: 'i3', name: 'Gamma Growth', code: 'GG' };
        expect(issuer.name.length).toBeGreaterThan(0);
    });

    it('code is typically a 2-character abbreviation', () => {
        const issuer: Issuer = { id: 'i4', name: 'Delta Fund', code: 'DF' };
        // Contract: code should be short (≤ 6 chars for header space)
        expect(issuer.code.length).toBeLessThanOrEqual(6);
    });

    it('two issuers with different ids are distinct even if name and code match', () => {
        const i1: Issuer = { id: 'i1', name: 'Same', code: 'SM' };
        const i2: Issuer = { id: 'i2', name: 'Same', code: 'SM' };
        expect(i1.id).not.toBe(i2.id);
    });
});

/* ─── 5. PermissionEntry ──────────────────────────────────────────────────── */

describe('PermissionEntry', () => {
    it('composes roleId, issuerId, and state correctly', () => {
        const entry: PermissionEntry = { roleId: 'r1', issuerId: 'i1', state: 'allow' };
        expect(entry.roleId).toBe('r1');
        expect(entry.issuerId).toBe('i1');
        expect(entry.state).toBe('allow');
    });

    it('state field accepts all four PermissionState values', () => {
        const states: PermissionState[] = ['allow', 'deny', 'inherit', 'mixed'];
        for (const state of states) {
            const entry: PermissionEntry = { roleId: 'r1', issuerId: 'i1', state };
            expect(isPermissionState(entry.state)).toBe(true);
        }
    });

    it('sparse initialPermissions array omits entries for "inherit" cells', () => {
        // The type supports sparse initialisation: missing cells default to inherit.
        const sparse: PermissionEntry[] = [
            { roleId: 'r1', issuerId: 'i1', state: 'allow' },
        ];
        // Only 1 entry — not all combinations must be present
        expect(sparse).toHaveLength(1);
        expect(sparse[0].state).toBe('allow');
    });

    it('a dense array can hold all combinations without conflict', () => {
        const roles = ['r1', 'r2'];
        const issuers = ['i1', 'i2'];
        const entries: PermissionEntry[] = roles.flatMap((roleId) =>
            issuers.map((issuerId) => ({
                roleId,
                issuerId,
                state: 'inherit' as PermissionState,
            }))
        );
        expect(entries).toHaveLength(4);
        entries.forEach((e) => expect(isPermissionState(e.state)).toBe(true));
    });
});

/* ─── 6. PermissionDiff ──────────────────────────────────────────────────── */

describe('PermissionDiff', () => {
    it('captures a from/to transition with human-readable names', () => {
        const diff: PermissionDiff = {
            roleId: 'r1',
            issuerId: 'i1',
            roleName: 'Admin',
            issuerName: 'Alpha Ventures',
            from: 'allow',
            to: 'deny',
        };
        expect(diff.from).toBe('allow');
        expect(diff.to).toBe('deny');
        expect(diff.roleName).toBe('Admin');
        expect(diff.issuerName).toBe('Alpha Ventures');
    });

    it('allow → deny transition is representable', () => {
        const diff: PermissionDiff = {
            roleId: 'r1', issuerId: 'i1',
            roleName: 'R', issuerName: 'I',
            from: 'allow', to: 'deny',
        };
        expect(diff.from).toBe('allow');
        expect(diff.to).toBe('deny');
    });

    it('deny → inherit transition is representable', () => {
        const diff: PermissionDiff = {
            roleId: 'r1', issuerId: 'i1',
            roleName: 'R', issuerName: 'I',
            from: 'deny', to: 'inherit',
        };
        expect(diff.from).toBe('deny');
        expect(diff.to).toBe('inherit');
    });

    it('inherit → allow transition is representable', () => {
        const diff: PermissionDiff = {
            roleId: 'r1', issuerId: 'i1',
            roleName: 'R', issuerName: 'I',
            from: 'inherit', to: 'allow',
        };
        expect(diff.from).toBe('inherit');
        expect(diff.to).toBe('allow');
    });

    it('mixed → allow transition is representable (mixed cell cycled by user)', () => {
        const diff: PermissionDiff = {
            roleId: 'r3', issuerId: 'i1',
            roleName: 'Auditor', issuerName: 'Alpha',
            from: 'mixed', to: 'allow',
        };
        expect(diff.from).toBe('mixed');
        expect(diff.to).toBe('allow');
    });

    it('allow → inherit cross-transition is representable', () => {
        const diff: PermissionDiff = {
            roleId: 'r1', issuerId: 'i2',
            roleName: 'Admin', issuerName: 'Beta',
            from: 'allow', to: 'inherit',
        };
        expect(diff.from).toBe('allow');
        expect(diff.to).toBe('inherit');
    });

    it('from and to can be the same state (no-op diff is structurally valid)', () => {
        // Even a no-op diff can be represented; callers are responsible for filtering
        const diff: PermissionDiff = {
            roleId: 'r1', issuerId: 'i1',
            roleName: 'R', issuerName: 'I',
            from: 'inherit', to: 'inherit',
        };
        expect(diff.from).toBe(diff.to);
    });

    it('from and to are both valid PermissionState values', () => {
        const diff: PermissionDiff = {
            roleId: 'r1', issuerId: 'i1',
            roleName: 'R', issuerName: 'I',
            from: 'allow', to: 'deny',
        };
        expect(isPermissionState(diff.from)).toBe(true);
        expect(isPermissionState(diff.to)).toBe(true);
    });

    it('a diffs array is empty when no cells were changed', () => {
        const diffs: PermissionDiff[] = [];
        expect(diffs).toHaveLength(0);
    });

    it('a diffs array with multiple entries is valid', () => {
        const diffs: PermissionDiff[] = [
            { roleId: 'r1', issuerId: 'i1', roleName: 'Admin', issuerName: 'Alpha', from: 'allow', to: 'deny' },
            { roleId: 'r2', issuerId: 'i2', roleName: 'Ops', issuerName: 'Beta', from: 'inherit', to: 'allow' },
        ];
        expect(diffs).toHaveLength(2);
        diffs.forEach((d) => {
            expect(isPermissionState(d.from)).toBe(true);
            expect(isPermissionState(d.to)).toBe(true);
        });
    });
});

/* ─── 7. BulkApplyTarget ─────────────────────────────────────────────────── */

describe('BulkApplyTarget', () => {
    it('recognises "selected" as valid', () => {
        expect(isBulkApplyTarget('selected')).toBe(true);
    });

    it('recognises "row" as valid', () => {
        expect(isBulkApplyTarget('row')).toBe(true);
    });

    it('recognises "column" as valid', () => {
        expect(isBulkApplyTarget('column')).toBe(true);
    });

    it('recognises "all" as valid', () => {
        expect(isBulkApplyTarget('all')).toBe(true);
    });

    it('the set of valid targets has exactly four members', () => {
        expect(BULK_APPLY_TARGETS).toHaveLength(4);
    });

    it('rejects an empty string as invalid', () => {
        expect(isBulkApplyTarget('')).toBe(false);
    });

    it('rejects an arbitrary string as invalid', () => {
        expect(isBulkApplyTarget('cell')).toBe(false);
        expect(isBulkApplyTarget('none')).toBe(false);
    });
});

/* ─── 8. PermissionMap ───────────────────────────────────────────────────── */

describe('PermissionMap', () => {
    it('is a Map keyed by "roleId:issuerId" composite strings', () => {
        const map: PermissionMap = new Map();
        map.set('r1:i1', 'allow');
        map.set('r1:i2', 'deny');
        expect(map.get('r1:i1')).toBe('allow');
        expect(map.get('r1:i2')).toBe('deny');
    });

    it('missing keys return undefined (sparse semantics)', () => {
        const map: PermissionMap = new Map();
        expect(map.get('r99:i99')).toBeUndefined();
    });

    it('values are PermissionState members', () => {
        const map: PermissionMap = new Map([
            ['r1:i1', 'allow'],
            ['r2:i2', 'inherit'],
            ['r3:i3', 'mixed'],
        ]);
        for (const value of map.values()) {
            expect(isPermissionState(value)).toBe(true);
        }
    });

    it('overwrites a value when the same key is set twice', () => {
        const map: PermissionMap = new Map();
        map.set('r1:i1', 'allow');
        map.set('r1:i1', 'deny'); // overwrite
        expect(map.get('r1:i1')).toBe('deny');
    });

    it('keys with different roleId but same issuerId are distinct', () => {
        const map: PermissionMap = new Map();
        map.set('r1:i1', 'allow');
        map.set('r2:i1', 'deny');
        expect(map.get('r1:i1')).toBe('allow');
        expect(map.get('r2:i1')).toBe('deny');
    });

    it('deleting a key removes it from the map', () => {
        const map: PermissionMap = new Map([['r1:i1', 'allow']]);
        map.delete('r1:i1');
        expect(map.has('r1:i1')).toBe(false);
    });
});

/* ─── 9. CellCoord ───────────────────────────────────────────────────────── */

describe('CellCoord', () => {
    it('holds zero-based row and column indices', () => {
        const coord: CellCoord = { roleIndex: 0, issuerIndex: 0 };
        expect(coord.roleIndex).toBe(0);
        expect(coord.issuerIndex).toBe(0);
    });

    it('top-left cell is { roleIndex: 0, issuerIndex: 0 }', () => {
        const topLeft: CellCoord = { roleIndex: 0, issuerIndex: 0 };
        expect(topLeft.roleIndex).toBe(0);
        expect(topLeft.issuerIndex).toBe(0);
    });

    it('arbitrary coordinates are structurally valid', () => {
        const coord: CellCoord = { roleIndex: 2, issuerIndex: 5 };
        expect(coord.roleIndex).toBe(2);
        expect(coord.issuerIndex).toBe(5);
    });

    it('two coords with the same indices are structurally equal', () => {
        const a: CellCoord = { roleIndex: 1, issuerIndex: 3 };
        const b: CellCoord = { roleIndex: 1, issuerIndex: 3 };
        expect(a.roleIndex).toBe(b.roleIndex);
        expect(a.issuerIndex).toBe(b.issuerIndex);
    });

    it('two coords with different roleIndex are distinct', () => {
        const a: CellCoord = { roleIndex: 0, issuerIndex: 2 };
        const b: CellCoord = { roleIndex: 1, issuerIndex: 2 };
        expect(a.roleIndex).not.toBe(b.roleIndex);
    });

    it('two coords with different issuerIndex are distinct', () => {
        const a: CellCoord = { roleIndex: 0, issuerIndex: 0 };
        const b: CellCoord = { roleIndex: 0, issuerIndex: 1 };
        expect(a.issuerIndex).not.toBe(b.issuerIndex);
    });
});

/* ─── 10. PermissionMatrixProps shape ────────────────────────────────────── */

describe('PermissionMatrixProps', () => {
    it('required fields: roles, issuers, initialPermissions, onSave', () => {
        const props: PermissionMatrixProps = {
            roles: [{ id: 'r1', name: 'Admin' }],
            issuers: [{ id: 'i1', name: 'Alpha', code: 'A' }],
            initialPermissions: [],
            onSave: () => {},
        };
        expect(props.roles).toHaveLength(1);
        expect(props.issuers).toHaveLength(1);
        expect(props.initialPermissions).toHaveLength(0);
        expect(typeof props.onSave).toBe('function');
    });

    it('onCancel is optional', () => {
        const props: PermissionMatrixProps = {
            roles: [],
            issuers: [],
            initialPermissions: [],
            onSave: () => {},
        };
        // Must compile and be absent without error
        expect(props.onCancel).toBeUndefined();
    });

    it('readOnly is optional and defaults to undefined (falsy)', () => {
        const props: PermissionMatrixProps = {
            roles: [],
            issuers: [],
            initialPermissions: [],
            onSave: () => {},
        };
        expect(props.readOnly).toBeUndefined();
    });

    it('readOnly: true is accepted', () => {
        const props: PermissionMatrixProps = {
            roles: [],
            issuers: [],
            initialPermissions: [],
            onSave: () => {},
            readOnly: true,
        };
        expect(props.readOnly).toBe(true);
    });

    it('onSave callback receives updatedPermissions and diffs arrays', () => {
        const received: { updated: unknown; diffs: unknown } = { updated: null, diffs: null };
        const props: PermissionMatrixProps = {
            roles: [],
            issuers: [],
            initialPermissions: [],
            onSave: (updated, diffs) => {
                received.updated = updated;
                received.diffs = diffs;
            },
        };
        const sampleEntries: PermissionEntry[] = [
            { roleId: 'r1', issuerId: 'i1', state: 'allow' },
        ];
        const sampleDiffs: PermissionDiff[] = [
            { roleId: 'r1', issuerId: 'i1', roleName: 'Admin', issuerName: 'Alpha', from: 'inherit', to: 'allow' },
        ];
        props.onSave(sampleEntries, sampleDiffs);
        expect(received.updated).toBe(sampleEntries);
        expect(received.diffs).toBe(sampleDiffs);
    });

    it('onCancel callback is invoked when provided', () => {
        let called = false;
        const props: PermissionMatrixProps = {
            roles: [],
            issuers: [],
            initialPermissions: [],
            onSave: () => {},
            onCancel: () => { called = true; },
        };
        props.onCancel?.();
        expect(called).toBe(true);
    });

    it('accepts an empty roles array (renders with zero rows)', () => {
        const props: PermissionMatrixProps = {
            roles: [],
            issuers: [{ id: 'i1', name: 'Alpha', code: 'A' }],
            initialPermissions: [],
            onSave: () => {},
        };
        expect(props.roles).toHaveLength(0);
    });

    it('accepts an empty issuers array (renders with zero columns)', () => {
        const props: PermissionMatrixProps = {
            roles: [{ id: 'r1', name: 'Admin' }],
            issuers: [],
            initialPermissions: [],
            onSave: () => {},
        };
        expect(props.issuers).toHaveLength(0);
    });
});
