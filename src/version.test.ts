import {readFileSync} from 'node:fs';

import {describe, expect, it} from 'vitest';

import {version} from './version';

const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as {version: string};

describe('version', () => {
    it('matches the package version', () => {
        expect(version).toBe(packageJson.version);
    });
});
