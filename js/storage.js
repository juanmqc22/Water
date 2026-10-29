// Camada de dados. Na V1 usa localStorage; na V2 basta reimplementar
// estas mesmas funções sobre o Supabase (todas já são assíncronas).

const KEY = 'water.v1';

const DEFAULTS = {
  version: 1,
  settings: {
    goalMl: 2500,
    weightKg: null,
    windowStart: 7,
    windowEnd: 21,
    cooldownMin: 5,
  },
  tags: [],   // { token, label, ml, createdAt }
  drinks: [], // { id, tagToken, ml, source, createdAt }
  boosts: {}, // { 'YYYY-MM-DD': ml } — acréscimo de meta (ex.: treino)
};

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (!data) return structuredClone(DEFAULTS);
    return {
      ...structuredClone(DEFAULTS),
      ...data,
      settings: { ...DEFAULTS.settings, ...data.settings },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function mutate(fn) {
  const data = load();
  const result = fn(data);
  save(data);
  return result;
}

export function randomToken(len = 12) {
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

// Ajustes

export async function getSettings() {
  return load().settings;
}

export async function updateSettings(patch) {
  mutate((d) => { d.settings = { ...d.settings, ...patch }; });
}

// Garrafas (chips NFC)

export async function listTags() {
  return load().tags;
}

export async function getTag(token) {
  return load().tags.find((t) => t.token === token) ?? null;
}

export async function addTag({ label, ml, token = randomToken() }) {
  const tag = { token, label, ml, createdAt: new Date().toISOString() };
  mutate((d) => { d.tags.push(tag); });
  return tag;
}

export async function updateTag(token, patch) {
  mutate((d) => {
    const tag = d.tags.find((t) => t.token === token);
    if (tag) Object.assign(tag, patch);
  });
}

export async function removeTag(token) {
  mutate((d) => { d.tags = d.tags.filter((t) => t.token !== token); });
}

// Registros

export async function addDrink({ ml, tagToken = null, source = 'manual' }) {
  const drink = {
    id: crypto.randomUUID(),
    tagToken,
    ml,
    source,
    createdAt: new Date().toISOString(),
  };
  mutate((d) => { d.drinks.push(drink); });
  return drink;
}

// Recoloca um registro removido (desfazer), mantendo a ordem cronológica
export async function restoreDrink(drink) {
  mutate((d) => {
    d.drinks.push(drink);
    d.drinks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  });
}

export async function removeDrink(id) {
  mutate((d) => { d.drinks = d.drinks.filter((x) => x.id !== id); });
}

export async function getDrinks(from, to) {
  return load().drinks.filter((x) => {
    const t = new Date(x.createdAt);
    return t >= from && t < to;
  });
}

export async function lastDrinkForTag(token) {
  return load().drinks.filter((x) => x.tagToken === token).at(-1) ?? null;
}

// Acréscimos de meta por dia

export async function getBoosts() {
  return load().boosts;
}

export async function setBoost(day, ml) {
  mutate((d) => {
    if (ml) d.boosts[day] = ml;
    else delete d.boosts[day];
  });
}

// Backup

export async function exportAll() {
  return JSON.stringify(load(), null, 2);
}

export async function importAll(json) {
  const data = JSON.parse(json);
  if (!Array.isArray(data.drinks) || !Array.isArray(data.tags)) {
    throw new Error('Arquivo inválido');
  }
  save(data);
}
