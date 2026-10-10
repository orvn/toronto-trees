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

export function readViewParams() {
  const q = new URLSearchParams(location.search);
  const num = (key: string) => {
    const v = q.get(key);
    if (v === null || v.trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const lng = num('lng');
  const lat = num('lat');
  const zoom = num('zoom');
  return {
    center: lng !== null && lat !== null && inBounds(lng, lat) ? ([lng, lat] as [number, number]) : null,
    zoom: zoom !== null ? Math.min(cfg.maxZoom, Math.max(cfg.minZoom, zoom)) : null,
  };
}

export function writeViewParams(map: ViewMap) {
  const { lng, lat } = map.getCenter();
  const q = new URLSearchParams(location.search);
  q.set('lng', lng.toFixed(5));
  q.set('lat', lat.toFixed(5));
  q.set('zoom', map.getZoom().toFixed(2));
  history.replaceState(history.state, '', `${location.pathname}?${q}${location.hash}`);
}
