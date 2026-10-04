import RAF from './raf';
import type {GlobalEntry, Spice} from './types';
import {
    assertSameScope,
    getSymbolKey,
    getVersionScope,
    isObsolete,
} from './utils';
import {version} from './version';

/**
 * Compatibility scope of the currently loaded rafpulse version.
 *
 * Stable releases share a scope with other releases of the same major version,
 * while prerelease versions use isolated scopes.
 */
const SCOPE = getVersionScope(version);

/**
 * Global registry key used to share a RAF scheduler between compatible copies
 * of rafpulse loaded into the same JavaScript realm.
 */
const KEY = getSymbolKey(SCOPE);

/**
 * Extension of the current global object containing the rafpulse entry for the
 * current compatibility scope.
 *
 * Different major and prerelease versions use different symbol keys and
 * therefore do not share entries.
 */
type Global = typeof globalThis & {
    [KEY]?: GlobalEntry;
};

/**
 * Global object of the current JavaScript realm.
 */
const global = globalThis as Global;

/**
 * Ensures that the shared RAF pulse for the current rafpulse version scope
 * is initialized.
 *
 * Calling `init` multiple times is safe. If a compatible older instance is
 * already registered globally, it may be upgraded while preserving its
 * registered spices and running state.
 */
export function init() {
    getRAF();
}

/**
 * Starts the shared requestAnimationFrame pulse.
 *
 * Calling `start` while the pulse is already running has no effect.
 */
export function start() {
    getRAF().start();
}

/**
 * Stops the shared requestAnimationFrame pulse if it has been initialized.
 *
 * Calling `stop` before initialization or while the pulse is already stopped
 * has no effect.
 */
export function stop() {
    getExistingRAF()?.stop();
}

/**
 * Registers a spice to be called on every animation frame while the pulse
 * is running.
 *
 * The same function can only be registered once.
 *
 * @param spice - Function called with the requestAnimationFrame timestamp.
 */
export function addSpice(spice: Spice) {
    getRAF().add(spice);
}

/**
 * Removes a previously registered spice.
 *
 * Calling `removeSpice` for a function that is not registered has no effect
 * and does not initialize the pulse.
 *
 * @param spice - Previously registered spice.
 */
export function removeSpice(spice: Spice) {
    getExistingRAF()?.remove(spice);
}

export type {Spice} from './types';

/**
 * Returns the shared RAF scheduler for the current version scope.
 *
 * Creates a new scheduler when none exists. If the existing scheduler belongs
 * to an older compatible release, it is replaced by a new instance that adopts
 * its registered spices and running state.
 *
 * @returns Scheduler used by the current rafpulse scope.
 */
function getRAF(): RAF {
    const existedRAF = getExistingRAF();

    if (!existedRAF || isObsolete(existedRAF, version)) {
        const raf = new RAF(version, existedRAF);
        global[KEY] = {scope: SCOPE, raf};

        return raf;
    }

    return existedRAF;
}

/**
 * Returns the scheduler currently stored for this version scope without
 * creating one.
 *
 * The stored scope is validated before the scheduler is returned. A mismatch
 * means incompatible rafpulse versions have resolved to the same global key,
 * which indicates an internal version-isolation bug.
 *
 * @returns Existing scheduler, or `undefined` when the current scope has not
 * been initialized.
 * @throws {Error} If the stored entry belongs to an incompatible version scope.
 */
function getExistingRAF(): RAF | undefined {
    const entry = global[KEY];

    if (!entry) {
        return undefined;
    }

    assertSameScope(entry.scope, SCOPE);

    return entry.raf;
}
