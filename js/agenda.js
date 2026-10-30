// Seção Agenda: compromissos digitados à mão, com aviso 5 min antes.

import * as bar from './bar.js';
import { $, esc, MIN, dayKey, addDays, startOfDay, inTime } from './util.js';
import { say, refresh } from './ui.js';

const WARN_MIN = 5;
const KEEP_DAYS = 30;

const eventTime = (e) => new Date(`${e.date}T${e.time || '00:00'}`).getTime();

export function init() {
  $('#a-date').value = dayKey(new Date());
  $('#a-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('#a-title').value.trim();
    if (!title) return;
    const ev = { id: bar.newId(), title, date: $('#a-date').value || dayKey(new Date()), time: $('#a-time').value, warned: false };
    bar.update((d) => {
      d.events.push(ev);
      d.events.sort((a, b) => eventTime(a) - eventTime(b));
    });
    $('#a-title').value = '';
    $('#a-time').value = '';
    refresh();
  });
  $('#a-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    bar.update((d) => { d.events = d.events.filter((x) => x.id !== btn.dataset.del); });
    refresh();
  });
}

export function nextEvent(b, now) {
  const today = dayKey(now);
  return b.events.find((e) => e.date === today && e.time && eventTime(e) >= now - MIN) ?? null;
}

export function tick({ now, b }) {
  const due = b.events.filter((e) => e.time && !e.warned && eventTime(e) - now <= WARN_MIN * MIN && eventTime(e) - now > -30 * MIN);
  const oldest = dayKey(addDays(startOfDay(now), -KEEP_DAYS));
  if (!due.length && !b.events.some((e) => e.date < oldest)) return;
  bar.update((d) => {
    d.events = d.events.filter((e) => e.date >= oldest);
    for (const e of d.events) if (due.some((x) => x.id === e.id)) e.warned = true;
  });
  for (const e of due) {
    const left = eventTime(e) - now;
    const when = left > 0 ? inTime(left) : 'agora';
    say(`📅 ${e.title} ${when} (${e.time}).`, {
      sticky: true, urgent: true, id: `ev-${e.id}`, alert: true, title: e.title,
      actions: [{ label: 'Ok', primary: true }],
    });
  }
}

export function render({ now, b }) {
  const today = dayKey(now);
  const limit = dayKey(addDays(startOfDay(now), 7));
  const list = b.events.filter((e) => e.date >= today && e.date <= limit);
  const label = (e) => {
    if (e.date === today) return 'Hoje';
    if (e.date === dayKey(addDays(startOfDay(now), 1))) return 'Amanhã';
    return new Date(`${e.date}T12:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }).replace('.', '');
  };
  const todays = list.filter((e) => e.date === today).length;
  $('#agenda-meta').textContent = todays ? `${todays} hoje` : '';
  $('#a-list').innerHTML = list.map((e) => `
    <li class="${e.date === today && e.time && eventTime(e) < now ? 'past' : ''}">
      <span class="a-when">${label(e)}${e.time ? ` · ${e.time}` : ''}</span>
      <span class="a-title">${esc(e.title)}</span>
      <button class="x" data-del="${e.id}" aria-label="Apagar">×</button>
    </li>`).join('') || '<li class="empty">Nada nos próximos 7 dias.</li>';

  const next = nextEvent(b, now);
  $('#next-event').textContent = next ? `${next.time} · ${next.title}` : '';
}
