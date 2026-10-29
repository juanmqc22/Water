import * as store from './storage.js';

const $ = (sel) => document.querySelector(sel);

const TRAIN_BOOST_ML = 500;
const GLASS_ML = 250;
const DEFAULT_BOTTLE_ML = 500;

const ICONS = {
  bottle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2h4M10 2v3l-2 2.5V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7.5L14 5V2"/><path d="M8 12h8"/></svg>',
  glass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14l-1.6 16.2A2 2 0 0 1 15.4 21H8.6a2 2 0 0 1-2-1.8z"/><path d="M6 9h12"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
};

// Datas sempre no fuso local do aparelho

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const clockTime = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const liters = (ml, min = 1) =>
  (ml / 1000).toLocaleString('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: 2 });
const amount = (ml) => (ml >= 1000 ? `${liters(ml)} L` : `${Math.round(ml)} ml`);

const suggestedGoal = (kg) => Math.round((kg * 35) / 50) * 50;

function paceFraction(now, s) {
  const h = now.getHours() + now.getMinutes() / 60;
  return Math.min(1, Math.max(0, (h - s.windowStart) / (s.windowEnd - s.windowStart)));
}

function statusFor(total, goal, s, now, bottleMl) {
  if (total >= goal) return ['done', 'Meta atingida'];
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < s.windowStart) return total ? ['ok', 'No ritmo'] : ['idle', `Começa às ${s.windowStart}h`];
  if (h >= s.windowEnd) return ['behind', `Faltam ${amount(goal - total)}`];
  const delta = total - goal * paceFraction(now, s);
  if (delta >= bottleMl / 2) return ['ahead', `${amount(delta)} à frente`];
  if (delta > -bottleMl / 2) return ['ok', 'No ritmo'];
  const n = Math.ceil(-delta / bottleMl);
  return ['behind', `${n} garrafa${n > 1 ? 's' : ''} atrás`];
}

// A garrafa principal é a última usada (ou a primeira cadastrada)
function mainTag(tags, drinks) {
  for (let i = drinks.length - 1; i >= 0; i--) {
    const tag = tags.find((t) => t.token === drinks[i].tagToken);
    if (tag) return tag;
  }
  return tags[0] ?? null;
}

// Render

let shownTotal = 0;
let selectedDay = null;

async function render() {
  const [s, tags, boosts] = await Promise.all([store.getSettings(), store.listTags(), store.getBoosts()]);
  const now = new Date();
  const today = startOfDay(now);
  const drinks = await store.getDrinks(addDays(today, -6), addDays(today, 1));

  const totals = {};
  for (const d of drinks) {
    const k = dayKey(new Date(d.createdAt));
    totals[k] = (totals[k] ?? 0) + d.ml;
  }
  const goalFor = (k) => s.goalMl + (boosts[k] ?? 0);

  const key = dayKey(now);
  const total = totals[key] ?? 0;
  const goal = goalFor(key);
  const main = mainTag(tags, drinks);

  $('#today-label').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  renderGlass({ total, goal, s, now, trained: Boolean(boosts[key]), bottleMl: main?.ml ?? DEFAULT_BOTTLE_ML });
  renderWeek(today, totals, goalFor);
  renderToday(drinks.filter((d) => dayKey(new Date(d.createdAt)) === key), tags);
  renderDock(main);
}

