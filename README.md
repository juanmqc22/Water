# Barra

Barra lateral de trabalho com um pet que cresce com seus hábitos: água, pausas e tarefas.
Feita para ficar fixa na barra lateral do Edge (≈ 385 px), sem instalar nada.

Site estático no GitHub Pages: `https://juanmqc22.github.io/Water/`.
Os dados ficam no `localStorage` do navegador. O histórico do antigo app Água (chave `water.v1`) é reaproveitado.

## Funcionalidades

- **Pet:** 3 espécies originais (Água, Planta, Fogo), cada uma com 3 estágios (evolui nos níveis 5 e 10).
  Mostra hidratação, energia e humor, reage ao que você faz e avisa os lembretes num balão.
- **Água:** anel de progresso com marcador de ritmo, garrafa, copo, treino (+500 ml), semana e desfazer.
  Os links de garrafa (`?tag=<token>`) continuam funcionando.
- **Pausas:** alongar e descansar a vista, com lembretes, adiar 10 min e modo foco (25/50 min).
- **Tarefas e notas:** lista do dia e um bloco de notas que salva sozinho.
- **Música:** player do YouTube embutido, com links e playlists salvos.
- **Agenda:** compromissos digitados à mão, com aviso 5 min antes.
- Som e notificação do Windows (quando a barra não está em foco). Backup em JSON.

## Gamificação

O XP é calculado a partir dos registros reais, então desfazer também desfaz o XP.

| Ação | XP | Limite por dia |
|---|---|---|
| Água | 1 a cada 50 ml | até a meta |
| Meta de água batida | 20 + 2 por dia de sequência | sequência conta até +20 |
| Alongar | 10 | 8 (mín. 15 min entre elas) |
| Descansar a vista | 3 | 10 (mín. 10 min entre elas) |
| Foco concluído | 15 | 6 |
| Tarefa concluída | 10, 10, 10, 5, 5, 5, depois 2 | — |

O pet nunca morre nem foge: com necessidades baixas ele só fica com sede, cansado ou triste.
Fora do expediente ele dorme e os lembretes param.

## Uso no Edge

1. Abra o site numa aba normal.
2. Na barra lateral do Edge, clique em **+** e escolha adicionar a página atual.

Alternativa: menu **⋯ → Aplicativos → Instalar este site como aplicativo** e encoste a janela à direita.

## Estrutura

```
index.html        página única
css/style.css     visual, claro/escuro
js/app.js         inicialização, ciclo de renderização, pet na tela
js/game.js        regras de XP, nível, estágio e necessidades
js/pet.js         desenho dos pets (SVG)
js/ui.js          toast, balão, som, notificação, seções
js/water.js       seção Água        js/storage.js  dados da água (water.v1)
js/breaks.js      pausas e lembretes js/bar.js     dados da barra (barra.v1)
js/tasks.js       tarefas e notas   js/agenda.js   agenda
js/music.js       YouTube           js/settings.js ajustes e backup
```
