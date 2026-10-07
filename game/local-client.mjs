import { TURN_TIMING as T, turnPlayback } from './playback.mjs';
import { initialState, RULES, ACTIONS, actionUnavailable, transition } from './engine.mjs';
import { renderScene, renderButton, buttonKind, buttonIcon, actionDescription } from './render.mjs';
import { HUD_PORTRAITS } from './hud-source.mjs';

let state = initialState();
let busy = false, sequenceToken = 0, started = false;
const timers = new Set();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const later = (fn, ms) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); };
const clearTimers = () => { for (const timer of timers) clearTimeout(timer); timers.clear(); };
const element = id => document.getElementById(id);
const svgUrl = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
// Reference stats describe the beginning of every encounter, never the live battle.
element('starting-frieren').textContent = `${RULES.heroHp} HP / ${RULES.heroMana} MP`;
element('starting-aura').textContent = `${RULES.bossHp} HP / ${RULES.bossStartMana}/${RULES.bossMana} MP`;
for (const name of ['frieren', 'aura']) {
  element(`starting-${name}-portrait`).src = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${HUD_PORTRAITS[name]}</svg>`);
}
function showNotice(text = '') {
  element('notice').textContent = text;
  element('notice').hidden = !text;
}

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
  if (failed) showNotice('The animation could not load. Your move is saved in the recent moves below.');
  focusAction();
}
function beginPlayback(token) {
  if (token !== sequenceToken || !busy || started) return;
  started = true; clearTimers();
  const playback = turnPlayback(state), e = playback.event;
  later(() => { if (e.damage) element('message').textContent = `Frieren dealt ${e.damage} damage${e.critical ? ', critical!' : '.'}`; }, T.bossDamage);
  if (playback.enemyActs) {
    later(() => { element('message').textContent = `Aura uses ${e.enemyAction}.`; }, T.enemy);
    later(() => { element('message').textContent = e.incoming ? `Frieren took ${e.incoming} damage.` : 'Frieren took no damage.'; }, playback.heroDamageAt);
  }
  later(() => finishPlayback(token), playback.duration);
}
function play(action) {
  if (busy) return;
  showNotice();
  try {
    state = transition(state, { encounter: state.encounter, revision: state.revision, action },
      { issue: state.revision + 1, login: 'you' }, randomInt).state;
    clearTimers(); sequenceToken++; started = false;
    busy = Boolean(turnPlayback(state) && !reducedMotion.matches);
    render();
    if (!busy) focusAction();
  } catch (error) { showNotice(error.message); }
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
  const shown = busy && state.recent[0]?.before ? { ...state, ...state.recent[0].before } : state;
  element('scene').alt = `Frieren ${shown.heroHp}/${RULES.heroHp} HP, ${shown.heroMana}/${RULES.heroMana} MP; Aura ${shown.bossHp}/${RULES.bossHp} HP, ${shown.bossMana}/${RULES.bossMana} MP.${busy ? ' Turn in progress.' : state.status === 'active' ? '' : ` ${state.status}.`}`;
  element('actions').replaceChildren();
  const actions = state.status === 'active' ? ACTIONS : ['restart'];
  for (const action of actions) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.action = action;
    const reason = busy ? 'Wait for this turn to finish.' : action === 'restart' ? null : actionUnavailable(state, action);
    button.disabled = Boolean(reason);
    button.title = reason || (action === 'restart' ? 'Start the next encounter' : actionDescription(state, action).replaceAll(' — ', ': '));
    button.setAttribute('aria-label', button.title);
    if (action === 'restart') {
      button.className = 'next-encounter';
      button.textContent = 'Next encounter →';
    } else {
      const kind = buttonKind(state, action);
      button.insertAdjacentHTML('beforeend', renderButton(kind, `/assets/${buttonIcon(kind)}`));
    }
    button.addEventListener('click', () => play(action));
    element('actions').append(button);
  }
  element('encounter-number').textContent = String(state.encounter).padStart(3, '0');
  element('encounter-status').dataset.status = busy ? 'resolving' : state.status;
  element('encounter-status').textContent = busy ? 'Resolving turn…' : { active: 'In progress', victory: 'Victory', defeat: 'Defeat' }[state.status];
  // The engine commits the result before playback; reveal the lifetime result only after it ends.
  const wins = state.wins - Number(busy && state.status === 'victory');
  const losses = state.losses - Number(busy && state.status === 'defeat');
  element('record').textContent = `${wins} ${wins === 1 ? 'victory' : 'victories'} · ${losses} ${losses === 1 ? 'defeat' : 'defeats'}`;
  const last = state.recent[0];
  element('message').textContent = busy ? `Frieren uses ${last.action === 'ultimate' ? (last.ultimatePhase === 'prepare' ? 'Prepare Ultimate' : 'Unleashed Zoltraak') : last.action}.` : last ? last.summary.replace('@you ', 'You ') : 'Your move. Aura answers from the earlier turns when this one resolves.';
  const moves = (busy ? state.recent.slice(1) : state.recent)
    .filter(event => event.encounter === state.encounter && event.action !== 'restart').slice(0, 5);
  element('history').replaceChildren(...moves.map(event => {
    const li = document.createElement('li');
    const turn = document.createElement('span');
    turn.className = 'turn-number'; turn.textContent = `TURN ${event.turn}`;
    const summary = document.createElement('span');
    summary.textContent = event.summary.replace('@you ', 'You ');
    li.append(turn, summary);
    return li;
  }));
  element('history-empty').hidden = moves.length > 0;
  element('history').parentElement.scrollTop = 0;
  element('history-empty').textContent = busy ? 'The first move is playing out…' : 'Starts with the first move.';
}

element('reset').addEventListener('click', () => {
  clearTimers(); sequenceToken++; started = false; busy = false; state = initialState(); showNotice(); render();
});
reducedMotion.addEventListener('change', event => {
  if (event.matches && busy) {
    finishPlayback(sequenceToken);
    render(); // Replacing the image also removes any unfinished timeline.
  }
});
render();
