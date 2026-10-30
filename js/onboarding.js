// Tutorial de primeira vez: apresenta a barra e ajuda a preencher o que
// a água e os lembretes precisam (peso, meta, garrafa, horários).

import * as bar from './bar.js';
import * as store from './storage.js';
import { $, esc, liters } from './util.js';
import { refresh, chime, notify } from './ui.js';
import { SPECIES, petSvg } from './pet.js';
import { loadWater, mainBottle } from './water.js';

const suggestedGoal = (kg) => Math.round((kg * 35) / 50) * 50;
const BOTTLE_SIZES = [350, 500, 750, 1000];

let step = 0;
let draft;
let onDone = () => {};

const int = (v) => (v === '' || v == null ? NaN : Number(v));
const isHour = (v) => Number.isInteger(v) && v >= 0 && v <= 24;

const STEPS = [
  {
    render: () => `
      <div class="ob-hero">${petSvg(draft.species, 1, 'happy')}</div>
      <h2>Bem-vindo à Barra!</h2>
      <p>Ela fica no canto da tela e cuida de você enquanto você trabalha:</p>
      <ul class="ob-list">
        <li>💧 conta a <b>água</b> que você bebe</li>
        <li>🧘 lembra de <b>alongar</b> e <b>descansar a vista</b></li>
        <li>✅ guarda suas <b>tarefas</b> e <b>notas</b></li>
        <li>🎵 toca <b>música</b> do YouTube</li>
      </ul>
      <p>E tem um <b>bichinho</b> que cresce conforme você se cuida. Leva 2 minutos para configurar.</p>`,
  },
  {
    render: () => `
      <h2>Escolha seu parceiro</h2>
      <p class="muted">Água, pausas e tarefas dão XP. Ele evolui no nível 5 e no 10.</p>
      <div class="st-grid">${Object.entries(SPECIES).map(([k, v]) => `
        <button class="st-card ${k === draft.species ? 'on' : ''}" data-species="${k}">
          ${petSvg(k, 1, 'happy')}<b>${esc(v.names[0])}</b><span class="muted">${v.label}</span>
        </button>`).join('')}
      </div>
      <label class="field-col">Nome do pet<input id="ob-name" maxlength="20" value="${esc(draft.name)}"></label>`,
    bind: (body) => {
      body.querySelector('.st-grid').onclick = (e) => {
        const card = e.target.closest('[data-species]');
        if (!card) return;
        const oldDefault = SPECIES[draft.species].names[0];
        draft.species = card.dataset.species;
        if (!draft.name || draft.name === oldDefault) draft.name = SPECIES[draft.species].names[0];
        draw();
      };
      $('#ob-name').oninput = (e) => { draft.name = e.target.value; };
    },
    check: () => (draft.name.trim() ? null : 'Dê um nome ao seu pet.'),
  },
  {
    render: () => `
      <h2>💧 Sua meta de água</h2>
      <p>A referência é <b>35 ml por kg</b> de peso. Me diz seu peso que eu calculo.</p>
      <div class="group">
        <label class="row">Peso<span class="field"><input id="ob-weight" type="number" inputmode="decimal" placeholder="ex.: 70" value="${draft.weightKg ?? ''}"> kg</span></label>
        <label class="row">Meta diária<span class="field"><input id="ob-goal" type="number" inputmode="numeric" value="${draft.goalMl}"> ml</span></label>
      </div>
      <p class="ob-hint" id="ob-goal-hint"></p>
      <p class="muted small">Pode ajustar a meta à vontade. Em dia de treino, aperte <b>Treino</b> na seção Água (+500 ml só naquele dia).</p>`,
    bind: () => {
      const hint = () => {
        $('#ob-goal-hint').textContent = draft.weightKg
          ? `Sugestão para ${draft.weightKg} kg: ${liters(suggestedGoal(draft.weightKg))} L por dia.`
          : 'Sem peso, uso 2,5 L por dia.';
      };
      $('#ob-weight').oninput = (e) => {
        const kg = Number(e.target.value);
        draft.weightKg = kg >= 20 && kg <= 300 ? kg : null;
        if (draft.weightKg && !draft.goalTouched) {
          draft.goalMl = suggestedGoal(draft.weightKg);
          $('#ob-goal').value = draft.goalMl;
        }
        hint();
      };
      $('#ob-goal').oninput = (e) => {
        draft.goalTouched = true;
        draft.goalMl = int(e.target.value);
      };
      hint();
    },
    check: () => {
      if ($('#ob-weight').value && !draft.weightKg) return 'Peso entre 20 e 300 kg.';
      return draft.goalMl >= 500 && draft.goalMl <= 8000 ? null : 'Meta entre 500 e 8000 ml.';
    },
  },
  {
    render: () => `
      <h2>🍶 Sua garrafa</h2>
      <p>Qual garrafa ou copo você usa no dia a dia? Ela vira o <b>botão principal</b>: um clique registra ela inteira.</p>
      <div class="group">
        <label class="row">Nome<input id="ob-bottle-name" maxlength="24" value="${esc(draft.bottleLabel)}"></label>
        <label class="row">Cabe<span class="field"><input id="ob-bottle-ml" type="number" inputmode="numeric" value="${draft.bottleMl}"> ml</span></label>
      </div>
      <div class="ob-chips">${BOTTLE_SIZES.map((ml) => `<button class="pill ${ml === draft.bottleMl ? 'primary' : ''}" data-ml="${ml}">${ml} ml</button>`).join('')}</div>
      <p class="muted small">Dica: a capacidade costuma estar escrita no rótulo ou no fundo da garrafa. Para doses menores tem o botão <b>Copo 250</b>.</p>`,
    bind: (body) => {
      $('#ob-bottle-name').oninput = (e) => { draft.bottleLabel = e.target.value; };
      $('#ob-bottle-ml').oninput = (e) => { draft.bottleMl = int(e.target.value); };
      body.querySelector('.ob-chips').onclick = (e) => {
        const chip = e.target.closest('[data-ml]');
        if (!chip) return;
        draft.bottleMl = Number(chip.dataset.ml);
        draw();
      };
    },
    check: () => (draft.bottleMl >= 50 && draft.bottleMl <= 5000 ? null : 'Garrafa entre 50 e 5000 ml.'),
  },
  {
    render: () => `
      <h2>⏰ Seus horários</h2>
      <p><b>Expediente:</b> quando você está no computador. Fora dele o pet dorme e os lembretes param.</p>
      <div class="group">
        <label class="row">Começo<span class="field"><input id="ob-work-start" type="number" value="${draft.workStart}"> h</span></label>
        <label class="row">Fim<span class="field"><input id="ob-work-end" type="number" value="${draft.workEnd}"> h</span></label>
      </div>
      <p><b>Dia de água:</b> de quando você acorda até umas 2 h antes de dormir. A meta é dividida nesse período, e o anel mostra se você está no ritmo.</p>
      <div class="group">
        <label class="row">De<span class="field"><input id="ob-win-start" type="number" value="${draft.windowStart}"> h</span></label>
        <label class="row">Até<span class="field"><input id="ob-win-end" type="number" value="${draft.windowEnd}"> h</span></label>
      </div>`,
    bind: () => {
      for (const [id, key] of [['ob-work-start', 'workStart'], ['ob-work-end', 'workEnd'], ['ob-win-start', 'windowStart'], ['ob-win-end', 'windowEnd']]) {
        $(`#${id}`).oninput = (e) => { draft[key] = int(e.target.value); };
      }
    },
    check: () => {
      if (![draft.workStart, draft.workEnd, draft.windowStart, draft.windowEnd].every(isHour)) return 'Use horas cheias, de 0 a 24.';
      if (draft.workStart >= draft.workEnd) return 'O fim do expediente precisa ser depois do começo.';
      if (draft.windowStart >= draft.windowEnd) return 'O fim do dia de água precisa ser depois do começo.';
      return null;
    },
  },
  {
    render: () => {
      const r = draft.reminders;
      const row = (k, label) => `
        <label class="row"><span><input type="checkbox" data-on="${k}" ${r[k].on ? 'checked' : ''}> ${label}</span>
        <span class="field"><input type="number" data-every="${k}" value="${r[k].every}"> min</span></label>`;
      return `
        <h2>🔔 Lembretes</h2>
        <p>O pet avisa no balão dele. Escolha o que quer e de quanto em quanto tempo:</p>
        <div class="group">
          ${row('stretch', 'Alongar a cada')}
          ${row('eyes', 'Descansar a vista a cada')}
          ${row('water', 'Água, se sem beber há')}
        </div>
        <p>Para não perder os avisos quando estiver em outra janela, libere <b>som</b> e <b>notificações</b>:</p>
        <div class="group">
          <label class="row"><span><input type="checkbox" id="ob-sound" ${draft.sound ? 'checked' : ''}> Tocar som</span></label>
          <div class="row"><span>Notificações <span class="muted small" id="ob-notif-state"></span></span>
            <button class="pill primary" id="ob-notif">Permitir e testar</button></div>
        </div>
        <p class="muted small">Quando o navegador perguntar, clique em <b>Permitir</b>.</p>`;
    },
    bind: (body) => {
      body.querySelectorAll('[data-on]').forEach((el) => {
        el.onchange = () => { draft.reminders[el.dataset.on].on = el.checked; };
      });
      body.querySelectorAll('[data-every]').forEach((el) => {
        el.oninput = () => { draft.reminders[el.dataset.every].every = int(el.value); };
      });
      $('#ob-sound').onchange = (e) => { draft.sound = e.target.checked; };
      const state = () => {
        const p = 'Notification' in window ? Notification.permission : 'unsupported';
        $('#ob-notif-state').textContent = { granted: '✓ liberadas', denied: '✗ bloqueadas', default: '', unsupported: 'não suportadas' }[p];
        if (p === 'denied') $('#ob-notif-state').title = 'Libere no cadeado ao lado do endereço do site.';
      };
      $('#ob-notif').onclick = async () => {
        chime(true);
        if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
        notify('Barra', 'Assim chegam os lembretes. 💧', true);
        state();
      };
      state();
    },
    check: () => (Object.values(draft.reminders).every((r) => r.every >= 10 && r.every <= 240)
      ? null : 'Intervalos entre 10 e 240 minutos.'),
  },
  {
    render: () => `
      <div class="ob-hero">${petSvg(draft.species, 1, 'happy')}</div>
      <h2>Tudo pronto!</h2>
      <p><b>Fixe a barra no Edge:</b> com o site aberto numa aba, clique no <b>+</b> da barra lateral do Edge e escolha adicionar a página atual.</p>
      <p><b>Como o ${esc(draft.name.trim())} cresce:</b></p>
      <ul class="ob-list">
        <li>💧 cada gole até a meta, e bônus por dias seguidos na meta</li>
        <li>🙆 pausas quando ele chamar (ou nos botões de Pausas)</li>
        <li>✅ tarefas concluídas e sessões de foco</li>
      </ul>
      <p><b>Moedas:</b> a cada 10 XP você ganha 1 🪙. Use na <b>Loja</b> (botão no canto da casinha) para comprar cenários, móveis e fantasias. Os itens vão liberando conforme o nível sobe.</p>
      <p class="muted small">Ele nunca morre: se você esquecer de algo, só fica tristinho até você voltar. Seus dados ficam só neste navegador; de vez em quando exporte um backup em Ajustes.</p>`,
  },
];

