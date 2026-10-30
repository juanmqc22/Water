// Seção Pausas: alongar, descansar a vista, almoço, modo foco e os lembretes.

import * as bar from './bar.js';
import { $, MIN, dayKey, atHour, clockTime, inWork, inTime, amount } from './util.js';
import { say, dismiss, refresh } from './ui.js';
import { isFocusing, lunchNow, RULES } from './game.js';
import { record, mainBottle, GLASS_ML } from './water.js';

// Intervalo mínimo entre duas pausas do mesmo tipo para contarem XP
const GAP = { stretch: 15, eyes: 10 };
const SNOOZE_MIN = 10;
// Água: só lembra quando estiver um copo atrás do ritmo, sem insistir
const WATER = { gap: 30, afterDrink: 20 };
const LUNCH_SNOOZE_MIN = 15;
const LUNCH_WINDOW_MIN = 120;
// Não cobra o tempo antes de a barra ser aberta (evita uma rajada de lembretes)
const OPENED_AT = Date.now();

const REMINDERS = {
  stretch: { title: 'Hora de alongar', text: 'Hora de alongar! Levanta, estica as costas e os braços. 🙆' },
  eyes: { title: 'Descansar a vista', text: 'Descansa a vista: olha para algo bem longe por 20 segundos. 👀' },
};

export function logBreak(kind) {
  const counted = bar.update((d) => {
    const last = d.breaks.filter((x) => x.kind === kind).at(-1);
    if (last && Date.now() - Date.parse(last.at) < GAP[kind] * MIN) return false;
    d.breaks.push({ at: new Date().toISOString(), kind });
    return true;
  });
  dismiss(kind);
  if (!counted) say('Já contei uma pausa dessas agora há pouco. 😉');
  refresh();
  return counted;
}

// Adiar: faz o próximo aviso vir daqui a SNOOZE_MIN
function snooze(kind, gap) {
  bar.update((d) => {
    d.remState[kind] = { fired: Date.now() - (gap - SNOOZE_MIN) * MIN };
  });
}

export function startFocus(minutes) {
  const start = new Date();
  bar.update((d) => {
    d.focus.push({ start: start.toISOString(), end: new Date(start.getTime() + minutes * MIN).toISOString(), done: false });
  });
  say(`Modo foco: ${minutes} min. Eu seguro os lembretes até lá. 🎯`);
  refresh();
}

function stopFocus(quiet = false) {
  bar.update((d) => {
    const f = d.focus.at(-1);
    if (f && !f.done) f.stopped = true;
  });
  if (!quiet) say('Foco encerrado antes da hora. Sem problema!');
  refresh();
}

// Almoço: congela lembretes, ritmo da água e energia até você voltar

export function startLunch() {
  if (lunchNow(bar.load())) return;
  if (isFocusing(bar.load(), new Date())) stopFocus(true);
  bar.update((d) => {
    d.lunches.push({ start: new Date().toISOString(), end: null });
    d.remState.lunch = { day: dayKey(new Date()) };
  });
  for (const id of ['stretch', 'eyes', 'water', 'lunch']) dismiss(id);
  say('Bom almoço! Vou comer também. 😋 Fica tudo pausado até você voltar.', {
    sticky: true, id: 'eating', actions: [{ label: 'Voltei!', primary: true, fn: endLunch }],
  });
  refresh();
}

export function endLunch() {
  const l = lunchNow(bar.load());
  if (!l) return;
  bar.update((d) => { d.lunches.at(-1).end = new Date().toISOString(); });
  dismiss('eating');
  const min = Math.round((Date.now() - Date.parse(l.start)) / MIN);
  say(`Bem-vindo de volta! Foram ${min} min de almoço. Bora? 💪`);
  refresh();
}

