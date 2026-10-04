import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import dts from 'vite-plugin-dts';
import {defineConfig} from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
    readFileSync(resolve(__dirname, 'package.json'), 'utf8')
) as {version: string};

export default defineConfig({
    define: {
        __RAFPULSE_VERSION__: JSON.stringify(packageJson.version),
    },

    plugins: [
        dts({
            entryRoot: 'src',
            outDirs: ['dist'],
            include: ['src'],
            exclude: ['src/**/*.test.ts'],
        }),
    ],

    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },

    build: {
        emptyOutDir: true,
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'RafPulse',
            fileName: 'index',
            formats: ['es', 'cjs'],
        },
        sourcemap: true,
    },

    test: {
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json'],
            reportsDirectory: './coverage',
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/**/index.ts'],
        },
    },
});
