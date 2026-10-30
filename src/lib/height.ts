import models from '../content/height-models.json';

// Equation forms per the Urban Tree Database TS4 table, plus pow (see height-models.json)
export interface HeightModel {
  form: string;
  a: number;
  b: number;
  c?: number;
  d?: number;
  dbh_min: number;
  dbh_max: number;
  r2?: number;
  src: string;
  proxy?: string;
}

const MODELS = Object.fromEntries(
  Object.entries(models).filter(([k]) => !k.startsWith('_'))
) as Record<string, HeightModel>;

const weight = (n: string, x: number) =>
  n === '1' ? 1 : n === '2' ? Math.sqrt(x) : n === '3' ? x : x * x;

export function findHeightModel(botanical: string, genus: string) {
  const parts = botanical.toLowerCase().split(/\s+/).filter(w => w && w !== 'x' && w !== '×');
  const species = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : '';
  return MODELS[parts.join(' ')] ?? (species ? MODELS[species] : undefined) ?? MODELS[genus];
}

// Height (m) for a DBH (cm), clamped to the range the model was fitted over
export function estimateHeight(dbhCm: number, m: HeightModel) {
  const x = Math.min(m.dbh_max, Math.max(m.dbh_min, dbhCm));
  const { a, b, c = 0, d = 0 } = m;
  let h: number;
  if (m.form === 'lin') h = a + b * x;
  else if (m.form === 'quad') h = a + b * x + c * x * x;
  else if (m.form === 'cub') h = a + b * x + c * x * x + d * x ** 3;
  else if (m.form === 'pow') h = a * x ** b;
  else if (m.form.startsWith('loglog')) h = Math.exp(a + b * Math.log(Math.log(x + 1)) + (weight(m.form.slice(-1), x) * c) / 2);
  else if (m.form.startsWith('expow')) h = Math.exp(a + b * x + (weight(m.form.slice(-1), x) * c) / 2);
  else return null;
  return Number.isFinite(h) && h > 0 ? h : null;
}
