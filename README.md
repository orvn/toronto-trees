![Alpine.js](https://img.shields.io/badge/Alpine.js-8BC0D0?style=flat&logo=alpinedotjs&logoColor=black) ![Astro](https://img.shields.io/badge/Astro-FF5D01?style=flat&logo=astro&logoColor=white) ![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)

# Toronto Trees

### 🔗 [torontotrees.fyi](https://torontotrees.fyi)

<img src="/public/images/graph-image.png" alt="toronto trees graph image" width="600">

An interactive map of every street tree in Toronto (~688k points), rendered with MapLibre GL + PMTiles. Current data is mostly from the City of Toronto Open Data, but new sources will be added.

### Report bugs or request features

You can report a bug or suggest a feautre [via issues](https://github.com/orvn/toronto-trees/issues/new/choose)

## Data pipeline

The raw dataset (`data/street-tree-data-4326.geojson`, ~400 MiB) is split into 50k-feature chunks and baked into a single vector-tile file:

```
scripts/split.sh data/street-tree-data-4326.geojson   # split to data/chunks/
scripts/tiles.sh                                      # chunks to public/data/street-trees.pmtiles
scripts/bucket.sh                                     # pmtiles to R2
```

The [pmtiles file](https://protomaps.com/blog/pmtiles-v3-hilbert-tile-ids/) is hosted on Cloudflare R2 (see `.env.example`) and partially retrieved by the client using [http range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests).

## Estimates

The datasets used for tree location have no age or height. We do have trunk diameter at breast height (DBH), which we use to estimate other features using existing models. Generally, each estimate will be an average for that species and size.

### Age

Age uses the _International Society of Arboriculture (ISA)_ growth factor method: $`\text{age} \approx \text{DBH (inches)} \times \text{growth factor}`$. 

A lookup table of factors per species and genus can be found in `src/content/growth-factors.json`. 

Note that street trees usually grow slower than the trees the factors come from, so estimates skew young.

### Height

Height of genera and species is estimated with allometric equations fitted to sample data from similar geographical areas. Models can be found in `src/content/height-models.json`.

**Data sources**

Data on tree species heights is obtained from several studies:

1. Oakville, ON ash study ([Peper et al. 2014](https://www.fs.usda.gov/psw/publications/peper/psw_2014_peper001.pdf))
- Suburb of Toronto
- Supplies the methodology we follow
- Only covers ash trees
2. US Forest Service [Urban Tree Database](https://www.fs.usda.gov/rds/archive/catalog/RDS-2016-0005), ([table TS4](https://research.fs.usda.gov/download/treesearch/52933.pdf))
- Broad database, but we filter it to cities with climate nearest to Toronto (especially Minneapolis, Indianapolis, NYC)
- We fit tree models from this research
3. Qingdao urban study ([Forests 2023](https://www.mdpi.com/1999-4907/14/3/472))
- Although Qingdao is in China, it is a city of similar size to Toronto, and has winters that dip into negative degrees
- We use it only for one tree whose data is important: the tree of heaven

**Model**

We adopt the regression forms that the studies used. Let `x` be DBH in cm, `H` the estimated height in meters, and `a`, `b`, `c`, `d` the published parameters for a species.

Trees can take one of 6 forms:

1. Polynomial forms calculate height directly
    - `lin`: $`H = a + b\,x`$
    - `quad`: $`H = a + b\,x + c\,x^2`$
    - `cub`: $`H = a + b\,x + c\,x^2 + d\,x^3`$
2. Logarithmic forms calculate the log of height, then change it back to meters (showing the usual curve of tree height: fast at first, then slow)
    - `loglogwN`: $`H = \exp\left(a + b\,\ln\big(\ln(x + 1)\big) + \frac{w_N\, c}{2}\right)`$
    - `expowN`: $`H = \exp\left(a + b\,x + \frac{w_N\, c}{2}\right)`$
    - where $`w_1 = 1,\ w_2 = \sqrt{x},\ w_3 = x,\ w_4 = x^2`$ and `c` is the fit's MSE (mean squared error)
    - The correction term $`w_N c/2`$ is needed because a fit in log values gives estimates that are too low
      - $`w_N`$ is a weight from the source material, and lets the error grow with tree size
3. Power law calculates height directly, with a fractional exponent, so it rises steeply for small trees and then flattens without ever turning down
    - `pow`: $`H = a\,x^b`$, where $`0 < b < 1`$

Each study measured trees only within a diameter range, and an equation isn't reliable outside it, so we clamp diameter to the fitted range: $`x = \min\left(x_{\max},\ \max\left(x_{\min},\ \mathrm{DBH}\right)\right)`$

**Methodology**

- Lookup goes from most to least specific: full botanical name, genus & species, then genus
- One species can have equations from more than one city, the city nearest to Toronto's climate is used
- Four species have no equation in nearby cities, so they use the largest sample from a warmer city (tulip tree, black locust, eastern red cedar, flowering dogwood)
- Tree of heaven is the only tree to use the power law (`pow`), through the Qingdao sample mean, with its slope pooled from the Qingdao fit and open-grown trees in the US Forest Service [FIA](https://research.fs.usda.gov/programs/fia) inventory for nearby states
- Some genera don't match any urban equation, so are missing height estimates (fir, willow, yew, lilac, rowan, serviceberry, thuja cedar, katsura, ironwood, hazel, yellowwood, cork tree, hemlock)

**Potential error**

- For very large trees the estimate can be too low, since diameter is clamped (although it shouldn't ever be wildly wrong)
- Pruning, soil volume and site conditions all change how tall a street tree gets
- Trees that use a proxy species are less accurate, and trees that use a warmer city's data could come out too high (although this is unlikely to be significant)

## Stack

Built on [Astro](https://astro.build) and [Alpine.js](https://alpinejs.dev), optimised for minimal Javascript footprint, performance, a11y, and SEO.

- **Astro 6** — static output, client-side routing via `<ClientRouter />`
- **Alpine.js** — lightweight interactivity, no build step
- **Maplibre** - for map feature, with rendering from pmtiles
- **Plain CSS** — custom properties, fluid type scale, no framework
- **Bun** — package manager and script runner
- **Cloudflare R2** - storage bucket for data

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


## Deployment

Assuming a static site host like Cloudflare Pages, Github Pages, Netlify, etc.

- Build command: `bun run build`
- Set output directory: `dist`
- Ensure Node version is set to **22** or higher in environment settings
- Add any environment variables (none by default)