export function init() {
  $('#b-stretch').onclick = () => {
    if (logBreak('stretch')) say(`Boa! Corpo agradece. +${RULES.stretch} XP`);
  };
  $('#b-eyes').onclick = () => {
    if (logBreak('eyes')) say(`Olhos descansados. +${RULES.eyes} XP`);
  };
  $('#b-focus').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-focus]');
    if (!btn) return;
    if (btn.dataset.focus === 'stop') stopFocus();
    else startFocus(Number(btn.dataset.focus));
  });
  $('#b-lunch').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lunch]');
    if (!btn) return;
    btn.dataset.lunch === 'start' ? startLunch() : endLunch();
  });
}

const lastBreak = (b, kind) => {
  const x = b.breaks.filter((y) => y.kind === kind).at(-1);
  return x ? Date.parse(x.at) : 0;
};
const lastLunchEnd = (b) => {
  const l = b.lunches.filter((x) => x.end).at(-1);
  return l ? Date.parse(l.end) : 0;
};
const lastDrink = (ctx) => {
  const d = ctx.water.drinks.at(-1);
  return d ? Date.parse(d.createdAt) : 0;
};

// Quando o próximo lembrete de alongar/vista vence
function dueAt(kind, ctx) {
  const { now, b } = ctx;
  const workStart = Math.max(OPENED_AT, atHour(now, b.prefs.workStart).getTime());
  const last = Math.max(workStart, b.remState[kind]?.fired ?? 0, lastBreak(b, kind), lastLunchEnd(b));
  return last + b.reminders[kind].every * MIN;
}

// Quanto falta para alcançar o ritmo agora (ml)
const waterDeficit = (g) => Math.round(g.hydration.expected - g.hydration.total);

function fireBreak(kind, ctx) {
  const r = REMINDERS[kind];
  const every = ctx.b.reminders[kind].every;
  bar.update((d) => { d.remState[kind] = { fired: Date.now() }; });
  say(r.text, {
    sticky: true, id: kind, alert: true, title: r.title,
    actions: [
      { label: kind === 'stretch' ? 'Alonguei!' : 'Feito!', primary: true, fn: () => {
        if (logBreak(kind)) say(`Valeu! +${RULES[kind]} XP`);
      } },
      { label: `+${SNOOZE_MIN} min`, fn: () => snooze(kind, every) },
    ],
  });
}

function fireWater(ctx, deficit) {
  bar.update((d) => { d.remState.water = { fired: Date.now() }; });
  const bottle = mainBottle(ctx.water);
  say(`Tô com sede… estamos ${amount(deficit)} atrás do ritmo. Bora beber? 💧`, {
    sticky: true, id: 'water', alert: true, title: 'Beber água',
    actions: [
      { label: `Copo ${GLASS_ML} ml`, primary: true, fn: () => record(GLASS_ML) },
      { label: `${bottle.label} ${bottle.ml} ml`, fn: () => record(bottle.ml, bottle.token) },
      { label: `+${SNOOZE_MIN} min`, fn: () => snooze('water', WATER.gap) },
    ],
  });
}

function fireLunch() {
  bar.update((d) => { d.remState.lunch = { day: dayKey(new Date()) }; });
  say('Hora do almoço! 🍽️ Quando sair, me avisa que eu pauso tudo.', {
    sticky: true, id: 'lunch', alert: true, title: 'Hora do almoço',
    actions: [
      { label: 'Vou almoçar', primary: true, fn: startLunch },
      { label: `+${LUNCH_SNOOZE_MIN} min`, fn: () => bar.update((d) => {
        d.remState.lunch = { snoozeUntil: Date.now() + LUNCH_SNOOZE_MIN * MIN };
      }) },
    ],
  });
}

function lunchDue({ now, b }) {
  if (!b.prefs.lunchReminder || !b.prefs.lunchAt) return false;
  const today = dayKey(now);
  if (b.lunches.some((l) => dayKey(new Date(l.start)) === today)) return false;
  const st = b.remState.lunch ?? {};
  if (st.day === today) return false;
  if (st.snoozeUntil && st.snoozeUntil > now) return false;
  const [h, m] = b.prefs.lunchAt.split(':').map(Number);
  const at = atHour(now, h + m / 60).getTime();
  // Depois de 2 h do horário não faz mais sentido chamar para o almoço
  return now >= at && now - at < LUNCH_WINDOW_MIN * MIN;
}

