import {describe, expect, it} from 'vitest';

import {version} from './version';

describe('version', () => {
    it('exports a valid semantic version', () => {
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
});