function renderGlass({ total, goal, s, now, trained, bottleMl }) {
  const glass = $('#glass');
  const pct = goal ? total / goal : 0;
  const frac = paceFraction(now, s);
  const expected = goal * frac;
  const showPace = frac > 0 && frac < 1 && total < goal;
  const [tone, statusText] = statusFor(total, goal, s, now, bottleMl);
  const remaining = Math.max(0, goal - total);

  glass.style.setProperty('--level', `${Math.min(pct, 1) * 100}%`);
  glass.style.setProperty('--pace', `${frac * 100}%`);
  glass.classList.toggle('is-empty', total === 0);
  glass.classList.toggle('is-full', pct >= 1);

  const html = `
    <div class="pace" ${showPace ? '' : 'hidden'}>
      <span data-full="Ritmo agora · ${liters(expected)} L" data-short="${liters(expected)} L">Ritmo agora · ${liters(expected)} L</span>
    </div>
    <div class="glass-content">
      <div class="glass-top">
        <span class="chip tone-${tone}">${statusText}</span>
        <button class="train" data-action="train" aria-pressed="${trained}">
          ${ICONS.bolt}${trained ? `Treino +${liters(TRAIN_BOOST_ML)} L` : 'Treino'}
        </button>
      </div>
      <div class="glass-center">
        <p class="amount"><span class="num">${liters(shownTotal)}</span><span class="unit">L</span></p>
        <p class="of">de <b>${liters(goal)} L</b>${remaining ? ` · faltam ${amount(remaining)}` : ''}</p>
      </div>
    </div>`;

  $('#layer-dry').innerHTML = html;
  $('#layer-wet').innerHTML = html;
  $('#glass').setAttribute('aria-label',
    `${liters(total)} de ${liters(goal)} litros. ${statusText}.`);
  countTo(total);
  if (showPace) hidePaceLabelOnCollision();
}

// Evita que a linha de ritmo e seu rótulo passem por cima de outros elementos do copo
function hidePaceLabelOnCollision() {
  const dry = $('#layer-dry');
  const overlaps = (r, o, pad) =>
    r.left < o.right + pad && r.right > o.left - pad && r.top < o.bottom + pad && r.bottom > o.top - pad;
  const rects = (sel) => [...dry.querySelectorAll(sel)].map((el) => el.getBoundingClientRect());

  const pace = dry.querySelector('.pace');
  const lineHit = rects('.chip, .train').some((o) => overlaps(pace.getBoundingClientRect(), o, 4));
  const texts = rects('.chip, .train, .num, .unit, .of');
  const labelHit = () => texts.some((o) => overlaps(pace.querySelector('span').getBoundingClientRect(), o, 5));

  // Tenta o rótulo completo e depois o curto, acima e abaixo da linha; se nada couber, só a linha
  const span = pace.querySelector('span');
  const variants = [[span.dataset.full, false], [span.dataset.full, true], [span.dataset.short, false], [span.dataset.short, true]];
  const fit = variants.find(([text, below]) => {
    span.textContent = text;
    pace.classList.toggle('below', below);
    return !labelHit();
  });

  document.querySelectorAll('#glass .pace').forEach((el) => {
    el.classList.toggle('off', lineHit);
    el.classList.toggle('no-label', !fit);
    if (!fit) return;
    el.classList.toggle('below', fit[1]);
    el.querySelector('span').textContent = fit[0];
  });
}

// Anima o número do total até o valor novo
let countFrame;
function countTo(target) {
  cancelAnimationFrame(countFrame);
  const from = shownTotal;
  if (from === target || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shownTotal = target;
    document.querySelectorAll('#glass .num').forEach((el) => { el.textContent = liters(target); });
    return;
  }
  const start = performance.now();
  const duration = 900;
  const step = (t) => {
    const p = Math.min(1, (t - start) / duration);
    const eased = 1 - Math.pow(1 - p, 4);
    shownTotal = from + (target - from) * eased;
    const text = liters(Math.round(shownTotal / 10) * 10);
    document.querySelectorAll('#glass .num').forEach((el) => { el.textContent = text; });
    if (p < 1) countFrame = requestAnimationFrame(step);
    else shownTotal = target;
  };
  countFrame = requestAnimationFrame(step);
}

function renderWeek(today, totals, goalFor) {
  const el = $('#week');
  el.innerHTML = '';
  let met = 0;
  let sum = 0;
  let days = 0;

  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const k = dayKey(d);
    const t = totals[k] ?? 0;
    const g = goalFor(k);
    const isMet = t >= g;
    if (isMet) met++;
    if (t > 0) { sum += t; days++; }

    const classes = ['day', i === 0 && 'today', isMet && 'met', k === selectedDay && 'selected']
      .filter(Boolean).join(' ');
    const short = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const label = i === 0 ? 'Hoje' : short.charAt(0).toUpperCase() + short.slice(1, 3);
    el.insertAdjacentHTML('beforeend', `
      <button class="${classes}" data-day="${k}" aria-label="${label}: ${liters(t)} litros">
        <div class="bar"><i style="height:${Math.min(t / g, 1) * 100}%"></i></div>
        <span class="day-label">${label}</span>
      </button>`);
  }

  if (selectedDay && !el.querySelector(`[data-day="${selectedDay}"]`)) selectedDay = null;
  const sel = selectedDay ?? dayKey(today);
  const selDate = new Date(`${sel}T12:00`);
  const selName = sel === dayKey(today)
    ? 'Hoje'
    : selDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '');
  $('#week-detail').innerHTML =
    `${selName.charAt(0).toUpperCase() + selName.slice(1)} · <b>${liters(totals[sel] ?? 0)} L</b> de ${liters(goalFor(sel))} L`;

  $('#week-met').innerHTML = `${met}<small>/7</small>`;
  $('#week-avg').innerHTML = days ? `${liters(sum / days)}<small> L</small>` : '—';
}

