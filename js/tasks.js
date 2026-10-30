// Seções Tarefas e Notas.

import * as bar from './bar.js';
import { $, esc, dayKey } from './util.js';
import { say, toast, refresh } from './ui.js';
import { RULES } from './game.js';

function add(text) {
  bar.update((d) => {
    d.tasks.push({ id: bar.newId(), text, createdAt: new Date().toISOString(), doneAt: null, archived: false });
  });
  refresh();
}

function toggle(id) {
  const k = dayKey(new Date());
  const done = bar.update((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (!t) return null;
    t.doneAt = t.doneAt ? null : new Date().toISOString();
    return t.doneAt ? d.tasks.filter((x) => x.doneAt && dayKey(new Date(x.doneAt)) === k).length : null;
  });
  if (done) {
    const xp = RULES.tasks[done - 1] ?? RULES.taskRest;
    say(done === 1 ? `Primeira tarefa do dia! +${xp} XP 🎉` : `Mais uma! +${xp} XP`);
  }
  refresh();
}

function remove(id) {
  // Concluídas são arquivadas (mantêm o XP); abertas são apagadas
  const removed = bar.update((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (!t) return null;
    if (t.doneAt) t.archived = true;
    else d.tasks = d.tasks.filter((x) => x.id !== id);
    return structuredClone(t);
  });
  refresh();
  if (removed && !removed.doneAt) {
    toast('Tarefa apagada', 'Desfazer', () => {
      bar.update((d) => { d.tasks.push(removed); });
      refresh();
    });
  }
}

export function init() {
  $('#t-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#t-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    add(text);
  });
  $('#t-list').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    if (e.target.closest('.x')) remove(li.dataset.id);
    else if (e.target.closest('.check, .t-text')) toggle(li.dataset.id);
  });
  $('#t-clear').onclick = () => {
    bar.update((d) => { for (const t of d.tasks) if (t.doneAt) t.archived = true; });
    refresh();
  };

  // Notas: salva enquanto digita
  let timer;
  $('#notes').value = bar.load().notes;
  $('#notes').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => bar.update((d) => { d.notes = e.target.value; }), 400);
  });
}

export function render({ b }) {
  const visible = b.tasks.filter((t) => !t.archived);
  const open = visible.filter((t) => !t.doneAt);
  const done = visible.filter((t) => t.doneAt);
  $('#tasks-meta').textContent = open.length ? `${open.length} aberta${open.length > 1 ? 's' : ''}` : done.length ? 'tudo feito ✓' : '';
  $('#t-list').innerHTML = [...open, ...done].map((t) => `
    <li data-id="${t.id}" class="${t.doneAt ? 'done' : ''}">
      <button class="check" aria-label="${t.doneAt ? 'Reabrir' : 'Concluir'}"></button>
      <span class="t-text">${esc(t.text)}</span>
      <button class="x" aria-label="Remover">×</button>
    </li>`).join('') || '<li class="empty">Sem tarefas. Escreva acima e aperte Enter.</li>';
  $('#t-clear').hidden = !done.length;

  // Não sobrescreve as notas enquanto você digita
  const notes = $('#notes');
  if (document.activeElement !== notes && notes.value !== b.notes) notes.value = b.notes;
}
