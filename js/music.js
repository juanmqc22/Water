// Seção Música. O player toca embutido na barra ou numa janela destacada
// (que continua tocando com a barra lateral fechada). Nos dois casos os
// controles daqui funcionam: a janela recebe os comandos pelo BroadcastChannel.

import * as bar from './bar.js';
import { $, esc } from './util.js';
import { toast, say, refresh } from './ui.js';
import { createPlayer, currentItem, findItem, CHANNEL, ERRORS } from './player.js';

const channel = new BroadcastChannel(CHANNEL);
const send = (msg) => channel.postMessage(msg);

let local = null; // player embutido
let detached = false; // a janela destacada está aberta
let handoff = null; // posição a passar para a janela quando ela abrir
let playing = false;
let title = '';
let onPlayingChange = () => {};

export const isPlaying = () => playing;
export const setOnPlayingChange = (fn) => { onPlayingChange = fn; };

// Aceita watch?v=, youtu.be, shorts, embed, live, playlist e music.youtube.com
export function parseYouTube(text) {
  let u;
  try { u = new URL(text.trim()); } catch { return null; }
  if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname)) return null;
  const list = u.searchParams.get('list');
  if (list && !list.startsWith('RD')) return { kind: 'playlist', ref: list };
  let id = u.searchParams.get('v');
  if (!id && u.hostname.endsWith('youtu.be')) id = u.pathname.slice(1);
  if (!id) id = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1];
  return id ? { kind: 'video', ref: id.slice(0, 11) } : null;
}

function setState(isOn, newTitle) {
  const was = playing;
  playing = isOn;
  if (newTitle) title = newTitle;
  if (was !== playing) {
    onPlayingChange(playing);
    if (playing && Math.random() < 0.3) say('🎵 Adoro essa!');
  }
  renderNow();
  renderControls();
}

const showError = (code) => toast(ERRORS[code] ?? `Erro do YouTube (${code})`);

function startLocal(resume) {
  if (local) return;
  $('#player').innerHTML = '<div id="yt"></div>';
  local = createPlayer('yt', { onState: (s) => setState(s.playing, s.title), onError: showError });
  const item = resume && findItem(resume.id);
  if (item) local.load(item, { autoplay: resume.playing, start: resume.start, index: resume.index });
}

function stopLocal() {
  local?.destroy();
  local = null;
}

function setDetached(on) {
  detached = on;
  if (on) stopLocal();
  $('#music-sec').classList.toggle('detached', on);
}

// Comandos: vão para a janela destacada ou para o player embutido
const control = {
  load(item) { detached ? send({ type: 'load', id: item.id }) : local?.load(item); },
  toggle() {
    if (detached) return send({ type: 'toggle' });
    if (!local?.toggle()) toast('Adicione um link do YouTube primeiro');
  },
  step(dir) { detached ? send({ type: 'step', dir }) : local?.step(dir); },
  volume(v) { detached ? send({ type: 'volume', v }) : local?.setVolume(v); },
};

function detach() {
  const win = window.open('player.html', 'barra-player', 'popup,width=460,height=340');
  if (!win) return toast('O navegador bloqueou a janela. Permita pop-ups para este site.');
  handoff = { id: currentItem()?.id, playing, ...(local?.position() ?? {}) };
  local?.pause();
  setDetached(true);
  setState(false);
}

channel.onmessage = ({ data: msg }) => {
  switch (msg.type) {
    case 'hello': // a janela abriu e pede de onde continuar
      setDetached(true);
      send({ type: 'handoff', resume: handoff });
      handoff = null;
      break;
    case 'state':
      if (!detached) setDetached(true);
      setState(msg.playing, msg.title);
      break;
    case 'bye': // a janela fechou: o player volta para a barra
      setDetached(false);
      setState(false);
      startLocal(msg.resume);
      refresh();
      break;
    case 'error':
      showError(msg.code);
      break;
  }
};

export function init() {
  $('#m-toggle').onclick = () => control.toggle();
  $('#m-prev').onclick = () => control.step(-1);
  $('#m-next').onclick = () => control.step(1);
  $('#m-detach').onclick = detach;
  $('#m-attach').onclick = () => send({ type: 'handback' });
  $('#m-volume').value = bar.load().music.volume;
  $('#m-volume').addEventListener('input', (e) => {
    const v = Number(e.target.value);
    bar.update((d) => { d.music.volume = v; });
    control.volume(v);
  });

  $('#m-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#m-url');
    const parsed = parseYouTube(input.value);
    if (!parsed) return toast('Não reconheci esse link do YouTube');
    input.value = '';
    const item = { id: bar.newId(), ...parsed, title: '' };
    bar.update((d) => { d.music.items.push(item); });
    control.load(item);
    refresh();
  });

  $('#m-list').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = li.dataset.id;
    if (e.target.closest('.x')) {
      bar.update((d) => {
        d.music.items = d.music.items.filter((x) => x.id !== id);
        if (d.music.current === id) d.music.current = null;
      });
      return refresh();
    }
    if (e.target.closest('.rename')) {
      const item = findItem(id);
      const name = prompt('Nome:', item?.title ?? '');
      if (name?.trim()) bar.update((d) => { d.music.items.find((x) => x.id === id).title = name.trim(); });
      return refresh();
    }
    const item = findItem(id);
    if (item) {
      control.load(item);
      refresh();
    }
  });

  // Se a janela destacada já estiver aberta (barra recarregada), ela responde
  send({ type: 'ping' });
  setTimeout(() => { if (!detached) startLocal(); }, 500);
}

function renderNow() {
  const item = currentItem();
  $('#m-now').textContent = playing && title ? title
    : item ? (item.title || 'Pronto para tocar') : 'Cole um link do YouTube abaixo';
}

function renderControls() {
  $('#m-toggle').innerHTML = playing
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  $('#m-toggle').setAttribute('aria-label', playing ? 'Pausar' : 'Tocar');
  $('#music-sec').classList.toggle('playing', playing);
}

export function render({ b }) {
  renderNow();
  $('#m-list').innerHTML = b.music.items.map((x) => `
    <li data-id="${x.id}" class="${x.id === b.music.current ? 'active' : ''}">
      <span class="m-kind">${x.kind === 'playlist' ? '☰' : '♪'}</span>
      <span class="m-title">${esc(x.title || (x.kind === 'playlist' ? 'Playlist' : 'Vídeo'))}</span>
      <button class="rename" aria-label="Renomear">✎</button>
      <button class="x" aria-label="Remover">×</button>
    </li>`).join('') || '<li class="empty">Nenhum link salvo.</li>';
  renderControls();
}
