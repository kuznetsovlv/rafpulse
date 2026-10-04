<p align="center">
  <picture>
    <source
      srcset="./logo/logo.png"
    />
    <img
      src="./logo/logo.png"
      alt="rafpulse"
      width="760"
    />
  </picture>
</p>

A lightweight shared `requestAnimationFrame` loop for JavaScript.

[Coverage report](https://kuznetsovlv.github.io/rafpulse/)

`rafpulse` lets multiple animation consumers share a single animation-frame scheduler instead of creating and managing independent RAF loops.

<p align="center">
  <picture>
    <source
      srcset="./logo/raf.png"
    />
    <img
      src="./logo/raf.png"
      alt="rafpulse mascot"
      width="320"
    />
  </picture>
</p>

```ts
import {addSpice, start} from 'rafpulse';

addSpice((timestamp) => {
    // Update animation state here.
});

start();
```

## Why rafpulse?

It is common for independent parts of an application to create their own `requestAnimationFrame` loops:

```ts
function animate(timestamp: DOMHighResTimeStamp) {
    // Update something...

    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

As an application grows, multiple components, utilities, or libraries may each manage their own RAF lifecycle.

`rafpulse` provides one shared pulse instead:

```ts
import {addSpice, start} from 'rafpulse';

addSpice(updatePosition);
addSpice(updateCanvas);
addSpice(updateMetrics);

start();
```

Each registered callback — a **spice** — receives the timestamp supplied by `requestAnimationFrame`.

The goal is not to change how often the browser paints. Instead, `rafpulse` centralizes animation scheduling and lifecycle management around one shared RAF chain.

## Installation

```bash
pnpm add rafpulse
```

```bash
npm install rafpulse
```

```bash
yarn add rafpulse
```

## Usage

### Add a spice

```ts
import {addSpice} from 'rafpulse';

const animate = (timestamp: DOMHighResTimeStamp) => {
    console.log(timestamp);
};

addSpice(animate);
```

Adding a spice does not start the animation loop automatically.

### Start the pulse

```ts
import {start} from 'rafpulse';

start();
```

Calling `start()` multiple times is safe. Only one RAF chain is scheduled.

### Remove a spice

```ts
import {removeSpice} from 'rafpulse';

removeSpice(animate);
```

Removing a function that is not currently registered has no effect.

### Stop the pulse

```ts
import {stop} from 'rafpulse';

stop();
```

`stop()` cancels the pending animation frame and stops the shared pulse.

Calling it before `rafpulse` has been initialized, or while the pulse is already stopped, has no effect.

### Explicit initialization

```ts
import {init} from 'rafpulse';

init();
```

Most applications do not need to call `init()` explicitly because operations that require the scheduler initialize it lazily.

It is available when explicit initialization is useful.

## API

### `init(): void`

Ensures that the shared RAF scheduler for the current `rafpulse` version scope exists.

Calling it multiple times is safe.

### `start(): void`

Starts the shared RAF pulse.

If it is already running, no additional RAF chain is created.

### `stop(): void`

Stops the shared RAF pulse and cancels its pending animation frame.

Does not initialize `rafpulse` if it has not been initialized yet.

### `addSpice(spice: Spice): void`

Registers a callback to be invoked on every animation frame while the pulse is running.

```ts
type Spice = (timestamp: DOMHighResTimeStamp) => void;
```

Spices are stored as a `Set`, so registering the same function more than once does not create duplicate calls.

### `removeSpice(spice: Spice): void`

Removes a previously registered spice.

Does not initialize `rafpulse` if it has not been initialized yet.

## Example

```ts
import {addSpice, removeSpice, start, stop} from 'rafpulse';

const startedAt = performance.now();

const animate = (timestamp: DOMHighResTimeStamp) => {
    const elapsed = timestamp - startedAt;

    console.log(`Running for ${elapsed} ms`);

    if (elapsed >= 1000) {
        removeSpice(animate);
        stop();
    }
};

addSpice(animate);
start();
```

## Shared scheduler

Compatible copies of `rafpulse` loaded into the same JavaScript realm share the same scheduler through the global symbol registry.

Stable releases share a scheduler within the same major version:

```text
1.0.0 ─┐
1.3.2 ─┼─ shared scheduler
1.9.0 ─┘

2.0.0 ─── separate scheduler
```

When a newer compatible minor or patch version is loaded, it can replace an older scheduler while preserving registered spices and whether the pulse was running.

Different major versions remain isolated.

Non-stable versions are isolated by their complete version string:

```text
1.0.0-beta.1 ─ separate scheduler
1.0.0-beta.2 ─ separate scheduler
1.0.0        ─ stable major-1 scheduler
```

This allows independently bundled compatible copies of `rafpulse` to converge on one RAF loop without mixing incompatible versions.

## Behavior

A few details are intentional:

- `addSpice()` registers a callback but does not automatically start the pulse.
- `start()` is idempotent.
- `stop()` is idempotent.
- The same spice cannot be registered twice.
- Spices receive the original `requestAnimationFrame` timestamp.
- Compatible scheduler upgrades preserve the existing spice set.
- Exceptions thrown by a spice are not swallowed by `rafpulse`.

## Browser support

`rafpulse` requires an environment that provides:

- `requestAnimationFrame`
- `cancelAnimationFrame`
- `globalThis`
- `Symbol.for`

It is intended primarily for modern browser environments.

## License

MIT © Leonid Kuznetsov

<p align="center">
  <picture>
    <source
      srcset="./logo/raf.png"
    />
    <img
      src="./logo/raf.png"
      alt="rafpulse mascot"
      width="320"
    />
  </picture>
</p>
