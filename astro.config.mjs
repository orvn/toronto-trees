import { defineConfig } from 'astro/config';
import alpinejs from '@astrojs/alpinejs';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://toronto-trees.pages.dev',

  output: 'static',

  integrations: [
    alpinejs({ entrypoint: '/src/entrypoint' }),
    sitemap(),
  ],

  // Security headers for the development server
  server: {
    port: 14680,
  },

  vite: {
    server: {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
    optimizeDeps: {
      exclude: ['maplibre-gl'],
    },
    worker: {
      format: 'es',
    },
  },
});
