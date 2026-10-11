// Keys are lowercase; readBotanical() normalises the inventory's casing and misspellings
export const GENUS_COLOR_VAR: Record<string, string> = {
  acer: '--celery',
  gleditsia: '--golden',
  picea: '--casal',
  pinus: '--asparagus',
  quercus: '--killarney',
  tilia: '--golden',
  ulmus: '--asparagus',
  gymnocladus: '--spectra',
  malus: '--punch',
  syringa: '--lavender',
  ginkgo: '--raj',
  celtis: '--killarney',
  betula: '--geyser',
  amelanchier: '--casablanca',
  aesculus: '--killarney',
  pyrus: '--raj',
  prunus: '--blush',
  fraxinus: '--terracotta',
  platanus: '--gumleaf',
  thuja: '--killarney',
  liriodendron: '--asparagus',
  catalpa: '--lavender',
  morus: '--lavender',
  fagus: '--rope',
  sorbus: '--pomegranate',
  magnolia: '--zinnwaldite',
  juglans: '--kabul',
  ailanthus: '--pomegranate',
  juniperus: '--casal',
  robinia: '--celery',
  cercis: '--blush',
  crataegus: '--punch',
  cercidiphyllum: '--casablanca',
  abies: '--killarney',
  zelkova: '--terracotta',
  corylus: '--rope',
  ostrya: '--celery',
  cladrastis: '--raj',
  salix: '--mantle',
  taxus: '--pomegranate',
  phellodendron: '--donkey',
  populus: '--regent',
  pseudotsuga: '--kabul',
  cornus: '--zinnwaldite',
  carpinus: '--barley',
  tsuga: '--golden',
  liquidambar: '--terracotta',
  chamaecyparis: '--mantle',
};

export const GENUS_ICON: Record<string, string> = {
  acer: 'maple',
  gleditsia: 'locust',
  picea: 'spruce',
  pinus: 'pine',
  quercus: 'oak',
  tilia: 'linden',
  ulmus: 'elm',
  gymnocladus: 'kentucky-coffeetree',
  malus: 'apple',
  syringa: 'lilac',
  ginkgo: 'ginkgo',
  celtis: 'hackberry',
  betula: 'birch',
  amelanchier: 'serviceberry',
  aesculus: 'horse-chestnut',
  pyrus: 'ornamental-pear',
  prunus: 'cherry',
  fraxinus: 'ash',
  platanus: 'sycamore',
  thuja: 'cedar',
  liriodendron: 'tulip-tree',
  catalpa: 'catalpa',
  morus: 'mulberry',
  fagus: 'beech',
  sorbus: 'rowan',
  magnolia: 'magnolia',
  juglans: 'walnut',
  ailanthus: 'tree-of-heaven',
  juniperus: 'juniper',
  robinia: 'black-locust',
  cercis: 'redbud',
  crataegus: 'hawthorn',
  cercidiphyllum: 'katsura',
  abies: 'fir',
  zelkova: 'zelkova',
  corylus: 'hazel',
  ostrya: 'ironwood',
  cladrastis: 'yellowwood',
  salix: 'willow',
  taxus: 'yew',
  phellodendron: 'cork',
  populus: 'poplar',
  pseudotsuga: 'douglas-fir',
  cornus: 'dogwood',
  carpinus: 'hornbeam',
  tsuga: 'hemlock',
  liquidambar: 'sweetgum',
  chamaecyparis: 'falsecypress',
};

// The City's inventory misspells three genera and stores 'None' where a name is missing
export const GENUS_FIX: Record<string, string> = {
  alix: 'salix',           // 101 weeping willows
  allianthus: 'ailanthus', // tree of heaven
  crategus: 'crataegus',   // 2 Crusade hawthorns
};

// Genus is capitalised, species epithet left lowercase, per botanical convention
export function readBotanical(raw: unknown) {
  const name = String(raw ?? '').trim();
  if (!name || name === 'None') return { display: '', genus: '' };
  const [first, ...rest] = name.split(/\s+/);
  const genus = GENUS_FIX[first.toLowerCase()] ?? first.toLowerCase();
  const display = [genus.charAt(0).toUpperCase() + genus.slice(1), ...rest].join(' ');
  return { display, genus };
}

export const readCommon = (raw: unknown) => {
  const name = String(raw ?? '').trim();
  return !name || name === 'None' ? 'Tree' : name;
};
