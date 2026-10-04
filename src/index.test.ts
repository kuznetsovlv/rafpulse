import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {addSpice, init, removeSpice, start, stop} from './index';
import type {GlobalEntry, VersionScope} from './types';
import {getSymbolKey, getVersionScope} from './utils';
import {version} from './version';

const SCOPE = getVersionScope(version);
const KEY = getSymbolKey(SCOPE);

type TestGlobal = typeof globalThis & {
    [KEY]?: GlobalEntry;
};

const global = globalThis as TestGlobal;

describe('public API', () => {
    beforeEach(() => {
        delete global[KEY];

        vi.stubGlobal(
            'requestAnimationFrame',
            vi.fn(() => 1)
        );

        vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });

    afterEach(() => {
        delete global[KEY];
        vi.unstubAllGlobals();
    });

    it('initializes the shared RAF entry', () => {
        expect(global[KEY]).toBeUndefined();

        init();

        expect(global[KEY]).toBeDefined();
        expect(global[KEY]?.scope).toEqual(SCOPE);
        expect(global[KEY]?.raf.version).toBe(version);
    });

    it('does not create another RAF entry when initialized repeatedly', () => {
        init();

        const first = global[KEY]?.raf;

        init();

        expect(global[KEY]?.raf).toBe(first);
    });

    it('starts the shared RAF', () => {
        start();

        expect(global[KEY]?.raf.processing).toBe(true);
        expect(requestAnimationFrame).toHaveBeenCalledOnce();
    });

    it('does not initialize the RAF when stopped before initialization', () => {
        stop();

        expect(global[KEY]).toBeUndefined();
    });

    it('initializes the RAF when adding a spice', () => {
        const spice = vi.fn();

        addSpice(spice);

        expect(global[KEY]).toBeDefined();
        expect(global[KEY]?.raf.spices.has(spice)).toBe(true);
    });

    it('does not initialize the RAF when removing a spice before initialization', () => {
        removeSpice(vi.fn());

        expect(global[KEY]).toBeUndefined();
    });

    it('removes a spice from the shared RAF', () => {
        const spice = vi.fn();

        addSpice(spice);
        removeSpice(spice);

        expect(global[KEY]?.raf.spices.has(spice)).toBe(false);
    });

    it('fails when the stored entry has an incompatible scope', () => {
        const incompatibleScope: VersionScope =
            SCOPE.type === 'stable'
                ? {
                      type: 'stable',
                      major: SCOPE.major + 1,
                  }
                : {
                      type: 'prerelease',
                      version: `${SCOPE.version}-different`,
                  };

        init();

        global[KEY] = {
            ...global[KEY]!,
            scope: incompatibleScope,
        };

        expect(() => init()).toThrow(/incompatible versions/);
    });
});
