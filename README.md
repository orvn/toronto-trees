![Alpine.js](https://img.shields.io/badge/Alpine.js-8BC0D0?style=flat&logo=alpinedotjs&logoColor=black) ![Astro](https://img.shields.io/badge/Astro-FF5D01?style=flat&logo=astro&logoColor=white) ![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)

# Toronto Trees

### 🔗 (toronto-trees.pages.dev)[https://toronto-trees.pages.dev]

An interactive map of every street tree in Toronto (~688k points), rendered with MapLibre GL + PMTiles from the City of Toronto Open Data. Built on [Astro](https://astro.build) and [Alpine.js](https://alpinejs.dev), optimised for minimal Javascript footprint, performance, a11y, and SEO.

## Data pipeline

The raw dataset (`data/street-tree-data-4326.geojson`, ~343 MB) is split into 50k-feature chunks and baked into a single vector-tile file:

```
scripts/split.sh data/street-tree-data-4326.geojson   # split → data/chunks/
scripts/tiles.sh                                      # chunks → public/data/street-trees.pmtiles
scripts/bucket.sh                                     # pmtiles → R2
```

The map layer styling lives in `src/content/map-style.json`
The pmtiles file is hosted on Cloudflare R2 and fetched client-side (see `.env.example`)


## Stack

- **Astro 6** — static output, client-side routing via `<ClientRouter />`
- **Alpine.js** — lightweight interactivity, no build step
- **Plain CSS** — custom properties, fluid type scale, no framework
- **Bun** — package manager and script runner


## Quickstart

```bash
bun install    # requires node 22+
bun dev        # local development
bun build      # outputs to ./dist
bun preview    # preview the ./dist build locally
```

## Content

All page content lives in `src/content/` as [TOON](https://toonformat.dev) files, a compact, human-readable format. Each page file follows a consistent three-section structure.


### Adding a content file for a new page

Create `src/content/my-page.toon`, then load it in the corresponding `.astro` file:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { loadPage } from '../lib/content';

const { meta, options, content } = loadPage('my-page');
const c = content as { heading: string; body: string };
---

<BaseLayout
  title={meta.title ?? undefined}
  description={meta.description}
  noindex={options?.noindex ?? false}
>
  <h1>{c.heading}</h1>
  <p>{c.body}</p>
</BaseLayout>
```

`loadGlobal()` is available for components that need site-wide values (name, URL, etc.).

## Configuration

### Site metadata

Edit `src/content/global.toon` to set the site name, description, URL, and title postfix before deploying.

### Production domain

Set `site` in `astro.config.mjs` to your production URL. This is required for correct canonical URLs and sitemap generation:

```js
export default defineConfig({
  site: 'https://foo.com',
  // ...
});
```

Also update the `Sitemap:` entry in `public/robots.txt` to match.

## Deployment

Assuming a static site host like Cloudflare Pages, Github Pages, Netlify, etc.

- Build command: `bun run build`
- Set output directory: `dist`
- Ensure Node version is set to **22** or higher in environment settings
- Add any environment variables (none by default)