function draw() {
  const s = STEPS[step];
  const body = $('#ob-body');
  body.innerHTML = s.render();
  s.bind?.(body);
  $('#ob-error').textContent = '';
  $('#ob-dots').innerHTML = STEPS.map((_, i) => `<i class="${i === step ? 'on' : i < step ? 'done' : ''}"></i>`).join('');
  $('#ob-back').style.visibility = step ? 'visible' : 'hidden';
  $('#ob-next').textContent = step === STEPS.length - 1 ? 'Começar' : step ? 'Próximo' : 'Vamos lá';
  body.scrollTop = 0;
  body.querySelector('input:not([type="checkbox"])')?.focus();
}

async function finish() {
  const now = new Date().toISOString();
  bar.update((d) => {
    d.pet = { species: draft.species, name: draft.name.trim(), createdAt: d.pet?.createdAt ?? now };
    d.prefs.workStart = draft.workStart;
    d.prefs.workEnd = draft.workEnd;
    d.prefs.sound = draft.sound;
    d.reminders = draft.reminders;
  });
  await store.updateSettings({
    weightKg: draft.weightKg, goalMl: draft.goalMl,
    windowStart: draft.windowStart, windowEnd: draft.windowEnd,
  });
  const label = draft.bottleLabel.trim() || 'Garrafa';
  if (draft.bottleToken) await store.updateTag(draft.bottleToken, { label, ml: draft.bottleMl });
  else await store.addTag({ label, ml: draft.bottleMl });
  $('#onboard').close();
  await refresh();
  onDone(draft.name.trim());
}

