import * as bar from './bar.js';
import { $, MIN, pick, hoursOf } from './util.js';
import { compute } from './game.js';
import { petSvg, speciesName } from './pet.js';
import { setRefresher, say, balloonBusy, bindSections } from './ui.js';
import * as water from './water.js';
import * as breaks from './breaks.js';
import * as tasks from './tasks.js';
import * as music from './music.js';
import * as settings from './settings.js';
import * as onboarding from './onboarding.js';

const CHATTER_EVERY = 35 * MIN;

let last = null; // último cálculo do jogo, para detectar ganhos de XP
let lastChatter = Date.now();
let rendering = null;
let again = false;

async function buildCtx() {
  const now = new Date();
  const b = bar.load();
  const w = await water.loadWater();
  return { now, b, water: w, g: compute({ now, water: w, b }) };
}

// Renderiza tudo; ticks podem mudar dados, então recalcula depois deles
async function render() {
  // Pedidos durante uma renderização geram mais uma rodada, com dados novos
  if (rendering) {
    again = true;
    return rendering;
  }
  rendering = (async () => {
    let ctx = await buildCtx();
    const changed = breaks.tick(ctx);
    if (changed) ctx = await buildCtx();
    ctx = { ...ctx, b: bar.load() };

    renderClock(ctx.now);
    renderPet(ctx);
    water.render(ctx);
    breaks.render(ctx);
    tasks.render(ctx);
    music.render(ctx);
    celebrate(ctx);
    chatter(ctx);
  })();
  try { await rendering; } finally { rendering = null; }
  if (again) {
    again = false;
    await render();
  }
}

function renderClock(now) {
  $('#clock').textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '');
  $('#date').textContent = date.charAt(0).toUpperCase() + date.slice(1);
}

// Pet

function renderPet({ b, g }) {
  if (!b.pet) return;
  const mood = g.face === 'focus' || g.face === 'sleep' ? g.face : music.isPlaying() ? 'happy' : g.face;
  const el = $('#pet');
  const key = `${b.pet.species}|${g.stage}|${mood}`;
  if (el.dataset.key !== key) {
    el.innerHTML = petSvg(b.pet.species, g.stage, mood);
    el.dataset.key = key;
  }
  el.classList.toggle('dance', music.isPlaying() && mood !== 'sleep');
  el.classList.toggle('sleep', mood === 'sleep');
  el.classList.toggle('low', ['sad', 'tired', 'thirsty'].includes(mood));

  $('#pet-name').textContent = b.pet.name;
  const species = speciesName(b.pet, g.stage);
  $('#pet-species').textContent = species === b.pet.name ? `Estágio ${g.stage} de 3` : `${species} · estágio ${g.stage} de 3`;
  $('#pet-level').textContent = `Nv ${g.level}`;
  const pct = ((g.xp - g.levelFrom) / (g.levelTo - g.levelFrom)) * 100;
  $('#xp-fill').style.width = `${pct}%`;
  $('#xp-text').textContent = `${g.xp - g.levelFrom}/${g.levelTo - g.levelFrom} XP · hoje +${g.todayXp}`;
  for (const [k, v] of Object.entries(g.needs)) {
    const need = $(`.need[data-need="${k}"]`);
    need.querySelector('i').style.width = `${v}%`;
    need.classList.toggle('low', v < 35);
    need.title = `${need.dataset.label}: ${v}%`;
  }
  $('#streak').textContent = g.streak ? `🔥 ${g.streak} dia${g.streak > 1 ? 's' : ''} na meta de água` : '';
}

function bump(text) {
  const el = $('#pet');
  el.classList.remove('jump');
  void el.offsetWidth;
  el.classList.add('jump');
  if (!text) return;
  const f = document.createElement('span');
  f.className = 'xp-float';
  f.textContent = text;
  $('#pet-wrap').append(f);
  setTimeout(() => f.remove(), 1400);
}

function celebrate({ b, g }) {
  if (!b.pet) return;
  if (last && g.xp > last.xp) bump(`+${g.xp - last.xp} XP`);
  if (last && g.stage > last.stage) {
    const name = speciesName(b.pet, g.stage);
    say(`✨ ${b.pet.name} evoluiu para ${name}! ✨`, { sticky: true, id: 'evolve', actions: [{ label: 'Uau!', primary: true }] });
    $('#pet').classList.add('evolve');
    setTimeout(() => $('#pet').classList.remove('evolve'), 1600);
  } else if (last && g.level > last.level) {
    say(`Subi para o nível ${g.level}! 🎉`);
  }
  if (last && g.streak > last.streak) say(`Meta de água batida! 🔥 ${g.streak} dia${g.streak > 1 ? 's' : ''} seguidos.`);
  last = g;
}

const LINES = {
  water: ['Tô ficando sequinho… um gole de água? 💧', 'Bora hidratar? Eu acompanho! 💧'],
  energy: ['Faz tempo que a gente não se mexe. Levanta um pouquinho? 🙆', 'Uma esticada rápida e voltamos com tudo!'],
  mood: ['Que tal riscar uma tarefa da lista? ✅', 'Uma tarefa pequena já me deixa feliz!'],
  happy: ['Tá indo muito bem hoje! 😄', 'Bom ritmo! Continua assim.', 'Tô feliz aqui do seu lado. 💙'],
};

function chatter({ now, b, g }) {
  if (!b.pet || !g.working || g.focusing || balloonBusy()) return;
  if (now - lastChatter < CHATTER_EVERY) return;
  lastChatter = now.getTime();
  const [worst, value] = Object.entries(g.needs).sort((a, c) => a[1] - c[1])[0];
  say(pick(value < 65 ? LINES[worst] : LINES.happy));
}

function greet(b, g) {
  const h = hoursOf(new Date());
  const hello = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  if (!g.working) return say(`${hello}! Tô descansando, fora do expediente. 😴`);
  const open = b.tasks.filter((t) => !t.doneAt && !t.archived).length;
  say(`${hello}! ${open ? `Temos ${open} tarefa${open > 1 ? 's' : ''} hoje.` : 'Bora começar?'} 💪`);
}

function petClick() {
  const b = bar.load();
  if (!b.pet) return;
  bump();
  const g = last;
  if (!g) return;
  const tips = [
    `Nível ${g.level}. Faltam ${g.levelTo - g.xp} XP para o próximo.`,
    g.stage < 3 ? `Eu evoluo no nível ${g.stage === 1 ? 5 : 10}!` : 'Já estou na forma final! 💪',
    `Hidratação ${g.needs.water}% · Energia ${g.needs.energy}% · Humor ${g.needs.mood}%`,
    'Hehe, cócegas! 😆',
  ];
  say(pick(tips));
}

async function init() {
  navigator.storage?.persist?.();
  setRefresher(render);
  bindSections();
  water.init();
  breaks.init();
  tasks.init();
  music.init();
  settings.init();
  onboarding.init();
  music.setOnPlayingChange(() => render());
  $('#open-settings').onclick = settings.open;
  $('#pet').onclick = petClick;

  await water.handleTagLink();
  await render();
  const b = bar.load();
  if (!b.pet) {
    onboarding.open((name) => say(`Oi! Eu sou ${name}. Bora cuidar de você hoje? 💙`));
  }
  else greet(b, last);

  setInterval(render, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  // Mantém a barra e uma aba aberta em sincronia
  addEventListener('storage', (e) => { if (e.key === 'barra.v1' || e.key === 'water.v1') render(); });
}

init();
