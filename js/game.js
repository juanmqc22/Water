// Regras do jogo. Tudo é calculado a partir dos dados reais (água, pausas,
// tarefas, foco), então "desfazer" também desfaz o XP — não há como inflar.

import { dayKey, startOfDay, addDays, atHour, hoursOf, clamp, inWork, MIN } from './util.js';

// Números grandes para cada ação dar gosto; a curva e as moedas compensam.
export const RULES = {
  waterPer50ml: 6, // copo de 250 ml = 30 XP; até a meta (2,5 L = 300 XP)
  goalBonus: 100,
  streakStep: 10, // +10 por dia de sequência, até +100
  streakMax: 10,
  stretch: 50, stretchMax: 8,
  eyes: 25, eyesMax: 10,
  focus: 75, focusMax: 6,
  tasks: [50, 50, 50, 25, 25, 25], taskRest: 10, // rende menos depois de muitas no dia
};

// Moedas: 1 a cada 10 XP. Vêm do XP, então também não dá para inflar.
export const COIN_XP = 10;

// Curva de nível: o nível N pede LEVEL_K × (N−1)² XP. Com ~1.250 XP/dia:
// nível 5 no 1º dia, 10 em ~5 dias, catálogo inteiro em ~10 dias.
const LEVEL_K = 75;

export const xpAt = (level) => LEVEL_K * (level - 1) ** 2;
export const levelFor = (xp) => Math.floor(Math.sqrt(xp / LEVEL_K)) + 1;
export const stageFor = (level) => (level >= 10 ? 3 : level >= 5 ? 2 : 1);

export function waterTotals(drinks) {
  const t = {};
  for (const d of drinks) {
    const k = dayKey(new Date(d.createdAt));
    t[k] = (t[k] ?? 0) + d.ml;
  }
  return t;
}

