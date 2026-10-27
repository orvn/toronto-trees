/**
 * Alpine.js entrypoint, runs before Alpine.start()
 *
 * Register Alpine.data() components, Alpine.store() stores, and
 * Alpine.directive() custom directives here
 *
 * This is the officially supported pattern from @astrojs/alpinejs
 * https://docs.astro.build/en/guides/integrations-guide/alpinejs/
 * Without it, Alpine.data() registrations can race against DOM
 * processing, esp in Safari and during virtual navigation
 *
 * Usage in templates:
 *   <div x-data="counter">
 *     <button @click="increment" x-text="count"></button>
 *   </div>
 */

import type { Alpine } from 'alpinejs';

export default (Alpine: Alpine) => {
  // Example: simple counter component
  Alpine.data('counter', () => ({
    count: 0,
    increment() {
      this.count++;
    },
  }));

  // 404 leaves, config is declared in LeafScatter.astro; the canvas code is only loaded where it's used
  Alpine.data('leafScatter', (cfg) => {
    let field: { stop(): void } | undefined;
    let gone = false;
    return {
      ready: false,
      async init() {
        const { start } = await import('./scripts/leaf-scatter.js');
        if (gone) return;
        field = start(this.$refs.host, this.$refs.canvas, cfg);
        this.ready = true;
      },
      destroy() { gone = true; field?.stop(); },
    };
  });
};
