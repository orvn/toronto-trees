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
  const lng = readNum(q, 'lng');
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
    q.set('lng', lng.toFixed(5));
    q.set('lat', lat.toFixed(5));
    q.set('zoom', map.getZoom().toFixed(2));
  });
}

// OBJECTID of the tree whose popup is open
export function readSpotlightParam() {
  const id = readNum(new URLSearchParams(location.search), 'spotlight');
  return id !== null && Number.isInteger(id) && id > 0 ? id : null;
}

export function writeSpotlightParam(id: number | null) {
  updateQuery(q => (id === null ? q.delete('spotlight') : q.set('spotlight', String(id))));
}