function countBy(list, dateOf, filter = () => true) {
  const out = {};
  for (const x of list) {
    if (!filter(x)) continue;
    const k = dayKey(new Date(dateOf(x)));
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function dayXp(k, { totals, goalFor, stretch, eyes, tasks, focus }, streak) {
  const total = totals[k] ?? 0;
  const goal = goalFor(k);
  let xp = Math.floor(Math.min(total, goal) / 50) * RULES.waterPer50ml;
  if (total >= goal) xp += RULES.goalBonus + RULES.streakStep * Math.min(streak - 1, RULES.streakMax);
  xp += Math.min(stretch[k] ?? 0, RULES.stretchMax) * RULES.stretch;
  xp += Math.min(eyes[k] ?? 0, RULES.eyesMax) * RULES.eyes;
  xp += Math.min(focus[k] ?? 0, RULES.focusMax) * RULES.focus;
  for (let i = 0; i < (tasks[k] ?? 0); i++) xp += RULES.tasks[i] ?? RULES.taskRest;
  return xp;
}

export function compute({ now, water, b }) {
  const totals = waterTotals(water.drinks);
  const goalFor = (k) => water.settings.goalMl + (water.boosts[k] ?? 0);
  const days = {
    totals, goalFor,
    stretch: countBy(b.breaks, (x) => x.at, (x) => x.kind === 'stretch'),
    eyes: countBy(b.breaks, (x) => x.at, (x) => x.kind === 'eyes'),
    tasks: countBy(b.tasks, (x) => x.doneAt, (x) => x.doneAt),
    focus: countBy(b.focus, (x) => x.end, (x) => x.done),
  };

  const today = startOfDay(now);
  const todayKey = dayKey(today);
  const petStart = b.pet ? startOfDay(new Date(b.pet.createdAt)) : today;
  const first = water.drinks[0] ? startOfDay(new Date(water.drinks[0].createdAt)) : petStart;

  // A sequência considera o histórico de água anterior ao pet; o XP, não
  let xp = 0;
  let todayXp = 0;
  let streak = 0;
  let maxStreak = 0;
  for (let d = first < petStart ? first : petStart; d <= today; d = addDays(d, 1)) {
    const k = dayKey(d);
    if ((totals[k] ?? 0) >= goalFor(k)) streak++;
    else if (k !== todayKey) streak = 0;
    maxStreak = Math.max(maxStreak, streak);
    if (d < petStart) continue;
    const gained = dayXp(k, days, streak);
    xp += gained;
    if (k === todayKey) todayXp = gained;
  }

  const level = levelFor(xp);
  const sum = (o) => Object.values(o).reduce((a, n) => a + n, 0);
  // Totais de sempre, usados pelas conquistas
  const stats = {
    maxStreak,
    stretch: sum(days.stretch),
    focus: sum(days.focus),
    tasks: sum(days.tasks),
    waterMl: sum(totals),
  };
  return {
    xp, todayXp, level, streak, stats,
    coinsEarned: Math.floor(xp / COIN_XP),
    stage: stageFor(level),
    levelFrom: xpAt(level),
    levelTo: xpAt(level + 1),
    ...needsFor({ now, water, b, totals, goalFor, todayKey }),
  };
}

// Almoço em andamento (ou null)
export const lunchNow = (b) => {
  const l = b.lunches.at(-1);
  return l && !l.end ? l : null;
};

const LUNCH_PLANNED_MIN = 60;

function lunchMinToday(b, now) {
  const k = dayKey(now);
  return b.lunches
    .filter((l) => dayKey(new Date(l.start)) === k)
    .reduce((m, l) => m + ((l.end ? Date.parse(l.end) : now.getTime()) - Date.parse(l.start)) / MIN, 0);
}

// Quanto do "dia de água" já passou (0–1). O tempo de almoço não conta, e o
// dia é dividido já reservando 1 h de almoço: durante o almoço o ritmo fica parado.
export function paceFraction(now, s, b) {
  const len = (s.windowEnd - s.windowStart) * 60;
  const lunch = lunchMinToday(b, now);
  const elapsed = (hoursOf(now) - s.windowStart) * 60 - lunch;
  return clamp(elapsed / (len - Math.max(lunch, LUNCH_PLANNED_MIN)), 0, 1);
}

// Necessidades (0–100) e a cara do pet
function needsFor({ now, water, b, totals, goalFor, todayKey }) {
  const s = water.settings;
  const total = totals[todayKey] ?? 0;
  const goal = goalFor(todayKey);
  const expected = goal * paceFraction(now, s, b);
  const lunch = lunchNow(b);
  const hydration = total >= goal || expected <= 0 ? 100 : clamp((total / expected) * 100);

  const working = inWork(b.prefs, now);
  let energy = 100;
  if (working) {
    const lastStretch = b.breaks.filter((x) => x.kind === 'stretch').at(-1);
    const lastLunch = b.lunches.filter((l) => l.end).at(-1);
    const since = Math.max(
      atHour(now, b.prefs.workStart).getTime(),
      b.pet ? Date.parse(b.pet.createdAt) : 0,
      lastStretch ? Date.parse(lastStretch.at) : 0,
      lastLunch ? Date.parse(lastLunch.end) : 0,
    );
    // No almoço a energia congela no valor de quando você saiu
    const ref = lunch ? Date.parse(lunch.start) : now.getTime();
    const every = b.reminders.stretch.every;
    energy = clamp(100 - ((ref - since) / MIN / (every * 2)) * 100);
  }

  const open = b.tasks.filter((t) => !t.doneAt && !t.archived).length;
  const doneToday = b.tasks.filter((t) => t.doneAt && dayKey(new Date(t.doneAt)) === todayKey).length;
  const mood = open + doneToday === 0 ? 75 : clamp(35 + (65 * doneToday) / (open + doneToday) + (open === 0 ? 100 : 0));

  const focusing = isFocusing(b, now);
  const needs = { water: Math.round(hydration), energy: Math.round(energy), mood: Math.round(mood) };
  return {
    needs, working, focusing, lunch,
    face: lunch ? 'eat' : faceFor(needs, working, focusing),
    hydration: { total, goal, expected },
  };
}

export function isFocusing(b, now) {
  const f = b.focus.at(-1);
  return Boolean(f && !f.done && !f.stopped && Date.parse(f.end) > now);
}

function faceFor(needs, working, focusing) {
  if (!working) return 'sleep';
  if (focusing) return 'focus';
  const [worst, value] = Object.entries(needs).sort((a, b) => a[1] - b[1])[0];
  if (value < 35) return { water: 'thirsty', energy: 'tired', mood: 'sad' }[worst];
  return value < 65 ? 'ok' : 'happy';
}
