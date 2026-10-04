import type {Spice} from './types';

/**
 * Internal requestAnimationFrame scheduler used by rafpulse.
 *
 * A RAF instance owns a set of spices and schedules at most one pending
 * animation frame at a time.
 *
 * When constructed from a compatible previous instance, it reuses the same
 * spice set and preserves the running state while replacing the previous
 * scheduler.
 *
 * @internal
 */
export default class RAF {
    /**
     * Version of rafpulse that created this scheduler.
     */
    readonly #version: string;

    /**
     * Shared collection of animation callbacks.
     *
     * The same Set instance is transferred to a compatible replacement RAF so
     * that subscriptions survive a library-version upgrade.
     */
    readonly #spices: Set<Spice>;

    /**
     * Identifier of the currently scheduled animation frame.
     *
     * `undefined` means that no frame is currently pending. This is deliberately
     * tracked separately from `#processing`, because a callback can stop and
     * restart the scheduler while a frame is being processed.
     */
    #frameId: number | undefined;

    /**
     * Whether this scheduler should continue producing animation frames.
     */
    #processing: boolean;

    /**
     * Creates a RAF scheduler.
     *
     * @param version - Version of rafpulse that owns this scheduler.
     * @param raf - Compatible previous scheduler whose state should be adopted.
     */
    constructor(version: string, raf?: RAF) {
        this.#version = version;
        this.#frameId = undefined;
        this.#processing = false;

        if (raf) {
            this.#spices = raf.spices;
            if (raf.processing) {
                raf.stop();
                this.start();
            }
        } else {
            this.#spices = new Set();
        }
    }

    /**
     * Processes one animation frame.
     *
     * The pending frame id is cleared before invoking spices because the frame
     * represented by that id is currently executing.
     *
     * The next frame is scheduled in `finally` so an exception thrown by a
     * spice does not leave the scheduler internally marked as running without a
     * pending frame.
     *
     * `#frameId` is checked again before scheduling because a spice may call
     * `stop()` and `start()` during processing. In that case `start()` has
     * already scheduled the next frame and this callback must not create a
     * second RAF chain.
     *
     * @param timestamp - High-resolution timestamp supplied by
     * `requestAnimationFrame`.
     */
    #pulse = (n: DOMHighResTimeStamp) => {
        this.#frameId = undefined;
        if (!this.#processing) {
            return;
        }

        try {
            for (const spice of this.#spices) {
                spice(n);
            }
        } finally {
            if (this.#processing && this.#frameId === undefined) {
                this.#frameId = globalThis.requestAnimationFrame(this.#pulse);
            }
        }
    };

    /**
     * rafpulse version that created this scheduler.
     */
    get version(): string {
        return this.#version;
    }

    /**
     * Registered spices.
     *
     * The set itself is shared when a compatible newer rafpulse version replaces
     * this scheduler, allowing subscriptions to survive the upgrade.
     *
     * @internal
     */
    get spices(): Set<Spice> {
        return this.#spices;
    }

    /**
     * Whether the animation pulse is currently running.
     */
    get processing(): boolean {
        return this.#processing;
    }

    /**
     * Starts the pulse if it is not already running.
     *
     * @returns This scheduler.
     */
    start(): RAF {
        if (!this.#processing) {
            this.#processing = true;
            this.#frameId = globalThis.requestAnimationFrame(this.#pulse);
        }
        return this;
    }

    /**
     * Stops the pulse and cancels its pending animation frame, if any.
     *
     * @returns This scheduler.
     */
    stop(): RAF {
        this.#processing = false;
        if (this.#frameId !== undefined) {
            globalThis.cancelAnimationFrame(this.#frameId);
            this.#frameId = undefined;
        }
        return this;
    }

    /**
     * Registers a spice.
     *
     * Because spices are stored in a Set, registering the same function more than
     * once does not create duplicate calls.
     *
     * @param spice - Spice to register.
     * @returns This scheduler.
     */
    add(spice: Spice): RAF {
        this.#spices.add(spice);
        return this;
    }

    /**
     * Unregisters a spice.
     *
     * @param spice - Spice to unregister.
     * @returns This scheduler.
     */
    remove(spice: Spice): RAF {
        this.#spices.delete(spice);
        return this;
    }
}
