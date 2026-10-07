import { AURA_LAYERS, AURA_SEAMS } from './aura-source.mjs';
import { KNIGHT_LAYERS, KNIGHT_JOINTS, KNIGHT_EDGE, KNIGHT_HALO } from './knight-source.mjs';
import { SHIELD_LAYERS, SHIELD_JOINTS, SHIELD_EDGE, SHIELD_HALO } from './shield-knight-source.mjs';

import { armyArt } from './army.mjs';

export function auraEffects(pose) {
  if (pose === 'guard') return `<g data-effect="aura-guard">
    <g transform="translate(300 119)"><g class="raid-shield-advance" data-effect="shield-knight">
      <ellipse cx="99" cy="159" rx="43" ry="5" fill="#101521" opacity=".45"/>
      <g transform="scale(1.75)" shape-rendering="crispEdges">
        <g data-shield-joints="true">${SHIELD_JOINTS}</g>
        <g class="raid-shield-front-foot" data-shield-layer="frontLeg">${SHIELD_LAYERS.frontLeg}</g>
        <g class="raid-shield-back-foot" data-shield-layer="backLeg">${SHIELD_LAYERS.backLeg}</g>
        <g data-shield-layer="body">${SHIELD_LAYERS.body}</g>
        <g class="raid-shield-raise" data-shield-layer="shield">
          <g class="raid-shield-block" data-effect="shield-halo">${SHIELD_HALO}</g>
          ${SHIELD_LAYERS.shield}
          <g class="raid-shield-block" data-effect="shield-block">${SHIELD_EDGE}</g>
        </g>
      </g>
    </g></g>
  </g>`;
  if (pose === 'attack') return `<g data-effect="aura-attack">
    <g transform="translate(290 114)"><g class="raid-knight-advance">
      <ellipse cx="99" cy="163" rx="43" ry="5" fill="#101521" opacity=".45"/>
      <g transform="scale(1.75)" data-effect="halberd-knight" shape-rendering="crispEdges">
        <g data-knight-joints="true">${KNIGHT_JOINTS}</g>
        <g class="raid-knight-left-leg" data-knight-layer="frontLeg">${KNIGHT_LAYERS.frontLeg}</g>
        <g class="raid-knight-right-leg" data-knight-layer="backLeg">${KNIGHT_LAYERS.backLeg}</g>
        <g data-knight-layer="body">${KNIGHT_LAYERS.body}</g>
        <g data-knight-layer="weapon">
          <g class="raid-halberd-glow" data-effect="halberd-edge-halo">${KNIGHT_HALO}</g>
          ${KNIGHT_LAYERS.weapon}
          <g class="raid-halberd-glow" data-effect="halberd-edge-glow">${KNIGHT_EDGE}</g>
        </g>
      </g>
    </g></g>
  </g>`;
  if (pose === 'cast') return armyArt();
  if (pose === 'focus') return `<g data-effect="aura-focus" fill="#d69cf4">
    <path d="M420 273h14v-2h92v2h14v4h-14v2h-92v-2h-14z" opacity=".4"/>
    <path d="M406 251v-49h3v49zM551 247v-53h3v53zM419 181h3v9h-3zM544 167h3v9h-3z" opacity=".7"/>
    <g transform="translate(352 94) scale(2)" fill="#fff2b3"><path d="M32 56h2v1h-2zM46 56h2v1h-2zM40 46h2v2h-2z"/></g>
  </g>`;
  if (pose === 'prepare') return `<g data-effect="aura-ultimate-preparation" fill="#e5c5ff">
    <path d="M470 248v-42h3v42zM500 244v-50h3v50z" opacity=".8"/>
    <g transform="translate(352 94) scale(2)" fill="#fff2b3"><path d="M40 44h2v4h-2z"/></g>
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
