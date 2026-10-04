import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import RAF from './raf';

describe('RAF', () => {
    let nextFrameId: number;
    let frames: Map<number, FrameRequestCallback>;

    beforeEach(() => {
        nextFrameId = 1;
        frames = new Map();

        vi.stubGlobal(
            'requestAnimationFrame',
            vi.fn((callback: FrameRequestCallback) => {
                const id = nextFrameId++;

                frames.set(id, callback);

                return id;
            })
        );

        vi.stubGlobal(
            'cancelAnimationFrame',
            vi.fn((id: number) => {
                frames.delete(id);
            })
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function runFrame(timestamp = 100): void {
        const [entry] = frames.entries();

        if (!entry) {
            throw new Error('No animation frame scheduled');
        }

        const [id, callback] = entry;

        frames.delete(id);
        callback(timestamp);
    }

    it('starts the pulse', () => {
        const raf = new RAF('1.0.0');

        raf.start();

        expect(raf.processing).toBe(true);
        expect(requestAnimationFrame).toHaveBeenCalledOnce();
        expect(frames.size).toBe(1);
    });

    it('does not schedule another frame when already started', () => {
        const raf = new RAF('1.0.0');

        raf.start();
        raf.start();

        expect(requestAnimationFrame).toHaveBeenCalledOnce();
        expect(frames.size).toBe(1);
    });

    it('stops the pulse and cancels the pending frame', () => {
        const raf = new RAF('1.0.0');

        raf.start();
        raf.stop();

        expect(raf.processing).toBe(false);
        expect(cancelAnimationFrame).toHaveBeenCalledOnce();
        expect(frames.size).toBe(0);
    });

    it('does nothing when stopping an already stopped pulse', () => {
        const raf = new RAF('1.0.0');

        raf.stop();

        expect(cancelAnimationFrame).not.toHaveBeenCalled();
        expect(raf.processing).toBe(false);
    });

    it('calls registered spices with the animation frame timestamp', () => {
        const spice = vi.fn();
        const raf = new RAF('1.0.0');

        raf.add(spice);
        raf.start();

        runFrame(123.45);

        expect(spice).toHaveBeenCalledOnce();
        expect(spice).toHaveBeenCalledWith(123.45);
    });

    it('schedules the next frame after processing a frame', () => {
        const raf = new RAF('1.0.0');

        raf.start();

        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

        runFrame();

        expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
        expect(frames.size).toBe(1);
    });

    it('does not register the same spice more than once', () => {
        const spice = vi.fn();
        const raf = new RAF('1.0.0');

        raf.add(spice);
        raf.add(spice);
        raf.start();

        runFrame();

        expect(spice).toHaveBeenCalledOnce();
    });

    it('removes a registered spice', () => {
        const spice = vi.fn();
        const raf = new RAF('1.0.0');

        raf.add(spice);
        raf.remove(spice);
        raf.start();

        runFrame();

        expect(spice).not.toHaveBeenCalled();
    });

    it('allows a spice to remove itself', () => {
        const raf = new RAF('1.0.0');

        const spice = vi.fn(() => {
            raf.remove(spice);
        });

        raf.add(spice);
        raf.start();

        runFrame();
        runFrame();

        expect(spice).toHaveBeenCalledOnce();
    });

    it('can be stopped from a spice without scheduling another frame', () => {
        const raf = new RAF('1.0.0');

        raf.add(() => {
            raf.stop();
        });

        raf.start();
        runFrame();

        expect(raf.processing).toBe(false);
        expect(frames.size).toBe(0);
        expect(requestAnimationFrame).toHaveBeenCalledOnce();
    });

    it('can be stopped and restarted from a spice without creating multiple RAF chains', () => {
        const raf = new RAF('1.0.0');
        let firstFrame = true;

        raf.add(() => {
            if (firstFrame) {
                firstFrame = false;

                raf.stop();
                raf.start();
            }
        });

        raf.start();
        runFrame();

        expect(raf.processing).toBe(true);
        expect(frames.size).toBe(1);
        expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    });

    it('keeps the pulse alive when a spice throws', () => {
        const error = new Error('Spice failed');
        const raf = new RAF('1.0.0');

        raf.add(() => {
            throw error;
        });

        raf.start();

        expect(() => runFrame()).toThrow(error);

        expect(raf.processing).toBe(true);
        expect(frames.size).toBe(1);
        expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    });

    it('adopts spices from a previous RAF instance', () => {
        const spice = vi.fn();

        const previous = new RAF('1.0.0');
        previous.add(spice);

        const next = new RAF('1.1.0', previous);

        expect(next.spices).toBe(previous.spices);
        expect(next.spices.has(spice)).toBe(true);
    });

    it('takes over a running previous RAF instance', () => {
        const previous = new RAF('1.0.0');

        previous.start();

        const next = new RAF('1.1.0', previous);

        expect(previous.processing).toBe(false);
        expect(next.processing).toBe(true);

        expect(cancelAnimationFrame).toHaveBeenCalledOnce();
        expect(frames.size).toBe(1);
    });

    it('does not start when adopting a stopped RAF instance', () => {
        const previous = new RAF('1.0.0');

        const next = new RAF('1.1.0', previous);

        expect(next.processing).toBe(false);
        expect(requestAnimationFrame).not.toHaveBeenCalled();
    });
});
