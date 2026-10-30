// Pet: três linhas originais, três estágios cada, desenhadas em SVG.
// O corpo muda com o estágio; o rosto muda com o humor.

import { drawCostumes } from './costumes.js';

export const SPECIES = {
  agua: { label: 'Água', names: ['Pingo', 'Ondi', 'Maremar'], body: '#5cb8ff', dark: '#2b7fd4', belly: '#d6efff' },
  planta: { label: 'Planta', names: ['Brotinho', 'Folhudo', 'Bosquel'], body: '#86d06f', dark: '#3f8f3a', belly: '#e2f6d6' },
  fogo: { label: 'Fogo', names: ['Faísca', 'Brasa', 'Fogaréu'], body: '#ffb056', dark: '#d9731c', belly: '#ffe8c6' },
};

const INK = '#1d2433';
const CY = 64; // centro do corpo
const R = [22, 26, 30]; // raio do corpo por estágio

function feet(c, r) {
  const y = CY + r * 0.9;
  return `<ellipse cx="${50 - r * 0.45}" cy="${y}" rx="${r * 0.28}" ry="${r * 0.16}" fill="${c.dark}"/>
          <ellipse cx="${50 + r * 0.45}" cy="${y}" rx="${r * 0.28}" ry="${r * 0.16}" fill="${c.dark}"/>`;
}

function belly(c, r) {
  return `<ellipse cx="50" cy="${CY + r * 0.38}" rx="${r * 0.58}" ry="${r * 0.45}" fill="${c.belly}"/>`;
}

const leaf = (x, y, rx, ry, rot, fill) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${rot} ${x} ${y})"/>`;

const flower = (x, y) =>
  [0, 72, 144, 216, 288].map((a) => {
    const rad = (a * Math.PI) / 180;
    return `<circle cx="${x + Math.cos(rad) * 2.6}" cy="${y + Math.sin(rad) * 2.6}" r="2.2" fill="#ff8fb8"/>`;
  }).join('') + `<circle cx="${x}" cy="${y}" r="1.6" fill="#ffd84d"/>`;