function renderToday(list, tags) {
  const el = $('#today-list');
  openRow = null;
  el.innerHTML = '';
  $('#today-count').textContent = list.length
    ? `${list.length} registro${list.length > 1 ? 's' : ''}`
    : '';

  if (!list.length) {
    el.innerHTML = '<li class="empty"><div><b>Nada por aqui ainda</b>Encoste o iPhone na garrafa para registrar.</div></li>';
    return;
  }

  for (const d of [...list].reverse()) {
    const time = clockTime(new Date(d.createdAt));
    const tag = d.tagToken ? tags.find((t) => t.token === d.tagToken) : null;
    const label = d.tagToken ? (tag?.label ?? 'Garrafa') : 'Copo';
    const via = d.source === 'nfc' ? 'NFC' : 'manual';

    const li = document.createElement('li');
    li.innerHTML = `
      <button class="swipe-del">Apagar</button>
      <div class="swipe">
        <span class="ico">${d.tagToken ? ICONS.bottle : ICONS.glass}</span>
        <span class="entry"><b></b><span>${time} · ${via}</span></span>
        <span class="entry-ml">${d.ml} ml</span>
      </div>`;
    li.querySelector('.entry b').textContent = label;
    li.querySelector('.swipe-del').onclick = async () => {
      await store.removeDrink(d.id);
      await render();
      toast(`${d.ml} ml removidos`, 'Desfazer', async () => {
        await store.restoreDrink(d);
        await render();
      });
    };
    bindSwipe(li);
    el.append(li);
  }
}

// Deslizar para a esquerda revela o botão "Apagar"
const SWIPE_W = 88;
let openRow = null;

function setRowOffset(li, x) {
  li.querySelector('.swipe').style.transform = x ? `translateX(${x}px)` : '';
}

function closeOpenRow() {
  if (openRow) setRowOffset(openRow, 0);
  openRow = null;
}

function bindSwipe(li) {
  let startX = 0;
  let startY = 0;
  let base = 0;
  let mode = null; // null | 'swipe' | 'scroll'

  li.addEventListener('touchstart', (e) => {
    if (openRow && openRow !== li) closeOpenRow();
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    base = openRow === li ? -SWIPE_W : 0;
    mode = null;
  }, { passive: true });

  li.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!mode && Math.abs(dx) + Math.abs(dy) > 8) mode = Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'scroll';
    if (mode !== 'swipe') return;
    li.classList.add('dragging');
    setRowOffset(li, Math.min(0, Math.max(-SWIPE_W * 1.3, base + dx)));
  }, { passive: true });

  li.addEventListener('touchend', (e) => {
    li.classList.remove('dragging');
    if (mode !== 'swipe') {
      // Toque simples numa linha aberta a fecha
      if (!mode && openRow === li && !e.target.closest('.swipe-del')) closeOpenRow();
      return;
    }
    const dx = e.changedTouches[0].clientX - startX;
    if (base + dx < -SWIPE_W / 2) {
      setRowOffset(li, -SWIPE_W);
      openRow = li;
    } else {
      setRowOffset(li, 0);
      if (openRow === li) openRow = null;
    }
  });
}

function renderDock(main) {
  const btn = $('#quick-add');
  if (main) {
    $('#quick-label').textContent = main.label;
    $('#quick-ml').textContent = `${main.ml} ml`;
    btn.onclick = () => record(main.ml, main.token, 'manual');
  } else {
    $('#quick-label').textContent = 'Adicionar garrafa';
    $('#quick-ml').textContent = '';
    btn.onclick = openSettings;
  }
}

