import type RAF from './raf';

/**
 * A function invoked on every animation frame while the rafpulse loop
 * is running.
 *
 * @param timestamp - High-resolution timestamp supplied by
 * `requestAnimationFrame`.
 */
export type Spice = (timestamp: DOMHighResTimeStamp) => void;

/**
 * Parsed components of a stable `major.minor.patch` version.
 */
export type ParsedVersion = [major: number, minor: number, patch: number];

/**
 * Defines which rafpulse instances are allowed to share a global scheduler.
 *
 * Stable releases share a scope within the same major version. Non-stable
 * releases are isolated by their complete version string.
 */
export type VersionScope =
    | {
          type: 'stable';
          major: number;
      }
    | {
          type: 'prerelease';
          version: string;
      };

/**
 * Value stored in the global symbol registry slot for a rafpulse scope.
 *
 * The scope is stored alongside the scheduler so that accidental collisions
 * between incompatible versions can be detected at runtime.
 *
 * @internal
 */
export interface GlobalEntry {
    scope: VersionScope;
    raf: RAF;
}
