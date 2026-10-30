// Ajustes: expediente, lembretes, alertas, água, garrafas, pet e backup.

import * as bar from './bar.js';
import * as store from './storage.js';
import { $, esc, dayKey, liters } from './util.js';
import { toast, refresh, chime, notify } from './ui.js';
import { SPECIES } from './pet.js';
import * as onboarding from './onboarding.js';

const suggestedGoal = (kg) => Math.round((kg * 35) / 50) * 50;

export function open() {
  render();
  $('#settings').showModal();
}

async function render() {
  const b = bar.load();
  const s = await store.getSettings();
  $('#s-pet-name').value = b.pet?.name ?? '';
  $('#s-species').value = b.pet?.species ?? 'agua';
  $('#s-work-start').value = b.prefs.workStart;
  $('#s-work-end').value = b.prefs.workEnd;
  for (const k of ['stretch', 'eyes', 'water']) {
    $(`#s-${k}-on`).checked = b.reminders[k].on;
    $(`#s-${k}-every`).value = b.reminders[k].every;
  }
  $('#s-sound').checked = b.prefs.sound;
  $('#s-notify').checked = b.prefs.notify;
  $('#s-notify-state').textContent = !('Notification' in window) ? 'não suportado'
    : Notification.permission === 'granted' ? 'permitidas' : Notification.permission === 'denied' ? 'bloqueadas' : '';
  $('#s-weight').value = s.weightKg ?? '';
  $('#s-goal').value = s.goalMl;
  $('#s-win-start').value = s.windowStart;
  $('#s-win-end').value = s.windowEnd;
  const goal = s.weightKg ? suggestedGoal(s.weightKg) : null;
  $('#s-suggest').hidden = !goal || goal === s.goalMl;
  if (goal) $('#s-suggest-text').textContent = `Sugestão: ${liters(goal)} L (35 ml/kg)`;
  await renderBottles();
}

async function renderBottles() {
  const tags = await store.listTags();
  const base = `${location.origin}${location.pathname}`;
  $('#s-bottles').innerHTML = tags.map((t) => `
    <div class="bottle" data-token="${t.token}">
      <input class="b-label" value="${esc(t.label)}" aria-label="Nome">
      <input class="b-ml" type="number" value="${t.ml}" aria-label="ml"><span class="muted">ml</span>
      <button class="link copy" title="${esc(base)}?tag=${t.token}">Link</button>
      <button class="x" aria-label="Remover">×</button>
    </div>`).join('') || '<p class="muted small">Nenhuma garrafa. O botão usa 500 ml.</p>';
}

function num(sel, valid, apply) {
  $(sel).addEventListener('change', async (e) => {
    const v = e.target.value === '' ? null : Number(e.target.value);
    if (!valid(v)) return render();
    await apply(v);
    render();
    refresh();
  });
}

function check(sel, apply) {
  $(sel).addEventListener('change', (e) => {
    bar.update((d) => apply(d, e.target.checked));
    refresh();
  });
}

export function init() {
  $('#settings').addEventListener('click', (e) => { if (e.target === $('#settings')) $('#settings').close(); });
  $('#s-close').onclick = () => $('#settings').close();
  $('#s-tutorial').onclick = () => {
    $('#settings').close();
    onboarding.open();
  };

  $('#s-pet-name').addEventListener('change', (e) => {
    const name = e.target.value.trim();
    if (name) bar.update((d) => { if (d.pet) d.pet.name = name; });
    refresh();
  });
  $('#s-species').innerHTML = Object.entries(SPECIES).map(([k, v]) => `<option value="${k}">${v.label} (${v.names[0]})</option>`).join('');
  $('#s-species').addEventListener('change', (e) => {
    bar.update((d) => { if (d.pet) d.pet.species = e.target.value; });
    refresh();
  });

  const hour = (v) => Number.isInteger(v) && v >= 0 && v <= 24;
  num('#s-work-start', (v) => hour(v) && v < bar.load().prefs.workEnd, (v) => bar.update((d) => { d.prefs.workStart = v; }));
  num('#s-work-end', (v) => hour(v) && v > bar.load().prefs.workStart, (v) => bar.update((d) => { d.prefs.workEnd = v; }));
  for (const k of ['stretch', 'eyes', 'water']) {
    check(`#s-${k}-on`, (d, on) => { d.reminders[k].on = on; });
    num(`#s-${k}-every`, (v) => v >= 10 && v <= 240, (v) => bar.update((d) => { d.reminders[k].every = v; }));
  }
  check('#s-sound', (d, on) => { d.prefs.sound = on; });
  check('#s-notify', (d, on) => { d.prefs.notify = on; });
  $('#s-test').onclick = async () => {
    chime(true);
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    notify('Teste da barra', 'Assim chegam os lembretes. 💧', true);
    render();
  };

  num('#s-weight', (v) => v === null || (v >= 20 && v <= 300), (v) => store.updateSettings({ weightKg: v }));
  num('#s-goal', (v) => v >= 500 && v <= 8000, (v) => store.updateSettings({ goalMl: v }));
  num('#s-win-start', (v) => Number.isInteger(v) && v >= 0 && v < 24, (v) => store.updateSettings({ windowStart: v }));
  num('#s-win-end', (v) => Number.isInteger(v) && v > 0 && v <= 24, (v) => store.updateSettings({ windowEnd: v }));
  $('#s-suggest-use').onclick = async () => {
    const s = await store.getSettings();
    await store.updateSettings({ goalMl: suggestedGoal(s.weightKg) });
    render();
    refresh();
  };

  // Garrafas
  $('#s-bottles').addEventListener('change', async (e) => {
    const row = e.target.closest('[data-token]');
    if (!row) return;
    if (e.target.matches('.b-label')) await store.updateTag(row.dataset.token, { label: e.target.value.trim() || 'Garrafa' });
    if (e.target.matches('.b-ml')) {
      const ml = Number(e.target.value);
      if (ml >= 50 && ml <= 5000) await store.updateTag(row.dataset.token, { ml });
    }
    renderBottles();
    refresh();
  });
  $('#s-bottles').addEventListener('click', async (e) => {
    const row = e.target.closest('[data-token]');
    if (!row) return;
    if (e.target.matches('.copy')) {
      const url = `${location.origin}${location.pathname}?tag=${row.dataset.token}`;
      try { await navigator.clipboard.writeText(url); toast('Link copiado'); } catch { prompt('Copie o link:', url); }
    }
    if (e.target.matches('.x') && confirm('Remover esta garrafa? Os registros continuam.')) {
      await store.removeTag(row.dataset.token);
      renderBottles();
      refresh();
    }
  });
  $('#s-bottle-add').onclick = async () => {
    await store.addTag({ label: 'Garrafa', ml: 500 });
    renderBottles();
    refresh();
  };

  // Backup com os dois conjuntos de dados
  $('#s-export').onclick = async () => {
    const data = { app: 'barra', exportedAt: new Date().toISOString(), water: JSON.parse(await store.exportAll()), barra: bar.load() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `barra-backup-${dayKey(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#s-import').onclick = () => $('#s-import-file').click();
  $('#s-import-file').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !confirm('Substituir os dados atuais pelo backup?')) return;
    try {
      const data = JSON.parse(await file.text());
      // Aceita também o backup antigo do app Água
      await store.importAll(JSON.stringify(data.water ?? data));
      if (data.barra) bar.save(data.barra);
      render();
      refresh();
      toast('Backup importado');
    } catch {
      toast('Arquivo de backup inválido');
    }
  };
}