const BODIES = {
  agua(c, stage, r) {
    const top = CY - r - 14 - stage * 3;
    const drop = `<path d="M50 ${top} C ${58 + stage * 2} ${top + 14}, ${50 + r} ${CY - 8}, ${50 + r} ${CY + 2}
      A ${r} ${r} 0 0 1 ${50 - r} ${CY + 2} C ${50 - r} ${CY - 8}, ${42 - stage * 2} ${top + 14}, 50 ${top} Z"
      fill="${c.body}" stroke="${c.dark}" stroke-width="1.6"/>`;
    let back = '';
    let front = '';
    if (stage >= 2) {
      // Barbatanas laterais
      back += `<path d="M${50 - r + 2} ${CY + 4} q -9 -2 -10 -10 q 7 1 12 5 z" fill="${c.dark}"/>
               <path d="M${50 + r - 2} ${CY + 4} q 9 -2 10 -10 q -7 1 -12 5 z" fill="${c.dark}"/>`;
      // Crista em onda
      front += `<path d="M44 ${top + 16} q 6 -8 12 -2 q -4 -1 -6 3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
    }
    if (stage >= 3) {
      back += `<circle cx="22" cy="${CY - 16}" r="3" fill="none" stroke="${c.body}" stroke-width="1.4"/>
               <circle cx="80" cy="${CY - 22}" r="2.2" fill="none" stroke="${c.body}" stroke-width="1.4"/>
               <circle cx="76" cy="${CY - 32}" r="1.6" fill="none" stroke="${c.body}" stroke-width="1.2"/>`;
      front += `<path d="M38 ${top + 22} q -3 -9 3 -12 q 0 7 3 9 z" fill="${c.body}" stroke="${c.dark}" stroke-width="1.2"/>
                <path d="M62 ${top + 22} q 3 -9 -3 -12 q 0 7 -3 9 z" fill="${c.body}" stroke="${c.dark}" stroke-width="1.2"/>`;
    }
    return back + feet(c, r) + drop + belly(c, r) + front;
  },

  planta(c, stage, r) {
    const top = CY - r * 0.92;
    const body = `<ellipse cx="50" cy="${CY}" rx="${r}" ry="${r * 0.92}" fill="${c.body}" stroke="${c.dark}" stroke-width="1.6"/>`;
    const L = '#5fbf4a';
    let back = '';
    let front = `<path d="M50 ${top + 1} q 1 -7 0 -11" stroke="${c.dark}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    if (stage === 1) {
      front += leaf(44, top - 11, 6, 3.2, -25, L) + leaf(56, top - 11, 6, 3.2, 25, L);
    } else {
      front += leaf(42, top - 12, 8, 4, -30, L) + leaf(58, top - 12, 8, 4, 30, L) +
               leaf(46, top - 18, 6, 3, -60, '#74d65d') + leaf(54, top - 18, 6, 3, 60, '#74d65d');
      // Orelhas de folha
      back += leaf(50 - r + 1, CY - r * 0.55, 8, 4, -50, L) + leaf(50 + r - 1, CY - r * 0.55, 8, 4, 50, L);
    }
    if (stage >= 3) {
      front += flower(36, top - 6) + flower(64, top - 6) + flower(50, top - 22);
      back += leaf(50 - r - 3, CY + 4, 7, 3.4, -10, '#4fa83d') + leaf(50 + r + 3, CY + 4, 7, 3.4, 10, '#4fa83d');
    }
    return back + feet(c, r) + body + belly(c, r) + front;
  },

  fogo(c, stage, r) {
    const top = CY - r * 0.95;
    const body = `<ellipse cx="50" cy="${CY}" rx="${r}" ry="${r * 0.95}" fill="${c.body}" stroke="${c.dark}" stroke-width="1.6"/>`;
    const h = 12 + stage * 6; // altura da chama
    const w = 7 + stage * 3;
    const flame = `<g class="flame">
      <path d="M50 ${top - h} C ${50 + w * 0.4} ${top - h * 0.6}, ${50 + w} ${top - h * 0.4}, ${50 + w * 0.8} ${top + 3}
               L ${50 - w * 0.8} ${top + 3} C ${50 - w} ${top - h * 0.4}, ${50 - w * 0.2} ${top - h * 0.5}, 50 ${top - h} Z" fill="#ff6a3d"/>
      <path d="M50 ${top - h * 0.55} C ${50 + w * 0.3} ${top - h * 0.35}, ${50 + w * 0.5} ${top - h * 0.1}, ${50 + w * 0.4} ${top + 3}
               L ${50 - w * 0.4} ${top + 3} C ${50 - w * 0.5} ${top - h * 0.1}, ${50 - w * 0.2} ${top - h * 0.3}, 50 ${top - h * 0.55} Z" fill="#ffd23f"/>
    </g>`;
    let back = '';
    if (stage >= 2) {
      // Chifrinhos
      back += `<path d="M${50 - r * 0.62} ${CY - r * 0.62} l -5 -9 l 9 4 z" fill="${c.dark}"/>
               <path d="M${50 + r * 0.62} ${CY - r * 0.62} l 5 -9 l -9 4 z" fill="${c.dark}"/>`;
    }
    if (stage >= 3) {
      // Faíscas flutuando
      back += `<g class="sparks"><circle cx="20" cy="${CY - 20}" r="1.8" fill="#ffb03a"/>
               <circle cx="82" cy="${CY - 14}" r="1.4" fill="#ff6a3d"/>
               <circle cx="78" cy="${CY - 34}" r="1.2" fill="#ffd23f"/></g>`;
    }
    return back + feet(c, r) + body + belly(c, r) + flame;
  },
};

