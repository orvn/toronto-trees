import cfg from '../content/map-style.json';

type Bounds = [[number, number], [number, number]];
type ViewMap = {
  getCenter(): { lng: number; lat: number };
  getZoom(): number;
};

const inBounds = (lng: number, lat: number) => {
  const [[w, s], [e, n]] = cfg.maxBounds as Bounds;
  return lng >= w && lng <= e && lat >= s && lat <= n;
};

const readNum = (q: URLSearchParams, key: string) => {
  const v = q.get(key);
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const updateQuery = (mutate: (q: URLSearchParams) => void) => {
  const q = new URLSearchParams(location.search);
  mutate(q);
  const qs = q.toString();
  history.replaceState(history.state, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
};

export function readViewParams() {
  const q = new URLSearchParams(location.search);
  const lng = readNum(q, 'long');
  const lat = readNum(q, 'lat');
  const zoom = readNum(q, 'zoom');
  return {
    center: lng !== null && lat !== null && inBounds(lng, lat) ? ([lng, lat] as [number, number]) : null,
    zoom: zoom !== null ? Math.min(cfg.maxZoom, Math.max(cfg.minZoom, zoom)) : null,
  };
}

export function writeViewParams(map: ViewMap) {
  const { lng, lat } = map.getCenter();
  updateQuery(q => {
    q.set('long', lng.toFixed(5));
    q.set('lat', lat.toFixed(5));
    q.set('zoom', map.getZoom().toFixed(2));
  });
}

// Tree keys are a source prefix plus that source's own numeric id, e.g. t555172,
// so ids from other inventories can be merged later without renumbering
export const TREE_KEY = /^([a-z])(\d+)$/;

export function readSpotlightParam() {
  const m = TREE_KEY.exec(new URLSearchParams(location.search).get('spotlight') ?? '');
  return m ? { prefix: m[1], id: Number(m[2]) } : null;
}

export function writeSpotlightParam(key: string | null) {
  updateQuery(q => (key === null ? q.delete('spotlight') : q.set('spotlight', key)));
}

type Range = { min: number | null; max: number | null };
type RangeState = Record<'ageMin' | 'ageMax' | 'dbhMin' | 'dbhMax', number | null>;

const readRange = (q: URLSearchParams, key: string): Range | null => {
  const m = /^(\d*)-(\d*)$/.exec(q.get(key) ?? '');
  if (!m || (!m[1] && !m[2])) return null;
  return { min: m[1] ? Number(m[1]) : null, max: m[2] ? Number(m[2]) : null };
};

export function readFilterParams() {
  const q = new URLSearchParams(location.search);
  return {
    age: readRange(q, 'age'),
    dbh: readRange(q, 'dbh'),
    trees: q.getAll('tree').map(t => t.trim().toLowerCase()).filter(Boolean),
    group: q.get('group'),
  };
}

export function writeRangeParams(state: RangeState) {
  updateQuery(q => {
    for (const key of ['age', 'dbh'] as const) {
      const min = state[`${key}Min`];
      const max = state[`${key}Max`];
      if (min === null && max === null) q.delete(key);
      else q.set(key, `${min ?? ''}-${max ?? ''}`);
    }
  });
}

export function writeSpeciesParams(trees: string[], group: string | null) {
  updateQuery(q => {
    q.delete('tree');
    for (const t of trees) q.append('tree', t);
    if (group) q.set('group', group);
    else q.delete('group');
  });
}
