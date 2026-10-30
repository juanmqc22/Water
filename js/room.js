// Casinha do pet: cenários (o céu muda com a hora do dia) e móveis.
// Tudo desenhado num SVG de 360×200; o chão fica em y = 150.

const W = 360;
const FLOOR = 150;

export function phaseOf(now) {
  const h = now.getHours();
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'dusk';
  return 'night';
}

const SKY = {
  dawn: ['#ffc6d9', '#cfe8ff'],
  day: ['#8fd3ff', '#e3f5ff'],
  dusk: ['#ff9a6b', '#ffd6a5'],
  night: ['#141a3d', '#3a4380'],
};

function sky(id, phase, { x = 0, y = 0, w = W, h = FLOOR } = {}) {
  const [top, bottom] = SKY[phase];
  let extra = '';
  if (phase === 'night') {
    const stars = [[30, 20], [80, 42], [130, 14], [200, 34], [250, 12], [300, 40], [335, 18], [170, 60], [60, 70], [280, 74]];
    extra += stars.map(([sx, sy], i) => `<circle cx="${sx}" cy="${sy}" r="${i % 3 ? 1 : 1.6}" fill="#fff" opacity="${i % 2 ? 0.6 : 0.95}"/>`).join('');
    extra += '<circle cx="292" cy="34" r="13" fill="#fff6d6"/><circle cx="298" cy="30" r="11" fill="' + top + '"/>';
  } else {
    const sun = { dawn: [70, 90], day: [290, 34], dusk: [300, 92] }[phase];
    extra += `<circle cx="${sun[0]}" cy="${sun[1]}" r="16" fill="#fff3b0" opacity=".9"/><circle cx="${sun[0]}" cy="${sun[1]}" r="11" fill="#ffd84d"/>`;
    if (phase === 'day') extra += cloud(70, 36, 1) + cloud(190, 22, 0.8);
  }
  return `<defs><linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}-sky)"/>${extra}`;
}

const cloud = (x, y, s) => `<g fill="#fff" opacity=".9" transform="translate(${x} ${y}) scale(${s})">
  <ellipse cx="0" cy="0" rx="18" ry="8"/><ellipse cx="12" cy="-5" rx="11" ry="8"/><ellipse cx="-10" cy="-3" rx="9" ry="6"/></g>`;

// Escurece a paisagem à noite (não os móveis)
const nightShade = (phase) => (phase === 'night' ? `<rect width="${W}" height="200" fill="#0a0f2a" opacity=".35"/>` : '');

