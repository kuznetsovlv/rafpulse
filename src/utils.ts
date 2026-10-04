import type RAF from './raf';
import type {ParsedVersion, VersionScope} from './types';

/**
 * Matches versions treated as stable by rafpulse.
 *
 * Only plain `major.minor.patch` versions are considered stable. Every other
 * version string is isolated rather than participating in automatic scheduler
 * upgrades.
 */
const STABLE_VERSION_REGEX = /^\d+\.\d+\.\d+$/;

/**
 * Determines the global compatibility scope for a rafpulse version.
 *
 * Stable versions are grouped by major version. Non-stable versions receive
 * an isolated scope based on their complete version string.
 */
export function getVersionScope(version: string): VersionScope {
    return isVersionStable(version)
        ? {type: 'stable', major: parseStableVersion(version)[0]}
        : {type: 'prerelease', version};
}

/**
 * Returns the global symbol used to store the scheduler for a version scope.
 *
 * Equal compatible scopes produce the same symbol through `Symbol.for`.
 */
export function getSymbolKey(scope: VersionScope): symbol {
    switch (scope.type) {
        case 'stable':
            return Symbol.for(`@kuznetsovlv/rafpulse-${scope.major}`);

        case 'prerelease':
            return Symbol.for(`@kuznetsovlv/rafpulse-${scope.version}`);
    }
}

/**
 * Determines whether an existing scheduler should be replaced by the supplied
 * rafpulse version.
 *
 * This function must only be called for versions belonging to the same
 * compatible scope. Scope compatibility is validated before this function is
 * used.
 *
 * Within a stable major version, a newer minor or patch release replaces an
 * older scheduler. Prerelease scopes are never upgraded implicitly.
 *
 * @param raf - Existing scheduler.
 * @param version - Version attempting to use the scheduler.
 */
export function isObsolete(raf: RAF, version: string): boolean {
    if (!isVersionStable(version)) {
        return false;
    }

    const [, currentMinor, currentPatch] = parseStableVersion(raf.version);
    const [, minor, patch] = parseStableVersion(version);

    if (minor < currentMinor) {
        return false;
    }
    if (minor > currentMinor) {
        return true;
    }

    return patch > currentPatch;
}

/**
 * Verifies that a globally stored scheduler belongs to the expected version
 * scope.
 *
 * This is an internal invariant check. A mismatch indicates that incompatible
 * rafpulse versions resolved to the same global symbol, which would be a bug
 * in the version-isolation mechanism.
 *
 * @throws {Error} If the scopes are incompatible.
 */
export function assertSameScope(
    actual: VersionScope,
    expected: VersionScope
): void {
    if (
        actual.type !== expected.type ||
        (actual.type === 'stable' &&
            expected.type === 'stable' &&
            actual.major !== expected.major) ||
        (actual.type === 'prerelease' &&
            expected.type === 'prerelease' &&
            actual.version !== expected.version)
    ) {
        throw new Error(
            'rafpulse internal error: incompatible versions share the same global key'
        );
    }
}

/**
 * Parses a stable `major.minor.patch` version.
 *
 * The caller is responsible for ensuring that `version` satisfies
 * `STABLE_VERSION_REGEX` before invoking this helper.
 *
 * @param version - Stable version string to parse.
 * @returns Numeric major, minor and patch components.
 */
function parseStableVersion(version: string): ParsedVersion {
    const [major, minor, patch] = version.split('.');

    return [Number(major), Number(minor), Number(patch)];
}

/**
 * Checks whether a version participates in stable-version sharing and upgrades.
 *
 * @param version - Version string to inspect.
 * @returns `true` only for plain `major.minor.patch` versions.
 */
function isVersionStable(version: string): boolean {
    return STABLE_VERSION_REGEX.test(version);
}
