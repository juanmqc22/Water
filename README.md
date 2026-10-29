# Água

Contador de água diário, minimalista, acionado por chip NFC na garrafa.

**V1:** site estático no GitHub Pages, dados no `localStorage` do Safari.
**V2 (futuro):** Supabase + Vercel, multiusuário. Só `js/storage.js` precisa ser reimplementado.

## Funcionalidades

- Leitura do chip NFC (`?tag=<token>`) registra a garrafa, com **Desfazer**
- Anti-duplicado: ignora a mesma garrafa lida de novo em menos de N minutos
- Anel de progresso com **marcador de ritmo** (onde você deveria estar agora)
- Semana em mini-anéis: dias na meta e média diária
- Meta sugerida pelo peso (35 ml/kg) e botão **Treinei hoje** (+500 ml)
- Registro manual (garrafa ou copo de 250 ml)
- Exportar/importar backup em JSON

## Configuração

1. **GitHub Pages:** Settings → Pages → Deploy from a branch → escolha o branch e `/ (root)`.
   O app fica em `https://juanmqc22.github.io/Water/`.
2. **Garrafa:** abra o app no **Safari** → Ajustes → Adicionar garrafa → Copiar URL.
3. **Chip NFC:** no app *NFC Tools* → Escrever → Adicionar registro → URL → cole → grave.
   Depois, em Outros → Bloquear tag (deixa o chip somente leitura; é irreversível).
4. **Atalho (registro sem toque extra):** app Atalhos → Automação → Nova → NFC → escaneie o chip →
   ação **Abrir URLs** com a URL da garrafa → marque **Executar Imediatamente**.

> Use o app pelo Safari (aba fixa ou favorito), **não** adicione à Tela de Início:
> no iPhone o webapp da Tela de Início tem armazenamento separado do Safari, e o NFC sempre abre no Safari.

> Garrafa de metal exige tag NFC **anti-metal (on-metal)**.

## Estrutura

```
index.html        tela única + sheets (registrar, ajustes)
css/style.css     visual estilo iOS, claro/escuro
js/storage.js     camada de dados (único ponto a trocar na V2)
js/app.js         lógica de tela
```

## Rodar localmente

```bash
python3 -m http.server 8000
```