// Chamado a cada ciclo: dispara lembretes vencidos e fecha sessões de foco
export function tick(ctx) {
  const { now, b, g } = ctx;
  const f = b.focus.at(-1);
  if (f && !f.done && !f.stopped && Date.parse(f.end) <= now) {
    bar.update((d) => { d.focus.at(-1).done = true; });
    say(`Foco concluído! +${RULES.focus} XP. Que tal uma pausa agora?`, {
      alert: true, title: 'Foco concluído', sticky: true, urgent: true, id: 'focus',
      actions: [{ label: 'Alonguei!', primary: true, fn: () => logBreak('stretch') }, { label: 'Depois' }],
    });
    return true;
  }
  if (g.lunch || !inWork(b.prefs, now) || isFocusing(b, now)) return false;

  if (lunchDue(ctx)) fireLunch();
  for (const kind of ['stretch', 'eyes']) {
    if (b.reminders[kind].on && now >= dueAt(kind, ctx)) fireBreak(kind, ctx);
  }
  const deficit = waterDeficit(g);
  // Voltou ao ritmo (bebeu por outro caminho): tira o pedido antigo do balão
  if (deficit < GLASS_ML) dismiss('water');
  if (b.reminders.water.on) {
    const calm = now - Math.max(b.remState.water?.fired ?? 0, OPENED_AT) >= WATER.gap * MIN;
    if (deficit >= GLASS_ML && calm && now - lastDrink(ctx) >= WATER.afterDrink * MIN) fireWater(ctx, deficit);
  }
  return false;
}

export function render(ctx) {
  const { now, b, g } = ctx;
  const k = dayKey(now);
  const today = (kind) => b.breaks.filter((x) => x.kind === kind && dayKey(new Date(x.at)) === k).length;
  const stretch = today('stretch');
  const eyes = today('eyes');
  $('#breaks-meta').textContent = g.lunch ? '🍽️ almoçando' : `${stretch} alongamento${stretch === 1 ? '' : 's'}`;
  $('#b-stretch-count').textContent = `${stretch}/${RULES.stretchMax}`;
  $('#b-eyes-count').textContent = `${eyes}/${RULES.eyesMax}`;

  $('#b-lunch').innerHTML = g.lunch
    ? `<span class="lunch-on">🍽️ Almoçando desde ${clockTime(new Date(g.lunch.start))}</span><button class="pill primary" data-lunch="end">Voltei</button>`
    : '<button class="btn wide-btn" data-lunch="start">🍽️ Sair para almoçar</button>';

  const focusing = isFocusing(b, now);
  const f = b.focus.at(-1);
  $('#b-focus').hidden = Boolean(g.lunch);
  $('#b-focus').innerHTML = focusing
    ? `<span class="focus-on">🎯 Foco até ${clockTime(new Date(f.end))}</span><button class="pill" data-focus="stop">Encerrar</button>`
    : `<span class="muted">Foco</span><button class="pill" data-focus="25">25 min</button><button class="pill" data-focus="50">50 min</button>`;

  // Próximos lembretes
  const lines = [];
  if (g.lunch) {
    lines.push('Tudo pausado durante o almoço: lembretes, ritmo da água e energia.');
  } else if (!inWork(b.prefs, now)) {
    lines.push(`Fora do expediente (${b.prefs.workStart}h–${b.prefs.workEnd}h). Lembretes pausados.`);
  } else if (focusing) {
    lines.push('Lembretes segurados durante o foco.');
  } else {
    const names = { stretch: 'Alongar', eyes: 'Vista' };
    for (const kind of ['stretch', 'eyes']) {
      if (b.reminders[kind].on) lines.push(`${names[kind]} ${inTime(dueAt(kind, ctx) - now)}`);
    }
    if (b.reminders.water.on) {
      const deficit = waterDeficit(g);
      lines.push(deficit >= GLASS_ML ? `Água ${amount(deficit)} atrás do ritmo` : 'Água no ritmo ✓');
    }
  }
  $('#b-next').textContent = lines.join(' · ');
}
