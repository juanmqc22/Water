// Seção Água: anel de progresso, registro rápido, semana e registros de hoje.

import * as store from './storage.js';
import { $, esc, dayKey, startOfDay, addDays, clockTime, liters, amount, hoursOf } from './util.js';
import { toast, refresh } from './ui.js';

export const GLASS_ML = 250;
const DEFAULT_BOTTLE_ML = 500;
const TRAIN_BOOST_ML = 500;
const RING = 2 * Math.PI * 34;

export async function loadWater() {
  const [settings, tags, boosts, drinks] = await Promise.all([
    store.getSettings(), store.listTags(), store.getBoosts(),
    store.getDrinks(new Date(0), new Date(8.64e15)),
  ]);
  return { settings, tags, boosts, drinks };
}

// A garrafa principal é a última usada (ou a primeira cadastrada)
export function mainBottle(w) {
  for (let i = w.drinks.length - 1; i >= 0; i--) {
    const tag = w.tags.find((t) => t.token === w.drinks[i].tagToken);
    if (tag) return tag;
  }
  return w.tags[0] ?? { token: null, label: 'Garrafa', ml: DEFAULT_BOTTLE_ML };
}

export async function record(ml, tagToken = null, source = 'manual') {
  const drink = await store.addDrink({ ml, tagToken, source });
  await refresh();
  toast(`+${ml} ml`, 'Desfazer', async () => {
    await store.removeDrink(drink.id);
    await refresh();
  });
}

function statusFor(total, goal, s, now, bottleMl) {
  if (total >= goal) return ['done', 'Meta atingida'];
  const h = hoursOf(now);
  if (h < s.windowStart) return total ? ['ok', 'No ritmo'] : ['idle', `Começa às ${s.windowStart}h`];
  if (h >= s.windowEnd) return ['behind', `Faltam ${amount(goal - total)}`];
  const frac = (h - s.windowStart) / (s.windowEnd - s.windowStart);
  const delta = total - goal * frac;
  if (delta >= bottleMl / 2) return ['ahead', `${amount(delta)} à frente`];
  if (delta > -bottleMl / 2) return ['ok', 'No ritmo'];
  const n = Math.ceil(-delta / bottleMl);
  return ['behind', `${n} garrafa${n > 1 ? 's' : ''} atrás`];
}

export function init() {
  $('#w-bottle').onclick = async () => {
    const b = mainBottle(await loadWater());
    record(b.ml, b.token);
  };
  $('#w-glass').onclick = () => record(GLASS_ML);
  $('#w-train').onclick = async () => {
    const key = dayKey(new Date());
    const boosts = await store.getBoosts();
    await store.setBoost(key, boosts[key] ? 0 : TRAIN_BOOST_ML);
    refresh();
  };
  $('#w-today').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    const drinks = await store.getDrinks(new Date(0), new Date(8.64e15));
    const d = drinks.find((x) => x.id === btn.dataset.del);
    if (!d) return;
    await store.removeDrink(d.id);
    await refresh();
    toast(`${d.ml} ml removidos`, 'Desfazer', async () => {
      await store.restoreDrink(d);
      await refresh();
    });
  });
}

// Link de garrafa (?tag=...): registra direto, com proteção contra duplicado
export async function handleTagLink() {
  const token = new URLSearchParams(location.search).get('tag');
  if (!token) return;
  history.replaceState(null, '', location.pathname);
  const tag = await store.getTag(token);
  if (!tag) return toast('Garrafa não reconhecida');
  const s = await store.getSettings();
  const last = await store.lastDrinkForTag(token);
  const ago = last ? Date.now() - Date.parse(last.createdAt) : Infinity;
  if (ago < s.cooldownMin * 60000) {
    const min = Math.round(ago / 60000);
    toast(min < 1 ? 'Registrado há instantes' : `Já registrado há ${min} min`, 'Registrar', () =>
      record(tag.ml, token, 'nfc'));
    return;
  }
  await record(tag.ml, token, 'nfc');
}

export function render({ now, water: w }) {
  const s = w.settings;
  const today = startOfDay(now);
  const key = dayKey(today);
  const totals = {};
  for (const d of w.drinks) {
    const k = dayKey(new Date(d.createdAt));
    totals[k] = (totals[k] ?? 0) + d.ml;
  }
  const goalFor = (k) => s.goalMl + (w.boosts[k] ?? 0);
  const total = totals[key] ?? 0;
  const goal = goalFor(key);
  const bottle = mainBottle(w);
  const [tone, status] = statusFor(total, goal, s, now, bottle.ml);

  $('#water-meta').textContent = `${liters(total)} / ${liters(goal)} L`;
  $('#w-amount').textContent = liters(total);
  $('#w-goal').textContent = `de ${liters(goal)} L`;
  const chip = $('#w-status');
  chip.className = `chip tone-${tone}`;
  chip.textContent = status;

  const pct = Math.min(total / goal, 1);
  const fill = $('#ring-fill');
  fill.style.strokeDashoffset = RING * (1 - pct);
  fill.classList.toggle('done', pct >= 1);
  fill.style.opacity = pct > 0 ? 1 : 0;

  const frac = Math.min(1, Math.max(0, (hoursOf(now) - s.windowStart) / (s.windowEnd - s.windowStart)));
  const pace = $('#ring-pace');
  pace.style.display = frac > 0 && frac < 1 && total < goal ? '' : 'none';
  const a = frac * 2 * Math.PI - Math.PI / 2;
  pace.setAttribute('cx', 40 + 34 * Math.cos(a));
  pace.setAttribute('cy', 40 + 34 * Math.sin(a));

  $('#w-bottle-label').textContent = `${bottle.label} ${bottle.ml} ml`;
  const trained = Boolean(w.boosts[key]);
  $('#w-train').setAttribute('aria-pressed', trained);
  $('#w-train').textContent = trained ? `Treino +${liters(TRAIN_BOOST_ML)} L` : 'Treino';

  // Semana
  const week = $('#w-week');
  week.innerHTML = '';
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const k = dayKey(d);
    const t = totals[k] ?? 0;
    const g = goalFor(k);
    const short = d.toLocaleDateString('pt-BR', { weekday: 'narrow' });
    week.insertAdjacentHTML('beforeend', `
      <div class="wk ${t >= g ? 'met' : ''} ${i === 0 ? 'today' : ''}" title="${esc(d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' }))}: ${liters(t)} L">
        <div class="wk-bar"><i style="height:${Math.min(t / g, 1) * 100}%"></i></div>
        <span>${short.toUpperCase()}</span>
      </div>`);
  }

  // Registros de hoje
  const list = w.drinks.filter((d) => dayKey(new Date(d.createdAt)) === key).reverse();
  $('#w-today').innerHTML = list.length
    ? list.map((d) => `<li><span>${clockTime(new Date(d.createdAt))}</span><b>${d.ml} ml</b>
        <button class="x" data-del="${d.id}" aria-label="Apagar">×</button></li>`).join('')
    : '<li class="empty">Nada registrado hoje ainda.</li>';
}
