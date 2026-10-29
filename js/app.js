import * as store from './storage.js';

const $ = (sel) => document.querySelector(sel);

const TRAIN_BOOST_ML = 500;
const GLASS_ML = 250;
const DEFAULT_BOTTLE_ML = 500;
const RING_C = 2 * Math.PI * 86;

// Datas sempre no fuso local do aparelho

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const clockTime = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const liters = (ml) =>
  (ml / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const amount = (ml) => (ml >= 1000 ? `${liters(ml)} L` : `${Math.round(ml)} ml`);

const suggestedGoal = (kg) => Math.round((kg * 35) / 50) * 50;

function paceFraction(now, s) {
  const h = now.getHours() + now.getMinutes() / 60;
  return Math.min(1, Math.max(0, (h - s.windowStart) / (s.windowEnd - s.windowStart)));
}

function statusFor(total, goal, s, now, bottleMl) {
  if (total >= goal) return ['done', 'Meta atingida. Bom trabalho.'];
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < s.windowStart) return ['ok', total ? 'No ritmo' : `Seu dia começa às ${s.windowStart}h`];
  if (h >= s.windowEnd) return ['behind', `Faltam ${amount(goal - total)} para a meta`];
  const deficit = goal * paceFraction(now, s) - total;
  if (deficit <= bottleMl / 2) return ['ok', 'No ritmo'];
  const n = Math.ceil(deficit / bottleMl);
  return ['behind', `Um pouco atrás · ${n} garrafa${n > 1 ? 's' : ''}`];
}

// Render

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

  $('#today-label').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  renderRing(total, goal, s, now);

  const [cls, text] = statusFor(total, goal, s, now, tags[0]?.ml ?? DEFAULT_BOTTLE_ML);
  const status = $('#status');
  status.className = `status ${cls}`;
  status.textContent = text;

  $('#train-btn').setAttribute('aria-pressed', String(Boolean(boosts[key])));
  renderWeek(today, totals, goalFor);
  renderToday(drinks.filter((d) => dayKey(new Date(d.createdAt)) === key), tags);
}

function renderRing(total, goal, s, now) {
  const pct = goal ? Math.min(total / goal, 1) : 0;
  const fill = $('#ring-fill');
  fill.style.strokeDasharray = RING_C;
  fill.style.strokeDashoffset = RING_C * (1 - pct);
  fill.style.opacity = total > 0 ? 1 : 0;

  $('#total').textContent = liters(total);
  $('#goal').textContent = liters(goal);

  const frac = paceFraction(now, s);
  const pace = $('#ring-pace');
  pace.style.display = frac > 0 && frac < 1 && total < goal ? '' : 'none';
  pace.setAttribute('transform', `rotate(${frac * 360} 100 100)`);
}

function renderWeek(today, totals, goalFor) {
  const el = $('#week');
  el.innerHTML = '';
  const r = 15;
  const c = 2 * Math.PI * r;
  let met = 0;
  let sum = 0;
  let days = 0;

  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const k = dayKey(d);
    const t = totals[k] ?? 0;
    const g = goalFor(k);
    if (t >= g) met++;
    if (t > 0) { sum += t; days++; }

    const pct = Math.min(t / g, 1);
    const classes = ['day', i === 0 && 'is-today', t >= g && 'is-met'].filter(Boolean).join(' ');
    el.insertAdjacentHTML('beforeend', `
      <div class="${classes}" title="${liters(t)} L">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle class="mini-track" cx="20" cy="20" r="${r}"/>
          <circle class="mini-fill" cx="20" cy="20" r="${r}" transform="rotate(-90 20 20)"
            stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" opacity="${t ? 1 : 0}"/>
        </svg>
        <span>${d.toLocaleDateString('pt-BR', { weekday: 'narrow' })}</span>
      </div>`);
  }

  $('#week-summary').textContent =
    `${met} de 7 dias na meta` + (days ? ` · média ${liters(sum / days)} L` : '');
}

function renderToday(list, tags) {
  const el = $('#today-list');
  el.innerHTML = '';
  if (!list.length) {
    el.innerHTML = '<li class="empty">Nenhum registro ainda.</li>';
    return;
  }
  for (const d of [...list].reverse()) {
    const time = clockTime(new Date(d.createdAt));
    const label = d.tagToken ? (tags.find((t) => t.token === d.tagToken)?.label ?? 'Garrafa') : 'Copo';
    const li = document.createElement('li');
    li.innerHTML = '<span class="time"></span><span class="label"></span><span class="ml"></span><button class="del" aria-label="Remover">×</button>';
    li.querySelector('.time').textContent = time;
    li.querySelector('.label').textContent = label;
    li.querySelector('.ml').textContent = `${d.ml} ml`;
    li.querySelector('.del').onclick = async () => {
      if (!confirm(`Remover ${d.ml} ml das ${time}?`)) return;
      await store.removeDrink(d.id);
      render();
    };
    el.append(li);
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
    ...tags.map((t) => ({ label: t.label, ml: t.ml, token: t.token })),
    { label: 'Copo', ml: GLASS_ML, token: null },
  ];
  for (const o of options) {
    const b = document.createElement('button');
    b.className = 'row option';
    b.innerHTML = '<span></span><span class="muted"></span>';
    b.children[0].textContent = o.label;
    b.children[1].textContent = `${o.ml} ml`;
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
  $('#train-btn').onclick = toggleTraining;
  $('#open-settings').onclick = openSettings;

  const token = new URLSearchParams(location.search).get('tag');
  if (token) {
    // Limpa a URL para que recarregar a página não registre de novo
    history.replaceState(null, '', location.pathname);
    await handleTag(token);
  }
  await render();

  if (!token && !(await store.listTags()).length) {
    toast('Cadastre sua garrafa para começar', 'Ajustes', openSettings);
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  setInterval(render, 60000);
}

init();
