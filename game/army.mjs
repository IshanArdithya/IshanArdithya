import { TURN_TIMING as T } from './playback.mjs';
import { KNIGHT_LAYERS, KNIGHT_JOINTS, KNIGHT_EDGE, KNIGHT_HALO } from './knight-source.mjs';
import { SWORD_LAYERS, SWORD_JOINTS, SWORD_EDGE, SWORD_HALO } from './sword-knight-source.mjs';

export function armyArt() {
  const types = {
    halberd: { ...KNIGHT_LAYERS, joints: KNIGHT_JOINTS, edge: KNIGHT_EDGE, halo: KNIGHT_HALO },
    sword: { ...SWORD_LAYERS, joints: SWORD_JOINTS, edge: SWORD_EDGE, halo: SWORD_HALO },
  };
  const defs = Object.entries(types).map(([type, parts]) => Object.entries(parts)
    .map(([part, paths]) => `<g id="army-${type}-${part}">${paths}</g>`).join('')).join('');
  const scale = 1.75;
  const formation = [
    { type:'halberd', x:261, y:106, delay:180 },
    { type:'halberd', x:293, y:106, delay:300 },
    { type:'sword', x:245, y:114, delay:420 },
    { type:'sword', x:277, y:114, delay:540 },
    { type:'sword', x:309, y:114, delay:660 },
  ];
  const members = formation.map(({type,x,y,delay}) => {
    const use = part => `<use href="#army-${type}-${part}"/>`;
    return `<g transform="translate(${x} ${y}) scale(${scale})" data-army-soldier="${type}" style="--march-delay:${(T.enemy+delay)/1000}s;--weapon-delay:${(T.enemy+delay+1200)/1000}s">
      <g class="raid-army-arrive"><g class="raid-army-march">
        <ellipse cx="55" cy="94" rx="28" ry="3" fill="#101521" opacity=".4"/>
        ${use('joints')}
        <g class="raid-army-front-leg">${use('frontLeg')}</g>
        <g class="raid-army-back-leg">${use('backLeg')}</g>
        ${use('body')}
        <g class="raid-army-edge">${use('halo')}</g>
        ${use('weapon')}
        <g class="raid-army-edge">${use('edge')}</g>
      </g></g>
    </g>`;
  }).join('');
  return `<g data-effect="aura-assault"><defs>${defs}</defs>
    <g class="raid-army-command" data-effect="army-command" fill="#dcb4ff">
      <path d="M415 207h31v2h-31zM429 195h3v17h-3z"/>
      <path d="M419 211h8v3h-8zM437 211h8v3h-8z"/>
    </g>
    ${members}
  </g>`;
}
