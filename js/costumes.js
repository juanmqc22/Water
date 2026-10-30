// Fantasias do pet, desenhadas sobre os pontos de apoio de cada espécie e
// estágio (cabeça, rosto, pescoço). `a` vem de anchors() em pet.js.

const INK = '#1d2433';

export const COSTUMES = {
  // Cabeça (a base do item fica em a.head.y)
  laco(a) {
    const { x, y } = a.head;
    const s = a.s;
    return `<g transform="translate(${x + 7 * s} ${y + 3 * s}) rotate(-12) scale(${s})">
      <path d="M0 0 L-9 -6 L-9 6 Z" fill="#ff6fa8" stroke="#d94a86" stroke-width="1" stroke-linejoin="round"/>
      <path d="M0 0 L9 -6 L9 6 Z" fill="#ff6fa8" stroke="#d94a86" stroke-width="1" stroke-linejoin="round"/>
      <circle r="2.6" fill="#ff8fbd" stroke="#d94a86" stroke-width="1"/></g>`;
  },
  palha(a) {
    const { x, y } = a.head;
    return `<g transform="translate(${x} ${y + 2}) scale(${a.s})">
      <ellipse cx="0" cy="0" rx="19" ry="4.2" fill="#e9c46a" stroke="#b8902f" stroke-width="1"/>
      <path d="M-10 0 C -10 -12, 10 -12, 10 0 Z" fill="#f0d27e" stroke="#b8902f" stroke-width="1"/>
      <path d="M-10 -2 L 10 -2" stroke="#e05a47" stroke-width="2.6"/></g>`;
  },
  mago(a) {
    const { x, y } = a.head;
    return `<g transform="translate(${x} ${y + 2}) scale(${a.s})">
      <path d="M-12 0 L 2 -30 L 12 0 Z" fill="#6c5ce7" stroke="#4834c4" stroke-width="1" stroke-linejoin="round"/>
      <ellipse cx="0" cy="0" rx="17" ry="3.8" fill="#5a4bd1" stroke="#4834c4" stroke-width="1"/>
      <path d="M-2 -12 l1.2 2.6 2.8 .3 -2.1 1.9 .6 2.8 -2.5 -1.4 -2.5 1.4 .6 -2.8 -2.1 -1.9 2.8 -.3 z" fill="#ffd84d"/>
      <circle cx="4" cy="-20" r="1.2" fill="#ffd84d"/></g>`;
  },
  flores(a) {
    const { x, y } = a.head;
    const flower = (fx, fy, c) => [0, 72, 144, 216, 288].map((deg) => {
      const r = (deg * Math.PI) / 180;
      return `<circle cx="${fx + Math.cos(r) * 2.4}" cy="${fy + Math.sin(r) * 2.4}" r="2" fill="${c}"/>`;
    }).join('') + `<circle cx="${fx}" cy="${fy}" r="1.4" fill="#ffd84d"/>`;
    return `<g transform="translate(${x} ${y + 3}) scale(${a.s})">
      <path d="M-15 1 Q 0 -6 15 1" fill="none" stroke="#4fa83d" stroke-width="2"/>
      ${flower(-13, 0, '#ff8fb8')}${flower(-6.5, -3, '#fff')}${flower(0, -4, '#ffb84d')}${flower(6.5, -3, '#c39bff')}${flower(13, 0, '#ff8fb8')}</g>`;
  },
  coroa(a) {
    const { x, y } = a.head;
    return `<g transform="translate(${x} ${y + 2}) scale(${a.s})">
      <path d="M-11 0 L-11 -11 L-5.5 -5 L0 -13 L5.5 -5 L11 -11 L11 0 Z" fill="#ffcf3f" stroke="#c99a1e" stroke-width="1" stroke-linejoin="round"/>
      <circle cx="0" cy="-4" r="2" fill="#ff5a5f"/><circle cx="-6.5" cy="-3" r="1.4" fill="#4fb3ff"/><circle cx="6.5" cy="-3" r="1.4" fill="#4fb3ff"/></g>`;
  },
  faixa(a) {
    const { x, y } = a.head;
    return `<g transform="translate(${x} ${y + 6}) scale(${a.s})">
      <rect x="-13" y="-2.6" width="26" height="5.2" rx="2.6" fill="#ff5a5f"/>
      <rect x="-13" y="-0.6" width="26" height="1.2" fill="#fff" opacity=".85"/>
      <path d="M12 0 l6 -3 l-1 5 z" fill="#ff5a5f"/></g>`;
  },
  fones(a) {
    const y = a.face.y - 2;
    const w = a.r * 0.98;
    return `<path d="M${50 - w} ${y} C ${50 - w} ${a.head.y - 14 * a.s}, ${50 + w} ${a.head.y - 14 * a.s}, ${50 + w} ${y}"
      fill="none" stroke="#3b3f4a" stroke-width="${2.6 * a.s}" stroke-linecap="round"/>
      <rect x="${50 - w - 4 * a.s}" y="${y - 5 * a.s}" width="${7 * a.s}" height="${10 * a.s}" rx="${3 * a.s}" fill="#ff5a5f"/>
      <rect x="${50 + w - 3 * a.s}" y="${y - 5 * a.s}" width="${7 * a.s}" height="${10 * a.s}" rx="${3 * a.s}" fill="#ff5a5f"/>`;
  },

  // Rosto
  oculos(a) {
    const { y, ex, fs } = a.face;
    const r = 5.4 * fs;
    return `<g fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="1.5">
      <circle cx="${50 - ex}" cy="${y}" r="${r}"/><circle cx="${50 + ex}" cy="${y}" r="${r}"/></g>
      <path d="M${50 - ex + r} ${y - 1} Q 50 ${y - 3} ${50 + ex - r} ${y - 1}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
  },
  sol(a) {
    const { y, ex, fs } = a.face;
    const w = 11 * fs;
    const h = 7.5 * fs;
    const lens = (cx) => `<rect x="${cx - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${3 * fs}" fill="#1d2433"/>
      <path d="M${cx - w / 2 + 2} ${y - h / 2 + 2} l3 0" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`;
    return lens(50 - ex) + lens(50 + ex) +
      `<path d="M${50 - ex + w / 2} ${y - 1} L ${50 + ex - w / 2} ${y - 1}" stroke="#1d2433" stroke-width="1.6"/>`;
  },

  // Pescoço
  cachecol(a) {
    const { y, w } = a.neck;
    const h = 5.5 * a.s;
    return `<path d="M${50 - w} ${y - h / 2} Q 50 ${y + h} ${50 + w} ${y - h / 2} L ${50 + w} ${y + h / 2} Q 50 ${y + h * 2} ${50 - w} ${y + h / 2} Z" fill="#e05a47"/>
      <path d="M${50 - w * 0.45} ${y + h * 0.9} l -3 ${12 * a.s} l ${7 * a.s} 0 l 1 ${-11 * a.s} z" fill="#c94636"/>
      <path d="M${50 - w * 0.9} ${y} Q 50 ${y + h * 1.4} ${50 + w * 0.9} ${y}" fill="none" stroke="#ffd166" stroke-width="1.4" stroke-dasharray="3 3"/>`;
  },
  gravata(a) {
    const y = a.neck.y - 2 * a.s;
    return `<g transform="translate(50 ${y}) scale(${a.s})">
      <path d="M0 0 L-8 -5 L-8 5 Z" fill="#4f7cff" stroke="#3358d6" stroke-width="1" stroke-linejoin="round"/>
      <path d="M0 0 L8 -5 L8 5 Z" fill="#4f7cff" stroke="#3358d6" stroke-width="1" stroke-linejoin="round"/>
      <rect x="-2.2" y="-2.6" width="4.4" height="5.2" rx="1.4" fill="#3358d6"/></g>`;
  },
  medalha(a) {
    const y = a.neck.y - 3 * a.s;
    return `<g transform="translate(50 ${y}) scale(${a.s})">
      <path d="M-7 -5 L-2 6 L2 6 L7 -5" fill="none" stroke="#4fb3ff" stroke-width="3"/>
      <circle cx="0" cy="10" r="5.5" fill="#ffcf3f" stroke="#c99a1e" stroke-width="1"/>
      <path d="M0 6.8 c 2 2.8 2.6 4.2 0 6.2 c -2.6 -2 -2 -3.4 0 -6.2 z" fill="#4fb3ff"/></g>`;
  },
};

export function drawCostumes(a, worn = {}) {
  return ['neck', 'face', 'head'].map((slot) => COSTUMES[worn[slot]]?.(a) ?? '').join('');
}
