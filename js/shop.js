// Loja: catálogo, moedas, compra, equipar e conquistas.
// Duas travas seguram o ritmo: o nível mínimo de cada item e o preço crescente.
// Calibrado para liberar e comprar tudo em ~10–16 dias de uso (150–250 XP/dia).

import * as bar from './bar.js';
import { $, esc } from './util.js';
import { toast, say, refresh } from './ui.js';
import { petSvg } from './pet.js';
import { roomSvg, furnitureSvg } from './room.js';

// cat: scene | room | costume — slot: onde o item vai
export const CATALOG = [
  // Cenários
  { id: 'quarto', name: 'Quarto', cat: 'scene', slot: 'scene', level: 1, price: 0 },
  { id: 'jardim', name: 'Jardim', cat: 'scene', slot: 'scene', level: 4, price: 25 },
  { id: 'praia', name: 'Praia', cat: 'scene', slot: 'scene', level: 7, price: 50 },
  { id: 'montanha', name: 'Montanha nevada', cat: 'scene', slot: 'scene', level: 10, price: 80 },
  { id: 'estrelas', name: 'Noite estrelada', cat: 'scene', slot: 'scene', level: 13, price: 120 },
  // Casinha
  { id: 'tapete', name: 'Tapete', cat: 'room', slot: 'rug', level: 2, price: 10 },
  { id: 'planta', name: 'Plantinha', cat: 'room', slot: 'floorL', level: 2, price: 15 },
  { id: 'quadro', name: 'Quadro', cat: 'room', slot: 'wall', level: 3, price: 20 },
  { id: 'luminaria', name: 'Luminária', cat: 'room', slot: 'floorR', level: 4, price: 25 },
  { id: 'estante', name: 'Estante', cat: 'room', slot: 'floorL', level: 6, price: 40 },
  { id: 'aquario', name: 'Aquário', cat: 'room', slot: 'floorR', level: 7, price: 50 },
  { id: 'relogio', name: 'Relógio de parede', cat: 'room', slot: 'wall', level: 9, price: 60 },
  { id: 'poltrona', name: 'Poltrona', cat: 'room', slot: 'floorR', level: 10, price: 70 },
  { id: 'telescopio', name: 'Telescópio', cat: 'room', slot: 'floorL', level: 13, price: 100 },
  // Fantasias
  { id: 'laco', name: 'Laço', cat: 'costume', slot: 'head', level: 2, price: 10 },
  { id: 'palha', name: 'Chapéu de palha', cat: 'costume', slot: 'head', level: 3, price: 15 },
  { id: 'oculos', name: 'Óculos redondos', cat: 'costume', slot: 'face', level: 5, price: 25 },
  { id: 'cachecol', name: 'Cachecol', cat: 'costume', slot: 'neck', level: 5, price: 30 },
  { id: 'mago', name: 'Chapéu de mago', cat: 'costume', slot: 'head', level: 8, price: 50 },
  { id: 'gravata', name: 'Gravata borboleta', cat: 'costume', slot: 'neck', level: 8, price: 50 },
  { id: 'flores', name: 'Coroa de flores', cat: 'costume', slot: 'head', level: 11, price: 80 },
  { id: 'sol', name: 'Óculos de sol', cat: 'costume', slot: 'face', level: 12, price: 90 },
  { id: 'coroa', name: 'Coroa', cat: 'costume', slot: 'head', level: 14, price: 140 },
  // Conquistas: não se compram, só se ganham
  { id: 'medalha', name: 'Medalha da hidratação', cat: 'costume', slot: 'neck', ach: { stat: 'maxStreak', goal: 5, text: '5 dias seguidos na meta de água' } },
  { id: 'faixa', name: 'Faixa de atleta', cat: 'costume', slot: 'head', ach: { stat: 'stretch', goal: 25, text: '25 alongamentos' } },
  { id: 'fones', name: 'Fones de ouvido', cat: 'costume', slot: 'head', ach: { stat: 'focus', goal: 12, text: '12 sessões de foco' } },
  { id: 'trofeu', name: 'Troféu', cat: 'room', slot: 'floorR', ach: { stat: 'tasks', goal: 40, text: '40 tarefas concluídas' } },
  { id: 'garrafa', name: 'Garrafa dourada', cat: 'room', slot: 'floorL', ach: { stat: 'waterMl', goal: 40000, text: '40 litros de água', unit: 1000 } },
];

const byId = Object.fromEntries(CATALOG.map((x) => [x.id, x]));
export const DEFAULT_EQUIPPED = { scene: 'quarto' };

const TABS = [
  { id: 'scene', label: 'Cenários' },
  { id: 'room', label: 'Casinha' },
  { id: 'costume', label: 'Fantasias' },
  { id: 'ach', label: 'Conquistas' },
];
let tab = 'scene';
let lastCtx = null;

export const achieved = (item, g) => Boolean(item.ach && g.stats[item.ach.stat] >= item.ach.goal);
// Usa o preço atual do catálogo, para quem comprou antes de um ajuste de preço não sair perdendo
export const spent = (b) => b.shop.owned.reduce((sum, o) => sum + (byId[o.id]?.price ?? o.price), 0);
export const coins = (b, g) => g.coinsEarned - spent(b);