export const SCENES = {
  quarto(id, phase) {
    return `<rect width="${W}" height="${FLOOR}" fill="#f4e7d4"/>
      <rect y="0" width="${W}" height="12" fill="#ead8be"/>
      <g transform="translate(232 28)">
        <rect x="-4" y="-4" width="88" height="70" rx="6" fill="#c9a77f"/>
        <svg x="0" y="0" width="80" height="62" viewBox="210 0 120 93" preserveAspectRatio="xMidYMid slice">${sky(id, phase)}</svg>
        <path d="M40 0 V62 M0 31 H80" stroke="#c9a77f" stroke-width="4"/>
        <rect x="-8" y="62" width="96" height="6" rx="3" fill="#b8936a"/>
      </g>
      <rect y="${FLOOR - 6}" width="${W}" height="6" fill="#e2cdb0"/>
      <rect y="${FLOOR}" width="${W}" height="${200 - FLOOR}" fill="#d9b38c"/>
      ${[0, 1, 2].map((i) => `<path d="M0 ${FLOOR + 14 + i * 14} H${W}" stroke="#c99f75" stroke-width="1.2"/>`).join('')}
      ${phase === 'night' ? `<rect width="${W}" height="200" fill="#1a1440" opacity=".18"/>` : ''}`;
  },
  jardim(id, phase) {
    return `${sky(id, phase)}
      <path d="M0 120 Q 70 92 150 116 T 360 108 V160 H0 Z" fill="#8fd47a"/>
      <path d="M0 132 Q 110 112 220 130 T 360 126 V160 H0 Z" fill="#74c062"/>
      <g stroke="#b98a5c" stroke-width="4">${[20, 50, 80, 280, 310, 340].map((x) => `<path d="M${x} ${FLOOR - 26} V${FLOOR}"/>`).join('')}
        <path d="M14 ${FLOOR - 18} H86 M274 ${FLOOR - 18} H346" stroke-width="3"/></g>
      <rect y="${FLOOR}" width="${W}" height="${200 - FLOOR}" fill="#62b04f"/>
      ${[[120, 172, '#ff8fb8'], [250, 180, '#ffd84d'], [30, 186, '#fff'], [330, 168, '#c39bff']].map(([x, y, c]) =>
        `<circle cx="${x}" cy="${y}" r="3" fill="${c}"/><circle cx="${x}" cy="${y}" r="1.2" fill="#ffb03a"/>`).join('')}
      ${nightShade(phase)}`;
  },
  praia(id, phase) {
    return `${sky(id, phase)}
      <rect y="104" width="${W}" height="${FLOOR - 104}" fill="#3aa7d8"/>
      <path d="M0 112 Q 30 108 60 112 T 120 112 T 180 112 T 240 112 T 300 112 T 360 112" fill="none" stroke="#fff" stroke-width="1.5" opacity=".6"/>
      <path d="M0 ${FLOOR - 4} Q 90 ${FLOOR - 12} 180 ${FLOOR - 4} T 360 ${FLOOR - 4} V200 H0 Z" fill="#f3d9a4"/>
      <path d="M0 ${FLOOR - 4} Q 90 ${FLOOR - 12} 180 ${FLOOR - 4} T 360 ${FLOOR - 4}" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>
      <circle cx="96" cy="182" r="2.4" fill="#ff9a6b"/><path d="M262 178 l6 -4 l6 4 z" fill="#ffb3c6"/>
      ${nightShade(phase)}`;
  },
  montanha(id, phase) {
    return `${sky(id, phase)}
      <path d="M-10 ${FLOOR} L 70 60 L 150 ${FLOOR} Z" fill="#8a9bb8"/><path d="M70 60 L 52 92 L 62 86 L 72 96 L 86 88 Z" fill="#fff"/>
      <path d="M110 ${FLOOR} L 220 40 L 330 ${FLOOR} Z" fill="#7488a8"/><path d="M220 40 L 196 80 L 210 72 L 222 84 L 236 74 L 246 82 Z" fill="#fff"/>
      <path d="M260 ${FLOOR} L 330 80 L 400 ${FLOOR} Z" fill="#8a9bb8"/><path d="M330 80 L 316 104 L 330 98 L 344 106 Z" fill="#fff"/>
      <rect y="${FLOOR}" width="${W}" height="${200 - FLOOR}" fill="#eef4fb"/>
      <path d="M0 ${FLOOR} Q 120 ${FLOOR - 8} 240 ${FLOOR} T 360 ${FLOOR}" fill="#eef4fb"/>
      ${[[40, 30], [120, 64], [200, 20], [300, 56], [340, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff"/>`).join('')}
      ${nightShade(phase)}`;
  },
  // Sempre à noite
  estrelas(id) {
    return `${sky(id, 'night')}
      <circle cx="70" cy="30" r="1.2" fill="#ffd84d"/><circle cx="160" cy="80" r="1.4" fill="#9fd3ff"/>
      <path d="M40 60 L 120 28" stroke="#fff" stroke-width="1.2" opacity=".7" stroke-linecap="round"/>
      <path d="M0 ${FLOOR} Q 90 ${FLOOR - 22} 180 ${FLOOR - 6} T 360 ${FLOOR - 10} V200 H0 Z" fill="#2c3a6b"/>
      <path d="M0 ${FLOOR + 14} Q 120 ${FLOOR + 2} 240 ${FLOOR + 12} T 360 ${FLOOR + 8} V200 H0 Z" fill="#24305a"/>`;
  },
};

// Móveis por posição. Base dos de chão em y = 158.
const BASE = 158;

export const FURNITURE = {
  tapete: () => `<ellipse cx="180" cy="170" rx="74" ry="12" fill="#e76f51"/><ellipse cx="180" cy="170" rx="58" ry="8" fill="none" stroke="#f4a261" stroke-width="2.4" stroke-dasharray="6 4"/>`,
  planta: () => `<g transform="translate(52 ${BASE})">
    <path d="M-14 -24 H14 L10 0 H-10 Z" fill="#d9774a"/><rect x="-16" y="-28" width="32" height="6" rx="2" fill="#c4643a"/>
    <path d="M0 -28 C -4 -44 -22 -50 -24 -60 C -8 -58 -2 -46 0 -30 Z" fill="#5fbf4a"/>
    <path d="M0 -28 C 6 -46 20 -52 24 -64 C 8 -62 2 -46 0 -30 Z" fill="#4fa83d"/>
    <path d="M0 -28 C 0 -48 -4 -60 2 -74 C 8 -60 4 -46 0 -28 Z" fill="#74d65d"/></g>`,
  quadro: () => `<g transform="translate(64 34)"><rect width="56" height="42" rx="3" fill="#8b5e3c"/><rect x="5" y="5" width="46" height="32" fill="#bfe3ff"/>
    <path d="M5 37 L 20 20 L 30 30 L 38 22 L 51 37 Z" fill="#74c062"/><circle cx="40" cy="13" r="4" fill="#ffd84d"/></g>`,
  luminaria: (phase) => `<g transform="translate(308 ${BASE})">
    ${phase === 'night' || phase === 'dusk' ? '<ellipse cx="0" cy="-58" rx="34" ry="30" fill="#fff1a8" opacity=".35"/>' : ''}
    <ellipse cx="0" cy="0" rx="14" ry="3.5" fill="#6b6f7a"/><rect x="-1.6" y="-60" width="3.2" height="60" fill="#6b6f7a"/>
    <path d="M-15 -58 L -9 -78 H9 L15 -58 Z" fill="#ffcf6b" stroke="#e0a83a" stroke-width="1.2"/></g>`,
  estante: () => `<g transform="translate(52 ${BASE})"><rect x="-30" y="-82" width="60" height="82" rx="3" fill="#a9744f"/>
    <rect x="-26" y="-78" width="52" height="74" fill="#8b5e3c"/>
    ${[-56, -30].map((y) => `<rect x="-26" y="${y}" width="52" height="3" fill="#a9744f"/>`).join('')}
    ${[['#e05a47', -24, -78, 22], ['#4f7cff', -18, -76, 20], ['#ffcf3f', -12, -74, 18], ['#5fbf4a', -5, -77, 21], ['#c39bff', 2, -75, 19],
       ['#4fb3ff', -24, -52, 20], ['#ff8fb8', -17, -50, 18], ['#f4a261', -10, -53, 21], ['#2a9d8f', 10, -52, 20],
       ['#ffcf3f', -22, -26, 22], ['#e05a47', -14, -24, 20], ['#4f7cff', 6, -25, 21]].map(([c, x, y, h]) =>
       `<rect x="${x}" y="${y}" width="6" height="${h}" rx="1" fill="${c}"/>`).join('')}</g>`,
  aquario: () => `<g transform="translate(306 ${BASE})"><rect x="-30" y="-10" width="60" height="10" fill="#8b5e3c"/>
    <rect x="-28" y="-52" width="56" height="42" rx="4" fill="#bfe8ff" stroke="#8fc7e8" stroke-width="2" opacity=".95"/>
    <rect x="-26" y="-40" width="52" height="28" fill="#4fb3ff" opacity=".55"/>
    <path d="M-6 -30 q 6 -6 12 0 q -6 6 -12 0 z M6 -30 l 5 -4 v8 z" fill="#ff9a3c"/>
    <path d="M-16 -22 q 4 -4 8 0 q -4 4 -8 0 z M-8 -22 l 3 -3 v6 z" fill="#ffd84d"/>
    <path d="M18 -12 q -3 -10 2 -18 M22 -12 q 2 -8 -1 -14" stroke="#4fa83d" stroke-width="2" fill="none"/>
    <circle cx="10" cy="-44" r="1.4" fill="#fff"/><circle cx="13" cy="-48" r="1" fill="#fff"/></g>`,
  poltrona: () => `<g transform="translate(306 ${BASE})">
    <rect x="-28" y="-54" width="56" height="40" rx="12" fill="#c95b7a"/>
    <rect x="-34" y="-30" width="14" height="28" rx="6" fill="#b44a68"/><rect x="20" y="-30" width="14" height="28" rx="6" fill="#b44a68"/>
    <rect x="-22" y="-24" width="44" height="16" rx="6" fill="#e07393"/>
    <rect x="-28" y="-6" width="5" height="6" fill="#6b4630"/><rect x="23" y="-6" width="5" height="6" fill="#6b4630"/></g>`,
  relogio: (phase, now) => {
    const h = (now.getHours() % 12) + now.getMinutes() / 60;
    const m = now.getMinutes();
    const hand = (deg, len, w) => {
      const r = ((deg - 90) * Math.PI) / 180;
      return `<line x1="0" y1="0" x2="${Math.cos(r) * len}" y2="${Math.sin(r) * len}" stroke="#1d2433" stroke-width="${w}" stroke-linecap="round"/>`;
    };
    return `<g transform="translate(92 56)"><circle r="22" fill="#fff" stroke="#8b5e3c" stroke-width="4"/>
      ${[0, 90, 180, 270].map((d) => { const r = (d * Math.PI) / 180; return `<circle cx="${Math.cos(r) * 16}" cy="${Math.sin(r) * 16}" r="1.6" fill="#8b5e3c"/>`; }).join('')}
      ${hand(h * 30, 10, 2.6)}${hand(m * 6, 15, 1.8)}<circle r="2" fill="#e05a47"/></g>`;
  },
  telescopio: () => `<g transform="translate(56 ${BASE})">
    <path d="M0 -34 L -16 0 M0 -34 L 16 0 M0 -34 L 0 0" stroke="#6b6f7a" stroke-width="2.6"/>
    <g transform="translate(0 -38) rotate(-28)"><rect x="-26" y="-6" width="46" height="12" rx="3" fill="#4f7cff"/>
    <rect x="20" y="-8" width="8" height="16" rx="2" fill="#3358d6"/><rect x="-30" y="-4" width="6" height="8" rx="1" fill="#3358d6"/></g></g>`,
  trofeu: () => `<g transform="translate(306 ${BASE})"><rect x="-18" y="-10" width="36" height="10" rx="2" fill="#8b5e3c"/>
    <rect x="-5" y="-22" width="10" height="12" fill="#e0a83a"/>
    <path d="M-16 -56 H16 V-44 C 16 -30 -16 -30 -16 -44 Z" fill="#ffcf3f" stroke="#c99a1e" stroke-width="1.2"/>
    <path d="M-16 -50 C -26 -50 -26 -38 -14 -38 M16 -50 C 26 -50 26 -38 14 -38" fill="none" stroke="#c99a1e" stroke-width="2.4"/>
    <path d="M0 -50 l2 4 4 .5 -3 3 .8 4 -3.8 -2 -3.8 2 .8 -4 -3 -3 4 -.5 z" fill="#fff6c2"/></g>`,
  garrafa: () => `<g transform="translate(52 ${BASE})"><rect x="-20" y="-8" width="40" height="8" rx="2" fill="#8b5e3c"/>
    <path d="M-5 -66 H5 V-60 L 11 -52 V-12 a 3 3 0 0 1 -3 3 H-8 a 3 3 0 0 1 -3 -3 V-52 L -5 -60 Z" fill="#ffcf3f" stroke="#c99a1e" stroke-width="1.4"/>
    <rect x="-6" y="-70" width="12" height="6" rx="1.4" fill="#c99a1e"/>
    <path d="M-11 -36 H11" stroke="#c99a1e" stroke-width="1.4"/><path d="M-6 -50 v26" stroke="#fff6c2" stroke-width="2" stroke-linecap="round" opacity=".8"/></g>`,
};

// Posições: parede só aparece em cenário fechado (quarto)
export const SLOTS = ['wall', 'rug', 'floorL', 'floorR'];

export function roomSvg({ scene = 'quarto', items = {}, now = new Date(), id = 'room' }) {
  const phase = phaseOf(now);
  const draw = SCENES[scene] ?? SCENES.quarto;
  const furniture = SLOTS
    .filter((slot) => items[slot] && (slot !== 'wall' || scene === 'quarto'))
    .map((slot) => FURNITURE[items[slot]]?.(phase, now) ?? '')
    .join('');
  return `<svg viewBox="0 0 ${W} 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${draw(id, phase)}${furniture}</svg>`;
}

// Recorte de um móvel para a vitrine da loja
const VIEW = { wall: '40 20 110 80', rug: '96 146 168 40', floorL: '6 72 100 96', floorR: '256 72 100 96' };

export function furnitureSvg(id, slot, now = new Date()) {
  const bg = slot === 'wall' ? `<rect x="0" y="0" width="${W}" height="200" fill="#f4e7d4"/>` : '';
  return `<svg viewBox="${VIEW[slot]}" aria-hidden="true">${bg}${FURNITURE[id]?.('day', now) ?? ''}</svg>`;
}
