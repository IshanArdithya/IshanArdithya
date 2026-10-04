import { TURN_TIMING as T, turnPlayback } from './playback.mjs';
import { initialState, RULES, ACTIONS, enemyIntent, actionUnavailable, transition } from './engine.mjs';
import { renderScene, renderButton, buttonKind, actionDescription, cooldownSummary } from './render.mjs';

let state = initialState();
let busy = false, sequenceToken = 0, started = false;
const timers = new Set();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const later = (fn, ms) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); };
const clearTimers = () => { for (const timer of timers) clearTimeout(timer); timers.clear(); };
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

function focusAction() {
  const action = state.recent[0]?.action;
  (element('actions').querySelector(`[data-action="${action}"]:not(:disabled)`)
    || element('actions').querySelector('button:not(:disabled)'))?.focus({ preventScroll: true });
}
function finishPlayback(token, failed = false) {
  if (token !== sequenceToken || !busy) return;
  clearTimers(); busy = false;
  render({ scene: false });
  if (failed) element('message').textContent += ' The animation could not load; the result above is saved in this tab.';
  focusAction();
}
function beginPlayback(token) {
  if (token !== sequenceToken || !busy || started) return;
  started = true; clearTimers();
  const playback = turnPlayback(state), e = playback.event;
  later(() => { if (e.damage) element('message').textContent = `Frieren dealt ${e.damage} damage${e.critical ? ' — critical!' : '.'}`; }, T.bossDamage);
  if (playback.enemyActs) {
    later(() => { element('message').textContent = `Aura uses ${e.enemyAction}.`; }, T.enemy);
    later(() => { element('message').textContent = e.incoming ? `Frieren took ${e.incoming} damage.` : 'Frieren took no damage.'; }, playback.heroDamageAt);
  }
  later(() => finishPlayback(token), playback.duration);
}
function play(action) {
  if (busy) return;
  try {
    state = transition(state, { encounter: state.encounter, revision: state.revision, action },
      { issue: state.revision + 1, login: 'you' }, randomInt).state;
    clearTimers(); sequenceToken++; started = false;
    busy = Boolean(turnPlayback(state) && !reducedMotion.matches);
    render();
    if (!busy) focusAction();
  } catch (error) { element('message').textContent = error.message; }
}

function render({ scene = true } = {}) {
  if (scene) {
    const token = sequenceToken;
    element('scene').onload = () => beginPlayback(token);
    element('scene').onerror = () => finishPlayback(token, true);
    element('scene').src = svgUrl(renderScene(state, { animate: busy }));
    // A broken image must never strand the controls. Loading normally starts the clock.
    if (busy) later(() => finishPlayback(token, true), 8000);
  }
  element('actions').setAttribute('aria-busy', String(busy));
  element('scene').alt = `Frieren ${state.heroHp}/${RULES.heroHp} HP; Aura ${state.bossHp}/${RULES.bossHp} HP; ${state.status}; charge ${state.charged ? 'ready' : 'empty'}.`;
  element('actions').replaceChildren();
  const actions = state.status === 'active' ? ACTIONS : ['restart'];
  for (const action of actions) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.action = action;
    const reason = busy ? 'Wait for this turn to finish.' : action === 'restart' ? null : actionUnavailable(state, action);
    button.disabled = Boolean(reason);
    button.title = reason || actionDescription(state, action) || 'Play Again';
    button.setAttribute('aria-label', button.title);
    const image = document.createElement('img');
    image.src = svgUrl(renderButton(action === 'restart' ? 'restart' : buttonKind(state, action)));
    image.width = 96; image.height = 44; image.alt = '';
    button.append(image); button.addEventListener('click', () => play(action));
    element('actions').append(button);
  }
  const shown = busy && state.recent[0]?.before ? { ...state, ...state.recent[0].before } : state;
  element('stats').textContent = `Frieren ${shown.heroHp}/${RULES.heroHp} HP · Aura ${shown.bossHp}/${RULES.bossHp} HP · Charge ${shown.charged ? 'ready' : 'empty'}\nMana: Frieren ${shown.heroMana}/${RULES.heroMana} MP · Aura ${shown.bossMana}/${RULES.bossMana} MP\n${cooldownSummary(state)}\nEncounter ${shown.encounter} · Turn ${shown.turn} · Victories ${shown.wins} · Defeats ${shown.losses}`;
  const intent = enemyIntent(state);
  element('availability').textContent = busy ? 'Turn in progress — controls unlock when the animations finish.' : state.status === 'active' ? ACTIONS.filter(a => actionUnavailable(state, a)).map(a => `${a}: ${actionUnavailable(state, a)}`).join(' ') : '';
  element('intent').textContent = busy ? 'Resolving this turn…' : state.status === 'active'
    ? `Next: ${intent.name} · ${intent.damage} damage. ${intent.message}`
    : state.status === 'victory' ? 'Victory! The forest is safe. Play again for a fresh encounter.' : 'Defeat. Frieren will rise again. Try a new approach!';
  const last = state.recent[0];
  element('message').textContent = busy ? `Frieren uses ${last.action === 'ultimate' ? 'Unleashed Zoltraak' : last.action}.` : last ? last.summary.replace('@you ', 'You ') : 'Your move. Charge while Aura guards, attack during openings, and guard her assault.';
  element('roll').textContent = !busy && (last?.action === 'attack' || last?.action === 'ultimate')
    ? `${last.action === 'ultimate' ? 'Ultimate damage' : 'Damage roll'}: ${last.baseDamage}${last.critical ? ' × 1.5 (critical, rounded down)' : last.action === 'ultimate' ? ' · fixed damage' : ' · no critical'}${last.enemyBlocked ? ` · Aura blocks ${last.enemyBlocked}` : ''} → ${last.damage} damage` : '';
  element('history').replaceChildren(...(busy ? state.recent.slice(1) : state.recent).map(event => {
    const li = document.createElement('li');
    li.textContent = `Turn ${event.turn}: ${event.summary.replace('@you ', 'You ')}`;
    return li;
  }));
}

element('reset').addEventListener('click', () => {
  clearTimers(); sequenceToken++; started = false; busy = false; state = initialState(); render();
});
reducedMotion.addEventListener('change', event => {
  if (event.matches && busy) {
    finishPlayback(sequenceToken);
    render(); // Replacing the image also removes any unfinished timeline.
  }
});
render();
