// Janela destacada do player: toca a música e obedece aos controles da barra.

import { $ } from './util.js';
import { createPlayer, currentItem, findItem, CHANNEL, ERRORS } from './player.js';

const channel = new BroadcastChannel(CHANNEL);
const send = (msg) => channel.postMessage(msg);

let state = { playing: false, title: '' };
let said = false;

const player = createPlayer('yt', {
  onState: (s) => {
    state = s;
    document.title = s.title ? `${s.playing ? '♪' : '❚❚'} ${s.title}` : 'Player · Barra';
    $('#now').textContent = s.title || currentItem()?.title || '';
    send({ type: 'state', ...s });
  },
  onError: (code) => {
    $('#now').textContent = ERRORS[code] ?? `Erro do YouTube (${code})`;
    send({ type: 'error', code });
  },
});

function bye(back) {
  if (said) return;
  said = true;
  send({ type: 'bye', resume: { id: currentItem()?.id, playing: back && state.playing, ...player.position() } });
}

channel.onmessage = ({ data: msg }) => {
  switch (msg.type) {
    case 'handoff': {
      const r = msg.resume;
      const item = (r?.id && findItem(r.id)) || currentItem();
      if (item) player.load(item, { autoplay: r ? r.playing : false, start: r?.start ?? 0, index: r?.index ?? 0 });
      break;
    }
    case 'ping': send({ type: 'state', ...state }); break;
    case 'load': player.load(findItem(msg.id)); break;
    case 'toggle': player.toggle(); break;
    case 'step': player.step(msg.dir); break;
    case 'volume': player.setVolume(msg.v); break;
    case 'handback':
      bye(true);
      window.close();
      break;
  }
};

$('#back').onclick = () => {
  bye(true);
  window.close();
};
addEventListener('pagehide', () => bye(false));

// Mantém a barra sabendo que a janela está aberta (ex.: se ela recarregar)
setInterval(() => send({ type: 'state', ...state }), 5000);
$('#now').textContent = currentItem()?.title ?? '';
send({ type: 'hello' });