function face(stage, mood) {
  const s = [0.95, 1.05, 1.15][stage - 1];
  const ey = CY - 4;
  const ex = 9 * s;
  const my = ey + 8 * s;
  const eyes = (fn) => fn(50 - ex) + fn(50 + ex);
  const open = (x) => `<ellipse cx="${x}" cy="${ey}" rx="${3.4 * s}" ry="${4.2 * s}" fill="${INK}"/>
    <circle cx="${x + 1.2 * s}" cy="${ey - 1.6 * s}" r="${1.3 * s}" fill="#fff"/>`;
  const arc = (dir) => (x) =>
    `<path d="M${x - 3.2 * s} ${ey + dir} Q ${x} ${ey - 4 * dir} ${x + 3.2 * s} ${ey + dir}" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const stroke = (d) => `<path d="${d}" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const cheeks = `<ellipse cx="${50 - ex * 1.55}" cy="${ey + 5 * s}" rx="${3 * s}" ry="${1.8 * s}" fill="#ff7a9a" opacity=".45"/>
                  <ellipse cx="${50 + ex * 1.55}" cy="${ey + 5 * s}" rx="${3 * s}" ry="${1.8 * s}" fill="#ff7a9a" opacity=".45"/>`;

  switch (mood) {
    case 'happy':
      return eyes(arc(1)) + cheeks +
        `<path d="M${50 - 4.5 * s} ${my - 1} Q 50 ${my + 6 * s} ${50 + 4.5 * s} ${my - 1} Z" fill="#7a2d3a"/>`;
    case 'sad':
      return eyes(open) +
        stroke(`M${50 - ex - 4} ${ey - 6} L ${50 - ex + 3} ${ey - 8.5}`) +
        stroke(`M${50 + ex + 4} ${ey - 6} L ${50 + ex - 3} ${ey - 8.5}`) +
        stroke(`M${50 - 4 * s} ${my + 2} Q 50 ${my - 2} ${50 + 4 * s} ${my + 2}`);
    case 'tired':
      return eyes((x) => `<path d="M${x - 3.4 * s} ${ey} A ${3.4 * s} ${3.2 * s} 0 0 0 ${x + 3.4 * s} ${ey} Z" fill="${INK}"/>` +
        stroke(`M${x - 4 * s} ${ey - 0.5} L ${x + 4 * s} ${ey - 0.5}`)) +
        stroke(`M${50 - 3 * s} ${my + 1} L ${50 + 3 * s} ${my + 1}`);
    case 'thirsty':
      return eyes(open) +
        `<ellipse cx="50" cy="${my + 1}" rx="${3 * s}" ry="${2.6 * s}" fill="#7a2d3a"/>
         <ellipse cx="50" cy="${my + 2.4}" rx="${1.8 * s}" ry="${1.2 * s}" fill="#ff8a9a"/>
         <path d="M${50 + ex * 2.1} ${ey - 6} q 2.4 3.6 0 5 q -2.4 -1.4 0 -5 z" fill="#8fd3ff"/>`;
    case 'sleep':
      return eyes(arc(-1)) + cheeks + `<circle cx="50" cy="${my + 1}" r="${1.5 * s}" fill="#7a2d3a"/>`;
    case 'focus':
      return eyes(open) + stroke(`M${50 - 3 * s} ${my} Q 50 ${my + 2} ${50 + 3 * s} ${my}`) +
        `<rect x="${50 - 20 * s}" y="${ey - 11 * s}" width="${40 * s}" height="${3.4 * s}" rx="1.7" fill="#ff5a5f"/>`;
    default: // ok
      return eyes(open) + cheeks + stroke(`M${50 - 3.5 * s} ${my} Q 50 ${my + 3 * s} ${50 + 3.5 * s} ${my}`);
  }
}

// Pontos de apoio das fantasias para cada espécie e estágio
export function anchors(species, stage) {
  const r = R[stage - 1];
  const fs = [0.95, 1.05, 1.15][stage - 1];
  const top = {
    agua: CY - r - 14 - stage * 3 + 13,
    planta: CY - r * 0.92 + 1,
    fogo: CY - r * 0.95 + 1,
  }[species] ?? CY - r;
  return {
    r, s: r / 22,
    head: { x: 50, y: top },
    face: { y: CY - 4, ex: 9 * fs, fs },
    neck: { y: CY + r * 0.3, w: r * 0.93 },
  };
}

export function petSvg(species, stage, mood = 'happy', worn = {}) {
  const c = SPECIES[species] ?? SPECIES.agua;
  const r = R[stage - 1];
  const zzz = mood === 'sleep'
    ? `<g class="zzz" fill="currentColor" font-weight="700"><text x="74" y="30" font-size="10">z</text><text x="82" y="20" font-size="8">z</text></g>`
    : '';
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <ellipse class="shadow" cx="50" cy="${CY + r * 0.9 + 4}" rx="${r * 0.9}" ry="3.2" fill="currentColor" opacity=".12"/>
    <g class="pet-body">${BODIES[species]?.(c, stage, r) ?? BODIES.agua(c, stage, r)}${face(stage, mood)}${drawCostumes(anchors(species, stage), worn)}</g>
    ${zzz}
  </svg>`;
}

export const speciesName = (pet, stage) => (SPECIES[pet.species] ?? SPECIES.agua).names[stage - 1];
