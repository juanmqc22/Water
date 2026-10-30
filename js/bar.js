// Dados da barra (pet, tarefas, pausas, música, preferências).
// A água continua em storage.js, com a chave antiga, para manter o histórico.

const KEY = 'barra.v1';

const DEFAULTS = {
  version: 1,
  pet: null, // { species, name, createdAt }
  tasks: [], // { id, text, createdAt, doneAt, archived }
  notes: '',
  breaks: [], // { at, kind: 'stretch' | 'eyes' } — só pausas que contaram
  focus: [], // { start, end, done }
  music: { items: [], current: null, volume: 60 }, // item: { id, kind, ref, title }
  reminders: {
    stretch: { on: true, every: 60 },
    eyes: { on: true, every: 40 },
    water: { on: true, every: 60 },
  },
  remState: {}, // { kind: { fired } }
  prefs: { workStart: 8, workEnd: 18, sound: true, notify: true },
  ui: { collapsed: {} },
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function merge(base, data) {
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(data ?? {})) {
    out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

export function load() {
  try {
    return merge(DEFAULTS, JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function update(fn) {
  const data = load();
  const result = fn(data);
  save(data);
  return result;
}

export const newId = () => crypto.randomUUID();