// Toast

let toastTimer;

function toast(text, actionLabel, action) {
  $('#toast-text').textContent = text;
  const btn = $('#toast-action');
  btn.hidden = !actionLabel;
  btn.textContent = actionLabel ?? '';
  btn.onclick = async () => {
    hideToast();
    await action?.();
  };
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
  $('#toast').hidden = true;
}

// Registro

async function record(ml, tagToken, source) {
  const drink = await store.addDrink({ ml, tagToken, source });
  await render();
  toast(`+${ml} ml`, 'Desfazer', async () => {
    await store.removeDrink(drink.id);
    await render();
  });
}

async function handleTag(token) {
  const tag = await store.getTag(token);
  if (!tag) {
    toast('Chip não reconhecido', 'Cadastrar', async () => {
      await store.addTag({ token, label: 'Garrafa', ml: DEFAULT_BOTTLE_ML });
      await openSettings();
    });
    return;
  }

  const s = await store.getSettings();
  const last = await store.lastDrinkForTag(token);
  const ago = last ? Date.now() - new Date(last.createdAt).getTime() : Infinity;
  if (ago < s.cooldownMin * 60000) {
    const min = Math.round(ago / 60000);
    toast(min < 1 ? 'Registrado há instantes' : `Já registrado há ${min} min`, 'Registrar', () =>
      record(tag.ml, token, 'nfc'));
    return;
  }
  await record(tag.ml, token, 'nfc');
}

async function toggleTraining() {
  const key = dayKey(new Date());
  const boosts = await store.getBoosts();
  await store.setBoost(key, boosts[key] ? 0 : TRAIN_BOOST_ML);
  render();
}

// Sheet: registrar

async function openAdd() {
  const tags = await store.listTags();
  const el = $('#add-options');
  el.innerHTML = '';
  const options = [
    ...tags.map((t) => ({ label: t.label, ml: t.ml, token: t.token, icon: ICONS.bottle })),
    { label: 'Copo', ml: GLASS_ML, token: null, icon: ICONS.glass },
  ];
  for (const o of options) {
    const b = document.createElement('button');
    b.className = 'row option';
    b.innerHTML = `<span class="ico">${o.icon}</span><span class="entry"><b></b></span><span class="entry-ml muted">${o.ml} ml</span>`;
    b.querySelector('b').textContent = o.label;
    b.onclick = async () => {
      $('#add-sheet').close();
      await record(o.ml, o.token, 'manual');
    };
    el.append(b);
  }
  $('#add-sheet').showModal();
}

// Sheet: ajustes

async function openSettings() {
  await renderSettings();
  $('#settings-sheet').showModal();
}

async function renderSettings() {
  const s = await store.getSettings();
  $('#set-weight').value = s.weightKg ?? '';
  $('#set-goal').value = s.goalMl;
  $('#set-start').value = s.windowStart;
  $('#set-end').value = s.windowEnd;
  $('#set-cooldown').value = s.cooldownMin;
  renderSuggestion(s);
  await renderTags();
}

function renderSuggestion(s) {
  const row = $('#suggest-row');
  const goal = s.weightKg ? suggestedGoal(s.weightKg) : null;
  row.hidden = !goal || goal === s.goalMl;
  if (goal) $('#suggest-text').textContent = `Sugestão: ${liters(goal)} L (35 ml/kg)`;
}

const tagUrl = (token) => `${location.origin}${location.pathname}?tag=${token}`;

