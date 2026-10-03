import { AURA_LAYERS, AURA_SEAMS } from './aura-source.mjs';

// Small headless armored figures represent Aura's controlled army. These are
// illustrations of her commands, not additional actors with separate HP.
function knight(x, y, attack = false) {
  return `<g transform="translate(${x} ${y})" opacity=".78" data-effect="controlled-knight">
    <path d="M9 0h12v5h7v17h-5v12h-6V22h-5v12H6V22H2V5h7z" fill="#344055" stroke="#8491a5" stroke-width="1"/>
    <path d="M12 2h6v3h-6z" fill="#101521"/><path d="M9 7h12v11H9z" fill="#586277"/>
    ${attack ? '<path d="M-15 7H5v3h-20z" fill="#ded9e7"/><path d="M2 3h3v12H2z" fill="#ebbb76"/>'
      : '<path d="M-3 7h14v15l-7 7-7-7z" fill="#656277" stroke="#bd9bca" stroke-width="1"/>'}
  </g>`;
}

export function auraEffects(pose) {
  if (pose === 'guard') return `<g data-effect="aura-guard">${knight(365,236)}</g>`;
  if (pose === 'attack' || pose === 'assault') return `<g data-effect="aura-${pose}">
    <g class="raid-soldier-lunge">${knight(367,236,true)}${pose === 'assault' ? knight(331,236,true) : ''}</g>
    <path d="M434 190Q389 192 327 229" fill="none" stroke="#d69cf4" stroke-width="2" stroke-dasharray="4 5" opacity=".65"/>
  </g>`;
  if (pose === 'charge') return `<g data-effect="aura-mana-recovery" fill="#d69cf4">
    <path d="M420 273h14v-2h92v2h14v4h-14v2h-92v-2h-14z" opacity=".4"/>
    <path d="M406 251v-49h3v49zM551 247v-53h3v53zM419 181h3v9h-3zM544 167h3v9h-3z" opacity=".7"/>
    <g transform="translate(352 94) scale(2)" fill="#fff2b3"><path d="M32 56h2v1h-2zM46 56h2v1h-2zM40 46h2v2h-2z"/></g>
  </g>`;
  return '';
}
export function auraArt(pose, { effects = true } = {}) {
  const fallen = pose === 'defeated';
  const part = (name, motion = '') => `<g data-aura-layer="${name}" class="${fallen ? '' : motion}">${AURA_LAYERS[name]}</g>`;
  return `<g data-character="aura" data-pose="aura-${pose}" shape-rendering="crispEdges">
${effects && !fallen ? auraEffects(pose) : ''}
    <g transform="translate(352 94) scale(2)" class="${fallen ? 'aura-fallen-body' : ''}">
      <g class="${fallen ? '' : 'aura-idle'}">
        <g data-aura-joints="true">${AURA_SEAMS}</g>
        ${part('cape', 'aura-cape')}${part('hair', 'aura-hair')}${part('body')}
        ${part('scales')}${part('panLeft', 'aura-pan-left')}${part('panRight', 'aura-pan-right')}
        ${fallen ? '' : '<g class="aura-blink"><path fill="#fdf1da" d="M60 35h2v2h-2zM65 34h3v2h-3z"/><path fill="#302039" d="M60 35h2v1h-2zM65 34h3v1h-3z"/></g>'}
      </g>
    </g>
  </g>`;
}