export function init() {
  $('#ob-back').onclick = () => { step--; draw(); };
  $('#ob-next').onclick = async () => {
    const err = STEPS[step].check?.();
    if (err) {
      $('#ob-error').textContent = err;
      return;
    }
    if (step === STEPS.length - 1) return finish();
    step++;
    draw();
  };
  $('#ob-body').addEventListener('input', () => { $('#ob-error').textContent = ''; });
  $('#ob-body').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input')) $('#ob-next').click();
  });
  // Na primeira vez não dá para fechar sem terminar
  $('#onboard').addEventListener('cancel', (e) => { if (!bar.load().pet) e.preventDefault(); });
}

// Abre o tutorial com os valores atuais (para rever depois em Ajustes)
export async function open(done = () => {}) {
  onDone = done;
  const b = bar.load();
  const w = await loadWater();
  const s = w.settings;
  const bottle = w.tags.length ? mainBottle(w) : null;
  draft = {
    species: b.pet?.species ?? 'agua',
    name: b.pet?.name ?? SPECIES.agua.names[0],
    weightKg: s.weightKg,
    goalMl: s.goalMl,
    goalTouched: Boolean(b.pet),
    bottleToken: bottle?.token ?? null,
    bottleLabel: bottle?.label ?? 'Minha garrafa',
    bottleMl: bottle?.ml ?? 500,
    workStart: b.prefs.workStart,
    workEnd: b.prefs.workEnd,
    windowStart: s.windowStart,
    windowEnd: s.windowEnd,
    sound: b.prefs.sound,
    reminders: structuredClone(b.reminders),
  };
  step = 0;
  draw();
  $('#onboard').showModal();
}