async function renderTags() {
  const tags = await store.listTags();
  const el = $('#tag-list');
  el.innerHTML = '';
  if (!tags.length) {
    el.innerHTML = '<div class="row muted">Nenhuma garrafa cadastrada.</div>';
    return;
  }
  for (const t of tags) {
    const row = document.createElement('div');
    row.className = 'tag';
    row.innerHTML = `
      <div class="row">
        <input class="tag-label" aria-label="Nome da garrafa">
        <span class="field"><input class="tag-ml" type="number" inputmode="numeric" aria-label="Mililitros"> ml</span>
      </div>
      <div class="row tag-actions">
        <span class="tag-url"></span>
        <button class="link-btn copy">Copiar URL</button>
        <button class="link-btn danger remove">Remover</button>
      </div>`;
    const url = tagUrl(t.token);
    row.querySelector('.tag-label').value = t.label;
    row.querySelector('.tag-ml').value = t.ml;
    row.querySelector('.tag-url').textContent = url;

    row.querySelector('.tag-label').onchange = async (e) => {
      await store.updateTag(t.token, { label: e.target.value.trim() || 'Garrafa' });
      render();
    };
    row.querySelector('.tag-ml').onchange = async (e) => {
      const ml = Number(e.target.value);
      if (ml >= 50 && ml <= 5000) await store.updateTag(t.token, { ml });
      else e.target.value = t.ml;
      render();
    };
    row.querySelector('.copy').onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast('URL copiada');
      } catch {
        prompt('Copie a URL:', url);
      }
    };
    row.querySelector('.remove').onclick = async () => {
      if (!confirm(`Remover “${t.label}”? Os registros antigos continuam.`)) return;
      await store.removeTag(t.token);
      renderTags();
      render();
    };
    el.append(row);
  }
}

function bindNumber(sel, field, isValid) {
  $(sel).addEventListener('change', async (e) => {
    const s = await store.getSettings();
    const v = e.target.value === '' ? null : Number(e.target.value);
    if (!isValid(v, s)) {
      e.target.value = s[field] ?? '';
      return;
    }
    await store.updateSettings({ [field]: v });
    renderSuggestion(await store.getSettings());
    render();
  });
}

function bindSettings() {
  bindNumber('#set-weight', 'weightKg', (v) => v === null || (v >= 20 && v <= 300));
  bindNumber('#set-goal', 'goalMl', (v) => v >= 500 && v <= 8000);
  bindNumber('#set-start', 'windowStart', (v, s) => Number.isInteger(v) && v >= 0 && v < s.windowEnd);
  bindNumber('#set-end', 'windowEnd', (v, s) => Number.isInteger(v) && v <= 24 && v > s.windowStart);
  bindNumber('#set-cooldown', 'cooldownMin', (v) => v >= 0 && v <= 120);

  $('#suggest-use').onclick = async () => {
    const s = await store.getSettings();
    await store.updateSettings({ goalMl: suggestedGoal(s.weightKg) });
    await renderSettings();
    render();
  };

  $('#new-tag-add').onclick = async () => {
    const label = $('#new-tag-label').value.trim() || 'Garrafa';
    const ml = Number($('#new-tag-ml').value) || DEFAULT_BOTTLE_ML;
    if (ml < 50 || ml > 5000) return toast('Use entre 50 e 5000 ml');
    await store.addTag({ label, ml });
    $('#new-tag-label').value = '';
    $('#new-tag-ml').value = '';
    await renderTags();
    render();
  };

  $('#export-btn').onclick = async () => {
    const blob = new Blob([await store.exportAll()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `agua-backup-${dayKey(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  $('#import-btn').onclick = () => $('#import-file').click();
  $('#import-file').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !confirm('Substituir todos os dados atuais pelo backup?')) return;
    try {
      await store.importAll(await file.text());
      await renderSettings();
      render();
      toast('Backup importado');
    } catch {
      toast('Arquivo de backup inválido');
    }
  };
}

// Init

function bindSheets() {
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
  }
}

async function init() {
  navigator.storage?.persist?.();
  bindSheets();
  bindSettings();
  $('#add-btn').onclick = openAdd;
  $('#open-settings').onclick = openSettings;
  $('#week').addEventListener('click', (e) => {
    const day = e.target.closest('[data-day]');
    if (!day) return;
    selectedDay = day.dataset.day === selectedDay ? null : day.dataset.day;
    render();
  });
  $('#glass').addEventListener('click', (e) => {
    if (e.target.closest('[data-action="train"]')) toggleTraining();
  });

  const token = new URLSearchParams(location.search).get('tag');
  if (token) {
    // Limpa a URL para que recarregar a página não registre de novo
    history.replaceState(null, '', location.pathname);
    await handleTag(token);
  }
  await render();

  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  setInterval(render, 60000);
}

init();
