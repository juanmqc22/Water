// Núcleo do player do YouTube, usado pela barra e pela janela destacada.
// A lista e a faixa atual ficam em barra.v1, então qualquer um dos dois
// pode tocar a partir de onde o outro parou.

import * as bar from './bar.js';

export const CHANNEL = 'barra-music';

export const ERRORS = {
  2: 'Link inválido.',
  5: 'O player não conseguiu tocar este vídeo.',
  100: 'Vídeo não encontrado ou privado.',
  101: 'Este vídeo não permite tocar fora do YouTube.',
  150: 'Este vídeo não permite tocar fora do YouTube.',
  api: 'YouTube indisponível nesta rede.',
};

let apiReady;
function loadApi() {
  apiReady ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = resolve;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = reject;
    document.head.append(tag);
  });
  return apiReady;
}

export const findItem = (id) => bar.load().music.items.find((x) => x.id === id) ?? null;
export const currentItem = () => findItem(bar.load().music.current);

// Cria o player dentro de `host` (o elemento é substituído por um iframe)
export function createPlayer(host, { onState = () => {}, onError = () => {} } = {}) {
  let yt = null;
  let ready = false;
  let playing = false;
  let pending = null;

  const api = {
    get playing() { return playing; },

    load(item, { autoplay = true, start = 0, index = 0 } = {}) {
      if (!item) return;
      bar.update((d) => { d.music.current = item.id; });
      if (!ready) {
        pending = [item, { autoplay, start, index }];
        return;
      }
      if (item.kind === 'playlist') {
        const opts = { list: item.ref, listType: 'playlist', index, startSeconds: start };
        autoplay ? yt.loadPlaylist(opts) : yt.cuePlaylist(opts);
      } else {
        const opts = { videoId: item.ref, startSeconds: start };
        autoplay ? yt.loadVideoById(opts) : yt.cueVideoById(opts);
      }
    },

    // Retorna false quando não há nada para tocar
    toggle() {
      const item = currentItem();
      if (!item) {
        const first = bar.load().music.items[0];
        if (first) api.load(first);
        return Boolean(first);
      }
      if (!ready) return true;
      playing ? yt.pauseVideo() : yt.playVideo();
      return true;
    },

    pause() { if (ready) yt.pauseVideo(); },

    step(dir) {
      const item = currentItem();
      if (item?.kind === 'playlist' && ready) return dir > 0 ? yt.nextVideo() : yt.previousVideo();
      const items = bar.load().music.items;
      if (!items.length) return;
      const i = items.findIndex((x) => x.id === item?.id);
      api.load(items[(i + dir + items.length) % items.length]);
    },

    setVolume(v) { if (ready) yt.setVolume(v); },

    position() {
      if (!ready) return { start: 0, index: 0 };
      return { start: Math.floor(yt.getCurrentTime?.() ?? 0), index: Math.max(0, yt.getPlaylistIndex?.() ?? 0) };
    },

    destroy() {
      yt?.destroy?.();
      yt = null;
      ready = false;
      playing = false;
    },
  };

  loadApi().then(() => {
    yt = new YT.Player(host, {
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: () => {
          ready = true;
          yt.setVolume(bar.load().music.volume);
          if (pending) {
            const [item, opts] = pending;
            pending = null;
            api.load(item, opts);
          } else if (currentItem()) {
            api.load(currentItem(), { autoplay: false });
          }
        },
        onStateChange: (e) => {
          playing = e.data === YT.PlayerState.PLAYING;
          const title = yt.getVideoData?.().title ?? '';
          if (playing && title) {
            bar.update((d) => {
              const it = d.music.items.find((x) => x.id === d.music.current);
              if (it && !it.title) it.title = it.kind === 'playlist' ? `Playlist · ${title}` : title;
            });
          }
          // Vídeo avulso terminou: toca o próximo da lista
          if (e.data === YT.PlayerState.ENDED && currentItem()?.kind === 'video') api.step(1);
          onState({ playing, title });
        },
        onError: (e) => {
          onError(e.data);
          if (currentItem()?.kind === 'video' && bar.load().music.items.length > 1) api.step(1);
        },
      },
    });
  }).catch(() => onError('api'));

  return api;
}