export function owns(b, g, id) {
  const item = byId[id];
  if (!item) return false;
  if (item.ach) return achieved(item, g);
  return item.price === 0 || b.shop.owned.some((o) => o.id === id);
}

export const equipped = (b) => ({ ...DEFAULT_EQUIPPED, ...b.shop.equipped });

// Itens que acabaram de liberar (para o pet avisar)
export const unlockedBetween = (from, to) => CATALOG.filter((x) => !x.ach && x.level > from && x.level <= to);
export const achievementsDone = (g) => CATALOG.filter((x) => achieved(x, g)).map((x) => x.id);

function equip(item) {
  const b = bar.load();
  const current = equipped(b)[item.slot];
  bar.update((d) => {
    // Clicar no que já está em uso tira (menos o cenário, que sempre tem um)
    if (current === item.id && item.slot !== 'scene') delete d.shop.equipped[item.slot];
    else d.shop.equipped[item.slot] = item.id;
  });
  refresh();
}

function buy(item) {
  const before = structuredClone(bar.load().shop);
  bar.update((d) => {
    d.shop.owned.push({ id: item.id, price: item.price, at: new Date().toISOString() });
    d.shop.equipped[item.slot] = item.id;
  });
  say(`Comprei ${item.name}! Ficou lindo, né? ✨`);
  toast(`${item.name} comprado`, 'Desfazer', () => {
    bar.update((d) => { d.shop = before; });
    refresh();
  });
  refresh();
}

export function open() {
  $('#shop').showModal();
  renderShop();
}

export function init() {
  $('#shop').addEventListener('click', (e) => { if (e.target === $('#shop')) $('#shop').close(); });
  $('#shop-close').onclick = () => $('#shop').close();
  $('#shop-tabs').innerHTML = TABS.map((t) => `<button data-tab="${t.id}">${t.label}</button>`).join('');
  $('#shop-tabs').onclick = (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    tab = btn.dataset.tab;
    renderShop();
    $('#shop-grid').scrollTop = 0;
  };
  $('#shop-grid').onclick = (e) => {
    const card = e.target.closest('[data-item]');
    if (!card || card.classList.contains('locked')) return;
    const item = byId[card.dataset.item];
    const b = bar.load();
    const g = lastCtx.g;
    if (owns(b, g, item.id)) return equip(item);
    if (coins(b, g) < item.price) return toast(`Faltam ${item.price - coins(b, g)} moedas`);
    buy(item);
  };
}

function preview(item, ctx) {
  const { b, g, now } = ctx;
  if (item.cat === 'scene') return roomSvg({ scene: item.id, now, id: `shop-${item.id}` });
  if (item.cat === 'room') return furnitureSvg(item.id, item.slot, now);
  const species = b.pet?.species ?? 'agua';
  return petSvg(species, g.stage, 'happy', { [item.slot]: item.id });
}

function card(item, ctx) {
  const { b, g } = ctx;
  const have = owns(b, g, item.id);
  const using = equipped(b)[item.slot] === item.id;
  const balance = coins(b, g);
  let status;
  let cls = '';
  if (using) {
    status = item.slot === 'scene' ? '✓ Usando' : '✓ Usando · tirar';
    cls = 'using';
  } else if (have) {
    status = 'Usar';
    cls = 'owned';
  } else if (item.ach) {
    const value = g.stats[item.ach.stat];
    const unit = item.ach.unit ?? 1;
    status = `🏆 ${Math.floor(Math.min(value, item.ach.goal) / unit)}/${item.ach.goal / unit}`;
    cls = 'locked';
  } else if (g.level < item.level) {
    status = `🔒 Nível ${item.level}`;
    cls = 'locked';
  } else {
    status = `🪙 ${item.price}`;
    cls = balance >= item.price ? 'buy' : 'buy short';
  }
  const where = item.slot === 'wall' ? '<span class="tiny muted">só no Quarto</span>' : '';
  const goal = item.ach ? `<span class="tiny muted">${esc(item.ach.text)}</span>` : '';
  return `<button class="shop-card ${cls} cat-${item.cat}" data-item="${item.id}">
    <span class="shop-prev">${preview(item, ctx)}</span>
    <b>${esc(item.name)}</b>${goal}${where}
    <span class="shop-status">${status}</span>
  </button>`;
}

export function renderShop(ctx = lastCtx) {
  if (!ctx) return;
  lastCtx = ctx;
  $('#shop-coins').textContent = coins(ctx.b, ctx.g);
  if (!$('#shop').open) return;
  document.querySelectorAll('#shop-tabs [data-tab]').forEach((el) => el.classList.toggle('on', el.dataset.tab === tab));
  const list = tab === 'ach' ? CATALOG.filter((x) => x.ach) : CATALOG.filter((x) => x.cat === tab && !x.ach);
  $('#shop-grid').innerHTML = list.map((item) => card(item, ctx)).join('');
  const next = CATALOG.filter((x) => !x.ach && x.level > ctx.g.level).sort((a, c) => a.level - c.level)[0];
  $('#shop-hint').textContent = tab === 'ach'
    ? 'Conquistas não se compram: ganhe cumprindo o desafio.'
    : next ? `Próximo item libera no nível ${next.level}: ${next.name}.` : 'Você liberou todos os itens da loja!';
}
