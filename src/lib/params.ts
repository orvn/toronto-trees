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
