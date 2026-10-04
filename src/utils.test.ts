import {describe, expect, it} from 'vitest';

import RAF from './raf';
import {
    assertSameScope,
    getSymbolKey,
    getVersionScope,
    isObsolete,
} from './utils';

describe('getVersionScope', () => {
    it('groups stable versions by major version', () => {
        expect(getVersionScope('1.0.0')).toEqual({
            type: 'stable',
            major: 1,
        });

        expect(getVersionScope('1.42.99')).toEqual({
            type: 'stable',
            major: 1,
        });

        expect(getVersionScope('2.0.0')).toEqual({
            type: 'stable',
            major: 2,
        });
    });

    it('isolates prerelease versions by their full version', () => {
        expect(getVersionScope('1.2.3-beta.1')).toEqual({
            type: 'prerelease',
            version: '1.2.3-beta.1',
        });
    });

    it('does not treat build metadata as a stable version', () => {
        expect(getVersionScope('1.2.3+build.1')).toEqual({
            type: 'prerelease',
            version: '1.2.3+build.1',
        });
    });
});

describe('getSymbolKey', () => {
    it('returns the same symbol for stable versions of the same major', () => {
        const first = getSymbolKey(getVersionScope('1.0.0'));
        const second = getSymbolKey(getVersionScope('1.99.99'));

        expect(first).toBe(second);
    });

    it('returns different symbols for different major versions', () => {
        const first = getSymbolKey(getVersionScope('1.99.99'));
        const second = getSymbolKey(getVersionScope('2.0.0'));

        expect(first).not.toBe(second);
    });

    it('returns different symbols for different prerelease versions', () => {
        const first = getSymbolKey(getVersionScope('1.0.0-beta.1'));
        const second = getSymbolKey(getVersionScope('1.0.0-beta.2'));

        expect(first).not.toBe(second);
    });

    it('isolates prerelease versions from stable versions', () => {
        const prerelease = getSymbolKey(getVersionScope('1.0.0-beta.1'));
        const stable = getSymbolKey(getVersionScope('1.0.0'));

        expect(prerelease).not.toBe(stable);
    });

    it('returns the same symbol for the same prerelease version', () => {
        const first = getSymbolKey(getVersionScope('1.0.0-beta.1'));
        const second = getSymbolKey(getVersionScope('1.0.0-beta.1'));

        expect(first).toBe(second);
    });
});

describe('assertSameScope', () => {
    it('accepts identical stable scopes', () => {
        expect(() =>
            assertSameScope(
                {type: 'stable', major: 1},
                {type: 'stable', major: 1}
            )
        ).not.toThrow();
    });

    it('accepts identical prerelease scopes', () => {
        expect(() =>
            assertSameScope(
                {
                    type: 'prerelease',
                    version: '1.0.0-beta.1',
                },
                {
                    type: 'prerelease',
                    version: '1.0.0-beta.1',
                }
            )
        ).not.toThrow();
    });

    it('rejects different stable majors', () => {
        expect(() =>
            assertSameScope(
                {type: 'stable', major: 1},
                {type: 'stable', major: 2}
            )
        ).toThrow(/incompatible versions/);
    });

    it('rejects different prerelease versions', () => {
        expect(() =>
            assertSameScope(
                {
                    type: 'prerelease',
                    version: '1.0.0-beta.1',
                },
                {
                    type: 'prerelease',
                    version: '1.0.0-beta.2',
                }
            )
        ).toThrow(/incompatible versions/);
    });

    it('rejects stable and prerelease scopes', () => {
        expect(() =>
            assertSameScope(
                {type: 'stable', major: 1},
                {
                    type: 'prerelease',
                    version: '1.0.0-beta.1',
                }
            )
        ).toThrow(/incompatible versions/);
    });
});

describe('isObsolete', () => {
    it('detects a newer patch version', () => {
        const raf = new RAF('1.2.3');

        expect(isObsolete(raf, '1.2.4')).toBe(true);
    });

    it('detects a newer minor version', () => {
        const raf = new RAF('1.2.99');

        expect(isObsolete(raf, '1.3.0')).toBe(true);
    });

    it('does not replace the same version', () => {
        const raf = new RAF('1.2.3');

        expect(isObsolete(raf, '1.2.3')).toBe(false);
    });

    it('does not replace a newer patch version with an older one', () => {
        const raf = new RAF('1.2.4');

        expect(isObsolete(raf, '1.2.3')).toBe(false);
    });

    it('does not replace a newer minor version with an older one', () => {
        const raf = new RAF('1.3.0');

        expect(isObsolete(raf, '1.2.99')).toBe(false);
    });

    it('does not implicitly upgrade prerelease versions', () => {
        const raf = new RAF('1.0.0-beta.1');

        expect(isObsolete(raf, '1.0.0-beta.1')).toBe(false);
    });
});
