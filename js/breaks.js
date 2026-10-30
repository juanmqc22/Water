// Seção Pausas: alongar, descansar a vista, modo foco e os lembretes.

import * as bar from './bar.js';
import { $, MIN, dayKey, atHour, clockTime, inWork, inTime } from './util.js';
import { say, dismiss, refresh } from './ui.js';
import { isFocusing, RULES } from './game.js';
import { record, mainBottle, GLASS_ML } from './water.js';

// Intervalo mínimo entre duas pausas do mesmo tipo para contarem XP
const GAP = { stretch: 15, eyes: 10 };
const SNOOZE_MIN = 10;
// Não cobra o tempo antes de a barra ser aberta (evita uma rajada de lembretes)
const OPENED_AT = Date.now();

const REMINDERS = {
  stretch: { title: 'Hora de alongar', text: 'Hora de alongar! Levanta, estica as costas e os braços. 🙆' },
  eyes: { title: 'Descansar a vista', text: 'Descansa a vista: olha para algo bem longe por 20 segundos. 👀' },
  water: { title: 'Beber água', text: 'Tô com sede… bora beber um pouco de água? 💧' },
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

function snooze(kind, every) {
  bar.update((d) => {
    d.remState[kind] = { fired: Date.now() - (every - SNOOZE_MIN) * MIN };
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

function stopFocus() {
  bar.update((d) => {
    const f = d.focus.at(-1);
    if (f && !f.done) f.stopped = true;
  });
  say('Foco encerrado antes da hora. Sem problema!');
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
}

function lastDone(kind, ctx) {
  if (kind === 'water') {
    const d = ctx.water.drinks.at(-1);
    return d ? Date.parse(d.createdAt) : 0;
  }
  const b = ctx.b.breaks.filter((x) => x.kind === kind).at(-1);
  return b ? Date.parse(b.at) : 0;
}

function fire(kind, ctx) {
  const r = REMINDERS[kind];
  const every = ctx.b.reminders[kind].every;
  bar.update((d) => { d.remState[kind] = { fired: Date.now() }; });
  const later = { label: `+${SNOOZE_MIN} min`, fn: () => snooze(kind, every) };
  let actions;
  if (kind === 'water') {
    const bottle = mainBottle(ctx.water);
    actions = [
      { label: `Copo ${GLASS_ML} ml`, primary: true, fn: () => record(GLASS_ML) },
      { label: `${bottle.label} ${bottle.ml} ml`, fn: () => record(bottle.ml, bottle.token) },
      later,
    ];
  } else {
    actions = [
      { label: kind === 'stretch' ? 'Alonguei!' : 'Feito!', primary: true, fn: () => {
        if (logBreak(kind)) say(`Valeu! +${RULES[kind]} XP`);
      } },
      later,
    ];
  }
  say(r.text, { sticky: true, id: kind, alert: true, title: r.title, actions });
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
  if (!inWork(b.prefs, now) || isFocusing(b, now)) return false;

  const workStart = Math.max(OPENED_AT, atHour(now, b.prefs.workStart).getTime());
  for (const kind of ['stretch', 'eyes', 'water']) {
    const r = b.reminders[kind];
    if (!r.on) continue;
    if (kind === 'water' && g.needs.water >= 100) continue;
    const last = Math.max(workStart, b.remState[kind]?.fired ?? 0, lastDone(kind, ctx));
    if (now - last >= r.every * MIN) fire(kind, ctx);
  }
  return false;
}

export function render(ctx) {
  const { now, b } = ctx;
  const k = dayKey(now);
  const today = (kind) => b.breaks.filter((x) => x.kind === kind && dayKey(new Date(x.at)) === k).length;
  const stretch = today('stretch');
  const eyes = today('eyes');
  $('#breaks-meta').textContent = `${stretch} alongamento${stretch === 1 ? '' : 's'}`;
  $('#b-stretch-count').textContent = `${stretch}/${RULES.stretchMax}`;
  $('#b-eyes-count').textContent = `${eyes}/${RULES.eyesMax}`;

  const focusing = isFocusing(b, now);
  const f = b.focus.at(-1);
  $('#b-focus').innerHTML = focusing
    ? `<span class="focus-on">🎯 Foco até ${clockTime(new Date(f.end))}</span><button class="pill" data-focus="stop">Encerrar</button>`
    : `<span class="muted">Foco</span><button class="pill" data-focus="25">25 min</button><button class="pill" data-focus="50">50 min</button>`;

  // Próximos lembretes
  const lines = [];
  if (!inWork(b.prefs, now)) {
    lines.push(`Fora do expediente (${b.prefs.workStart}h–${b.prefs.workEnd}h). Lembretes pausados.`);
  } else if (focusing) {
    lines.push('Lembretes segurados durante o foco.');
  } else {
    const workStart = Math.max(OPENED_AT, atHour(now, b.prefs.workStart).getTime());
    const names = { stretch: 'Alongar', eyes: 'Vista', water: 'Água' };
    for (const kind of ['stretch', 'eyes', 'water']) {
      const r = b.reminders[kind];
      if (!r.on) continue;
      const last = Math.max(workStart, b.remState[kind]?.fired ?? 0, lastDone(kind, ctx));
      lines.push(`${names[kind]} ${inTime(last + r.every * MIN - now)}`);
    }
  }
  $('#b-next').textContent = lines.join(' · ');
}
