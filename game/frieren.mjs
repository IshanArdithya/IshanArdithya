import { FRIEREN_LAYERS, FRIEREN_SEAMS } from './frieren-source.mjs';

function closedEyes(half = false) {
  // Coordinates are native pixel cells. Leave the fringe and nose untouched.
  return half
    ? '<path fill="#fce3ce" d="M59 35h4v3h-4zM68 35h4v3h-4z"/><path fill="#0e080e" d="M59 37h4v1h-4zM68 37h4v1h-4z"/>'
    : '<path fill="#fce3ce" d="M59 35h4v5h-4zM68 35h4v5h-4z"/><path fill="#0e080e" d="M59 37h4v1h-4zM68 37h4v1h-4z"/>';
}

function magic(pose) {
  if (pose === 'preparing') return `<g class="aura" data-effect="ultimate-preparation">
    <path d="M12 120h15v-3h63v3h15v3H90v3H27v-3H12z" fill="#bd8de8" opacity=".6"/>
    <path d="M9 90h3v9H9zM114 72h3v9h-3zM105 36h6v3h-6zM21 57h3v9h-3z" fill="#e8ceff"/>
    <path d="M134 19h3v9h9v3h-9v9h-3v-9h-9v-3h9z" fill="#fff0d8"/>
    <path d="M128 22h3v3h-3zM140 34h3v3h-3z" fill="#c995f3"/>
  </g>`;
  if (pose === 'ultimate') return `<g class="spell-cast" data-effect="unleashed-zoltraak">
    <path d="M150 44h18v-7h40v7h108v5h40v4h-40v5H208v7h-40v-7h-18z" fill="#c6a8fa" opacity=".38"/>
    <path d="M154 49h36v-4h26v4h112v4H216v4h-26v-4h-36z" fill="#fff7dc"/>
    <path d="M147 37h4v8h-4zM147 60h4v8h-4zM181 28h4v8h-4zM181 70h4v8h-4z" fill="#c6a8fa"/>
  </g>`;
  if (pose === 'attacking') return `<g class="spell-cast" data-effect="spell-bolt">
    <path d="M171 47h42v3h15v3h24v3h-24v3h-15v3h-42v-3h-12v-9h12z" fill="#55d7c3" opacity=".3"/>
    <path d="M156 51h63v3h21v3h-21v3h-63z" fill="#c2f4e7"/>
    <path d="M162 54h66v3h-66zM153 42h6v6h-6zM153 63h6v6h-6z" fill="#fff9e7"/>
  </g>`;
  if (pose === 'guarding') return `<g class="barrier" data-effect="magic-barrier">
    <path d="M144 36h18v9h9v12h6v33h-6v12h-9v9h-18v-6h-9V42h9z" fill="#55d7c3" opacity=".12"/>
    <path d="M144 36h18v3h-18zM162 39h3v9h-3zM165 48h6v9h-3v-6h-3zM171 57h3v33h-3zM165 90h6v9h-6v-3h3v-3h-3zM162 99h3v9h-3zM144 108h18v3h-18zM138 42h3v63h-3z" fill="#95e8df"/>
    <path d="M147 60h9v3h-9zM144 63h3v21h-3zM156 63h3v21h-3zM147 84h9v3h-9zM141 72h21v3h-21z" fill="#d4fff1" opacity=".8"/>
  </g>`;
  if (pose === 'charged') return `<g class="aura" data-effect="mana-charge">
    <path d="M12 105h9V63h6v42h-3v12h-9zM111 111h9V63h6v42h-3v12h-9z" fill="#55d7c3" opacity=".24"/>
    <path d="M12 120h15v-3h63v3h15v3H90v3H27v-3H12z" fill="#55d7c3" opacity=".65"/>
    <path d="M9 87h3v9H9zM114 45h3v9h-3zM105 27h9v3h-9zM21 48h3v9h-3zM30 42h6v3h-6z" fill="#c2f4e7"/>
  </g>`;
  if (pose === 'victorious') return `<g class="aura" data-effect="victory-sparkles" fill="#edc75c"><path d="M15 36h3v9h-3zM12 39h9v3h-9zM111 21h3v9h-3zM108 24h9v3h-9zM102 60h3v9h-3zM99 63h9v3h-9z"/></g>`;
  return '';
}

export function frierenEffects(pose) {
  return `<g transform="${pose === 'attacking' || pose === 'ultimate' ? 'translate(98 109)' : 'translate(112 138)'}">${magic(pose)}</g>`;
}

export function frierenArt(pose, { effects = true } = {}) {
  const fallen = pose === 'defeated';
  const eyes = fallen
    ? `<g class="fallen-eyes" data-eyes="closed">${closedEyes()}</g>`
    : `<g class="blink-half" data-eyes="half">${closedEyes(true)}</g><g class="blink" data-eyes="closed">${closedEyes()}</g>`;
  const part = (name, motion = '') => `<g data-frieren-layer="${name}" class="${fallen ? '' : motion}">${FRIEREN_LAYERS[name]}</g>`;
  return `<g data-character="frieren" data-pose="${pose}" shape-rendering="crispEdges">
${fallen || !effects ? '' : frierenEffects(pose)}
    <g transform="translate(54 86) scale(2)" class="${fallen ? 'frieren-fallen-body' : ''}">
      <g class="${fallen ? 'frieren-fallen' : 'frieren-idle'}">
        <g data-frieren-joints="true">${FRIEREN_SEAMS}</g>
        ${part('hairLeft', 'hair-left')}${part('hairRight', 'hair-right')}${part('body')}
        ${eyes}
      </g>
    </g>
  </g>`;
}
