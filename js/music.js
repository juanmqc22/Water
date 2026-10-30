// Seção Música: player do YouTube embutido e lista de links salvos.

import * as bar from './bar.js';
import { $, esc } from './util.js';
import { toast, say, refresh } from './ui.js';

let player = null;
let playing = false;
let onPlayingChange = () => {};

export const isPlaying = () => playing;
export const setOnPlayingChange = (fn) => { onPlayingChange = fn; };

const ERRORS = {
  2: 'Link inválido.',
  5: 'O player não conseguiu tocar este vídeo.',
  100: 'Vídeo não encontrado ou privado.',
  101: 'Este vídeo não permite tocar fora do YouTube.',
  150: 'Este vídeo não permite tocar fora do YouTube.',
};

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

const current = (b = bar.load()) => b.music.items.find((x) => x.id === b.music.current) ?? null;

function load(item, autoplay = true) {
  if (!player?.loadVideoById) return;
  bar.update((d) => { d.music.current = item.id; });
  if (item.kind === 'playlist') {
    const opts = { list: item.ref, listType: 'playlist' };
    autoplay ? player.loadPlaylist(opts) : player.cuePlaylist(opts);
  } else {
    autoplay ? player.loadVideoById(item.ref) : player.cueVideoById(item.ref);
  }
  refresh();
}

function step(dir) {
  const b = bar.load();
  const item = current(b);
  if (item?.kind === 'playlist' && player) return dir > 0 ? player.nextVideo() : player.previousVideo();
  const items = b.music.items;
  if (!items.length) return;
  const i = items.findIndex((x) => x.id === item?.id);
  load(items[(i + dir + items.length) % items.length]);
}

function toggle() {
  if (!player?.getPlayerState) return;
  const item = current();
  if (!item) {
    const first = bar.load().music.items[0];
    if (first) load(first);
    else toast('Adicione um link do YouTube primeiro');
    return;
  }
  playing ? player.pauseVideo() : player.playVideo();
}

function onState(e) {
  const was = playing;
  playing = e.data === YT.PlayerState.PLAYING;
  if (playing) {
    const title = player.getVideoData?.().title;
    if (title) {
      $('#m-now').textContent = title;
      bar.update((d) => {
        const it = d.music.items.find((x) => x.id === d.music.current);
        if (it && !it.title) it.title = it.kind === 'playlist' ? `Playlist · ${title}` : title;
      });
    }
  }
  // Vídeo avulso terminou: toca o próximo da lista
  if (e.data === YT.PlayerState.ENDED && current()?.kind === 'video') step(1);
  if (was !== playing) {
    onPlayingChange(playing);
    if (playing && !was && Math.random() < 0.3) say('🎵 Adoro essa!');
  }
  renderControls();
}

export function init() {
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('yt', {
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: () => {
          player.setVolume(bar.load().music.volume);
          const item = current();
          if (item) load(item, false);
        },
        onStateChange: onState,
        onError: (e) => {
          toast(ERRORS[e.data] ?? `Erro do YouTube (${e.data})`);
          if (current()?.kind === 'video' && bar.load().music.items.length > 1) step(1);
        },
      },
    });
  };
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.onerror = () => { $('#m-now').textContent = 'YouTube indisponível nesta rede.'; };
  document.head.append(tag);

  $('#m-toggle').onclick = toggle;
  $('#m-prev').onclick = () => step(-1);
  $('#m-next').onclick = () => step(1);
  $('#m-volume').value = bar.load().music.volume;
  $('#m-volume').addEventListener('input', (e) => {
    const v = Number(e.target.value);
    player?.setVolume?.(v);
    bar.update((d) => { d.music.volume = v; });
  });

  $('#m-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#m-url');
    const parsed = parseYouTube(input.value);
    if (!parsed) return toast('Não reconheci esse link do YouTube');
    input.value = '';
    const item = { id: bar.newId(), ...parsed, title: '' };
    bar.update((d) => { d.music.items.push(item); });
    load(item);
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
      const item = bar.load().music.items.find((x) => x.id === id);
      const name = prompt('Nome:', item?.title ?? '');
      if (name?.trim()) bar.update((d) => { d.music.items.find((x) => x.id === id).title = name.trim(); });
      return refresh();
    }
    const item = bar.load().music.items.find((x) => x.id === id);
    if (item) load(item);
  });
}

function renderControls() {
  $('#m-toggle').innerHTML = playing
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  $('#m-toggle').setAttribute('aria-label', playing ? 'Pausar' : 'Tocar');
  $('#music-sec').classList.toggle('playing', playing);
}

export function render({ b }) {
  const item = current(b);
  if (!playing) $('#m-now').textContent = item ? (item.title || 'Pronto para tocar') : 'Cole um link do YouTube abaixo';
  $('#m-list').innerHTML = b.music.items.map((x) => `
    <li data-id="${x.id}" class="${x.id === b.music.current ? 'active' : ''}">
      <span class="m-kind">${x.kind === 'playlist' ? '☰' : '♪'}</span>
      <span class="m-title">${esc(x.title || (x.kind === 'playlist' ? 'Playlist' : 'Vídeo'))}</span>
      <button class="rename" aria-label="Renomear">✎</button>
      <button class="x" aria-label="Remover">×</button>
    </li>`).join('') || '<li class="empty">Nenhum link salvo.</li>';
  renderControls();
}
