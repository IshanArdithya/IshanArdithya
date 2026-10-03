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

export function auraArt(pose) {
  const fallen = pose === 'defeated';
  const charging = pose === 'charge';
  const attacking = pose === 'attack' || pose === 'assault';
  const army = fallen || charging ? '' : pose === 'guard' ? knight(365, 236)
    : `${knight(367, 236, true)}${pose === 'assault' ? knight(331, 236, true) : ''}`;
  const part = (name, motion = '') => `<g data-aura-layer="${name}" class="${fallen ? '' : motion}">${AURA_LAYERS[name]}</g>`;
  return `<g data-character="aura" data-pose="aura-${pose}" shape-rendering="crispEdges">
    ${army}
    ${charging ? '<g class="aura-mana" fill="#d69cf4"><ellipse cx="465" cy="266" rx="58" ry="6" opacity=".4"/><path d="M406 251v-49h3v49zM533 247v-53h3v53zM419 181h3v9h-3zM526 167h3v9h-3z" opacity=".7"/></g>' : ''}
    <g transform="translate(405 119) scale(1.38)" opacity="${fallen ? '.4' : '1'}">
      <g class="${fallen ? '' : 'aura-idle'}">
        <g data-aura-joints="true">${AURA_SEAMS}</g>
        ${part('cape', 'aura-cape')}${part('hair', 'aura-hair')}${part('body')}
        <g class="${charging ? 'aura-scales-powered' : ''}">
          ${part('scales')}${part('panLeft', 'aura-pan-left')}${part('panRight', 'aura-pan-right')}
        </g>
        ${fallen ? '' : '<g class="aura-blink"><path fill="#fdf1da" d="M42 31h3v3h-3zM49 30h5v3h-5z"/><path fill="#302039" d="M42 32h3v1h-3zM49 31h5v1h-5z"/></g>'}
        ${charging ? '<g class="aura-mana" fill="#fff2b3"><path d="M4 59h3v2H4zM24 59h3v2h-3zM14 47h3v3h-3z" opacity=".8"/></g>' : ''}
      </g>
    </g>
    ${attacking ? `<path class="aura-command" d="M419 201Q389 192 ${pose === 'assault' ? '327' : '373'} 229" fill="none" stroke="#d69cf4" stroke-width="2" stroke-dasharray="4 5" opacity=".65"/>` : ''}
  </g>`;
}
