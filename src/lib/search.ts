import { readBotanical } from './botanical';

export type Searchable = { text: string; words: string[] };
export type TreeEntry = Searchable & {
  kind: 'genus' | 'species';
  name: string;
  common: string;
  genus: string;
  botanical?: string;
  count: number;
};
export type Street = Searchable & {
  name: string;
  display: string;
  count: number;
  anchors: [number, number, number][];
  min: number;
  max: number;
};
type Row = { botanical: string; common: string; count: number };

const MAX_RESULTS = 8;

export const tokenize = (s: string) =>
  s.toLowerCase().replace(/['’]/g, '').split(/[\s,()]+/).filter(Boolean);

const searchable = (text: string): Searchable => {
  const t = text.toLowerCase().replace(/['’]/g, '');
  return { text: t, words: tokenize(t) };
};

// Genus rows aggregate their species; their common label is the most planted species' name before the comma
export const buildTreeIndex = (rows: Row[]): TreeEntry[] => {
  const genera = new Map<string, { count: number; commons: Map<string, number> }>();
  const entries: TreeEntry[] = [];
  for (const row of rows) {
    const { display, genus } = readBotanical(row.botanical);
    if (!genus) continue;
    const g = genera.get(genus) ?? { count: 0, commons: new Map() };
    g.count += row.count;
    const head = row.common.split(',')[0].trim();
    g.commons.set(head, (g.commons.get(head) ?? 0) + row.count);
    genera.set(genus, g);
    entries.push({ kind: 'species', name: display, common: row.common, genus, botanical: row.botanical, count: row.count, ...searchable(`${display} ${row.common}`) });
  }
  for (const [genus, g] of genera) {
    const common = [...g.commons].sort((a, b) => b[1] - a[1])[0][0];
    const name = genus.charAt(0).toUpperCase() + genus.slice(1);
    entries.push({ kind: 'genus', name, common, genus, count: g.count, ...searchable(`${name} ${common}`) });
  }
  return entries;
};

// The inventory shouts street names; single letters are directionals and stay upper
export const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/\b([a-z])\b/gi, c => c.toUpperCase());

let streetLoad: Promise<Street[]> | null = null;
export const loadStreets = (url: string) =>
  (streetLoad ??= fetch(url)
    .then(r => r.json())
    .then((rows: [string, number, [number, number, number][]][]) =>
      rows.map(([name, count, anchors]) => ({
        name,
        display: titleCase(name),
        count,
        anchors,
        min: anchors[0][0],
        max: anchors[anchors.length - 1][0],
        ...searchable(name),
      }))
    ));

// Every token must hit; a word-start hit outranks a substring, the leading word outranks the rest
const score = (e: Searchable, tokens: string[]) => {
  let total = 0;
  for (const t of tokens) {
    if (e.words.some(w => w.startsWith(t))) total += e.words[0].startsWith(t) ? 3 : 2;
    else if (e.text.includes(t)) total += 1;
    else return 0;
  }
  return total;
};

const rank = <T extends Searchable>(index: T[], tokens: string[], tieBreak: (a: T, b: T) => number) => {
  if (!tokens.length) return [];
  const scored: [number, T][] = [];
  for (const e of index) {
    const s = score(e, tokens);
    if (s) scored.push([s, e]);
  }
  return scored.sort((a, b) => b[0] - a[0] || tieBreak(a[1], b[1])).slice(0, MAX_RESULTS).map(s => s[1]);
};

export const searchTrees = (index: TreeEntry[], query: string) =>
  rank(index, tokenize(query), (a, b) => Number(b.kind === 'genus') - Number(a.kind === 'genus') || b.count - a.count);

export const searchStreets = (index: Street[], query: string) =>
  rank(index, tokenize(query), (a, b) => b.count - a.count);

// A leading number is the house number, the rest names the street
export const parseAddress = (query: string) => {
  const m = query.trim().match(/^(\d+)\s*(.*)$/);
  return m ? { number: Number(m[1]), street: m[2] } : { number: null, street: query };
};

// Linear interpolation between the two anchors that bracket the house number
export const interpolate = (s: Street, n: number): [number, number] => {
  const a = s.anchors;
  if (n <= a[0][0]) return [a[0][1], a[0][2]];
  for (let i = 1; i < a.length; i++) {
    if (n <= a[i][0]) {
      const [n0, x0, y0] = a[i - 1];
      const [n1, x1, y1] = a[i];
      const t = n1 === n0 ? 0 : (n - n0) / (n1 - n0);
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
  }
  const last = a[a.length - 1];
  return [last[1], last[2]];
};

export const boundsOf = (s: Street): [[number, number], [number, number]] => {
  const xs = s.anchors.map(p => p[1]);
  const ys = s.anchors.map(p => p[2]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
};
