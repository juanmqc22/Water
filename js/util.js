// Utilidades compartilhadas. Datas sempre no fuso local do aparelho.

export const $ = (sel, root = document) => root.querySelector(sel);
export const MIN = 60000;

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const atHour = (d, h) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(h), Math.round((h % 1) * 60));
export const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const clockTime = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const hoursOf = (d) => d.getHours() + d.getMinutes() / 60;

export const liters = (ml, min = 1) =>
  (ml / 1000).toLocaleString('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: 2 });
export const amount = (ml) => (ml >= 1000 ? `${liters(ml)} L` : `${Math.round(ml)} ml`);

export const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function inWork(prefs, now) {
  const h = hoursOf(now);
  return h >= prefs.workStart && h < prefs.workEnd;
}

// "em 12 min", "em 1 h 05"
export function inTime(ms) {
  const m = Math.max(0, Math.round(ms / MIN));
  if (m < 60) return `em ${m} min`;
  return `em ${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
