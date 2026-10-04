/**
 * rafpulse package version injected at build time.
 *
 * The value is taken from `package.json` by the Vite build configuration and
 * replaced with a string literal during bundling. This avoids reading
 * `package.json` at runtime and keeps the published bundle self-contained.
 */
declare const __RAFPULSE_VERSION__: string;

/**
 * Version of the currently loaded rafpulse package.
 *
 * This value is embedded into the bundle at build time and is used internally
 * for version-scope isolation and compatible scheduler upgrades.
 */
export const version = __RAFPULSE_VERSION__;
