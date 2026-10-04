import { AURA_LAYERS, AURA_SEAMS } from './aura-source.mjs';
import { KNIGHT_IMAGE, KNIGHT_WIDTH, KNIGHT_HEIGHT } from './knight-source.mjs';
import { SHIELD_KNIGHT_IMAGE, SHIELD_KNIGHT_WIDTH, SHIELD_KNIGHT_HEIGHT } from './shield-knight-source.mjs';

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
  if (pose === 'guard') return `<g data-effect="aura-guard">
    <g transform="translate(342 136)"><g class="raid-shield-advance" data-effect="shield-knight">
      <ellipse cx="58" cy="141" rx="43" ry="5" fill="#101521" opacity=".45"/>
      <defs>
        <image id="shield-sprite" href="${SHIELD_KNIGHT_IMAGE}" width="${148 * SHIELD_KNIGHT_WIDTH / SHIELD_KNIGHT_HEIGHT}" height="148" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated"/>
        <mask id="shield-body" maskUnits="userSpaceOnUse" x="0" y="0" width="114" height="148"><path fill="white" d="M0 0h114v148H0z"/><path fill="black" d="M12 117h31v31H12zM88 121h26v27H88z"/></mask>
        <clipPath id="shield-front-foot"><path d="M12 117h31v31H12z"/></clipPath>
        <clipPath id="shield-back-foot"><path d="M88 121h26v27H88z"/></clipPath>
      </defs>
      <g class="raid-shield-front-foot"><use href="#shield-sprite" clip-path="url(#shield-front-foot)"/></g>
      <g class="raid-shield-back-foot"><use href="#shield-sprite" clip-path="url(#shield-back-foot)"/></g>
      <use href="#shield-sprite" mask="url(#shield-body)"/>
      <g class="raid-shield-block" data-effect="shield-block" fill="none" stroke-linejoin="round">
        <path d="M14 38L30 25L42 37L54 43L56 81L52 99L44 111L27 91L20 75Z" stroke="#b8a2e8" stroke-width="4" opacity=".3"/>
        <path d="M14 38L30 25L42 37L54 43L56 81L52 99L44 111L27 91L20 75Z" stroke="#e1d8f8" stroke-width="1"/>
      </g>
    </g></g>
  </g>`;
  if (pose === 'attack') return `<g data-effect="aura-attack">
    <g transform="translate(320 126)"><g class="raid-knight-advance">
      <ellipse cx="76" cy="151" rx="43" ry="5" fill="#101521" opacity=".45"/>
      <g class="raid-knight-body" data-effect="halberd-knight">
        <defs>
          <image id="halberd-sprite" href="${KNIGHT_IMAGE}" width="${152 * KNIGHT_WIDTH / KNIGHT_HEIGHT}" height="152" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated"/>
          <mask id="knight-upper" maskUnits="userSpaceOnUse" x="0" y="0" width="114" height="152"><path fill="white" d="M0 0h114v152H0z"/><path fill="black" d="M25 121h30v31H25zM85 128h29v24H85z"/></mask>
          <clipPath id="knight-left-leg"><path d="M25 121h30v31H25z"/></clipPath>
          <clipPath id="knight-right-leg"><path d="M85 128h29v24H85z"/></clipPath>
        </defs>
        <g class="raid-knight-left-leg"><use href="#halberd-sprite" clip-path="url(#knight-left-leg)"/></g>
        <g class="raid-knight-right-leg"><use href="#halberd-sprite" clip-path="url(#knight-right-leg)"/></g>
        <use href="#halberd-sprite" mask="url(#knight-upper)"/>
        <g class="raid-halberd-glow" data-effect="halberd-edge-glow" fill="none" stroke-linejoin="round">
          <path d="M7 9L10 19L17 30M8 28L9 37L14 42L20 45" stroke="#bc9df3" stroke-width="4" opacity=".4"/>
          <path d="M7 9L10 19L17 30M8 28L9 37L14 42L20 45" stroke="#eee1ff" stroke-width="1.5"/>
        </g>
      </g>
    </g></g>
  </g>`;
  if (pose === 'assault') return `<g data-effect="aura-assault">
    <g class="raid-soldier-lunge">${knight(367,236,true)}${knight(331,236,true)}</g>
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
