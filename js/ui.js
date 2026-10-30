// Peças de interface compartilhadas: toast, balão do pet, som e notificações.

import { $ } from './util.js';
import * as bar from './bar.js';

let refresher = () => {};
export const setRefresher = (fn) => { refresher = fn; };
export const refresh = () => refresher();

// Toast

let toastTimer;

export function toast(text, actionLabel, action) {
  $('#toast-text').textContent = text;
  const btn = $('#toast-action');
  btn.hidden = !actionLabel;
  btn.textContent = actionLabel ?? '';
  btn.onclick = async () => {
    $('#toast').hidden = true;
    await action?.();
  };
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6000);
}

// Balão de fala do pet. Lembretes ficam até serem respondidos;
// falas comuns somem sozinhas e esperam na fila se houver um lembrete.

let current = null;
const queue = [];
let hideTimer;

export function say(text, { actions = [], sticky = false, urgent = false, id = null, alert = false, title } = {}) {
  const msg = { text, actions, sticky, id };
  if (alert) {
    chime();
    notify(title ?? 'Barra', text);
  }
  if (id) {
    const i = queue.findIndex((m) => m.id === id);
    if (i >= 0) queue.splice(i, 1);
    if (current?.id === id) return show(msg);
  }
  // Urgente (agenda, fim do foco) passa na frente; o lembrete atual volta para a fila
  if (urgent && current?.sticky) {
    queue.unshift(current);
    return show(msg);
  }
  if (current?.sticky) {
    queue.push(msg);
    if (queue.length > 4) queue.shift();
    return;
  }
  show(msg);
}

export const balloonBusy = () => Boolean(current);

export function dismiss(id) {
  if (id && current?.id !== id) {
    const i = queue.findIndex((m) => m.id === id);
    if (i >= 0) queue.splice(i, 1);
    return;
  }
  current = null;
  $('#balloon').hidden = true;
  const next = queue.findIndex((m) => m.sticky);
  if (next >= 0) show(queue.splice(next, 1)[0]);
  else if (queue.length) show(queue.shift());
}

function show(msg) {
  current = msg;
  clearTimeout(hideTimer);
  $('#balloon-text').textContent = msg.text;
  const box = $('#balloon-actions');
  box.innerHTML = '';
  for (const a of msg.actions) {
    const b = document.createElement('button');
    b.className = a.primary ? 'pill primary' : 'pill';
    b.textContent = a.label;
    b.onclick = async () => {
      dismiss();
      await a.fn?.();
    };
    box.append(b);
  }
  box.hidden = !msg.actions.length;
  $('#balloon').hidden = false;
  if (!msg.sticky) hideTimer = setTimeout(() => { if (current === msg) dismiss(); }, 9000);
}

// Som: dois toques suaves. O navegador só libera áudio depois de um clique.

let audio;
addEventListener('pointerdown', () => {
  try {
    audio ??= new AudioContext();
    audio.resume();
  } catch {}
}, { capture: true });

export function chime(force = false) {
  if (!force && !bar.load().prefs.sound) return;
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    [[660, 0], [880, 0.16]].forEach(([freq, at]) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + at);
      gain.gain.exponentialRampToValueAtTime(0.12, t + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.45);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + at);
      osc.stop(t + at + 0.5);
    });
  } catch {}
}

// Notificação do Windows só quando a barra não está em foco
export function notify(title, body, force = false) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!force && (!bar.load().prefs.notify || document.hasFocus())) return;
  const n = new Notification(title, { body, icon: 'icon.svg', tag: title });
  n.onclick = () => { window.focus(); n.close(); };
}

// Seções recolhíveis

export function bindSections() {
  const collapsed = bar.load().ui.collapsed;
  for (const sec of document.querySelectorAll('.sec')) {
    const id = sec.dataset.sec;
    sec.classList.toggle('collapsed', Boolean(collapsed[id]));
    sec.querySelector('.sec-toggle').addEventListener('click', () => {
      const on = sec.classList.toggle('collapsed');
      bar.update((d) => { d.ui.collapsed[id] = on; });
    });
  }
}
