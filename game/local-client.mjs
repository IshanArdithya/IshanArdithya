import { initialState, INTENTS, transition } from './engine.mjs';
import { renderScene, renderButton } from './render.mjs';

let state = initialState();
const element = id => document.getElementById(id);
const svgUrl = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// Uniform cryptographic integer draws, matching the production engine's randomInt contract.
function randomInt(min, max) {
  const range = max - min;
  const limit = Math.floor(2 ** 32 / range) * range;
  const draw = new Uint32Array(1);
  do { crypto.getRandomValues(draw); } while (draw[0] >= limit);
  return min + draw[0] % range;
}

function play(action) {
  try {
    state = transition(state, { encounter: state.encounter, revision: state.revision, action },
      { issue: state.revision + 1, login: 'you' }, randomInt).state;
    render();
    // Keep keyboard focus on the action used, or on the first remaining action after an ending.
    (element('actions').querySelector(`[data-action="${action}"]:not(:disabled)`)
      || element('actions').querySelector('button:not(:disabled)'))?.focus({ preventScroll: true });
  } catch (error) { element('message').textContent = error.message; }
}

function render() {
  element('scene').src = svgUrl(renderScene(state));
  element('scene').alt = `Frieren ${state.heroHp}/24 HP; Aura ${state.bossHp}/60 HP; ${state.status}; charge ${state.charged ? 'ready' : 'empty'}.`;
  element('actions').replaceChildren();
  const actions = state.status === 'active' ? ['attack', 'guard', 'charge'] : ['restart'];
  for (const action of actions) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.action = action;
    button.disabled = action === 'charge' && state.charged;
    button.setAttribute('aria-label', button.disabled ? 'Already charged' : action === 'restart' ? 'Play Again' : action[0].toUpperCase() + action.slice(1));
    const image = document.createElement('img');
    image.src = svgUrl(renderButton(button.disabled ? 'charged' : action));
    image.width = 96; image.height = 44; image.alt = '';
    button.append(image); button.addEventListener('click', () => play(action));
    element('actions').append(button);
  }
  element('stats').textContent = `Frieren ${state.heroHp}/24 HP · Aura ${state.bossHp}/60 HP · Charge ${state.charged ? 'ready' : 'empty'}\nEncounter ${state.encounter} · Turn ${state.turn} · Victories ${state.wins} · Defeats ${state.losses}`;
  element('intent').textContent = state.status === 'active'
    ? `Next: ${INTENTS[state.intent].name} · ${INTENTS[state.intent].damage} damage. ${INTENTS[state.intent].message}`
    : state.status === 'victory' ? 'Victory! The shrine is safe. Play again for a fresh encounter.' : 'Defeat. Frieren will rise again. Try a new approach!';
  const last = state.recent[0];
  element('message').textContent = last ? last.summary.replace('@you ', 'You ') : 'Your move. Charge while Aura guards, attack during openings, and guard her assault.';
  element('roll').textContent = last?.action === 'attack'
    ? `Damage roll: ${last.baseDamage}${last.critical ? ' × 1.5 (critical, rounded down)' : ' · no critical'}${last.enemyBlocked ? ` · Aura blocks ${last.enemyBlocked}` : ''} → ${last.damage} damage` : '';
  element('history').replaceChildren(...state.recent.map(event => {
    const li = document.createElement('li');
    li.textContent = `Turn ${event.turn}: ${event.summary.replace('@you ', 'You ')}`;
    return li;
  }));
}

element('reset').addEventListener('click', () => { state = initialState(); render(); });
render();
