export const INTENTS = Object.freeze([
  { kind: 'guard', name: 'Guard', damage: 0, message: 'Aura shelters behind her army. Your attacks deal half damage, rounded up.' },
  { kind: 'attack', name: 'Attack', damage: 4, message: 'Aura commands an armored soldier to attack. Incoming: 4 damage.' },
  { kind: 'charge', name: 'Charge', damage: 0, message: 'Aura channels mana through her scales. An opening now; a 10-damage assault follows.' },
  { kind: 'assault', name: 'Assault', damage: 10, message: 'Aura unleashes her prepared army assault. Guard against 10 damage!' },
]);

export class MoveError extends Error {}

export function initialState() {
  return {
    version: 2, encounter: 1, revision: 0, status: 'active', turn: 0,
    heroHp: 24, bossHp: 60, charged: false, intent: 0,
    wins: 0, losses: 0, previousResult: null, recent: [],
  };
}

export function validateState(state) {
  const integer = (key, min, max = Number.MAX_SAFE_INTEGER) => {
    if (!Number.isSafeInteger(state[key]) || state[key] < min || state[key] > max)
      throw new Error(`Invalid game state: ${key}`);
  };
  if (state.version !== 2) throw new Error('Unsupported game state version');
  for (const key of ['revision', 'turn', 'wins', 'losses']) integer(key, 0);
  integer('encounter', 1); integer('heroHp', 0, 24); integer('bossHp', 0, 60); integer('intent', 0, INTENTS.length - 1);
  if (!['active', 'victory', 'defeat'].includes(state.status) || typeof state.charged !== 'boolean'
    || !Array.isArray(state.recent) || state.recent.length > 5)
    throw new Error('Invalid game state');
  if ((state.status === 'active' && (!state.heroHp || !state.bossHp))
    || (state.status === 'victory' && (state.bossHp !== 0 || !state.heroHp))
    || (state.status === 'defeat' && (state.heroHp !== 0 || !state.bossHp)))
    throw new Error('Inconsistent battle status');
  return state;
}

export function migrateState(state) {
  if (state.version === 1) {
    if (![0, 1, 2].includes(state.intent)) throw new Error('Invalid legacy enemy intent');
    // Preserve HP, progress, receipts and lifetime totals; map the old heavy
    // attack to Aura's assault, not to the newly introduced charge opening.
    state = { ...state, version: 2, intent: [0, 1, 3][state.intent] };
  }
  return validateState(state);
}

export function parseCommand(title) {
  const match = /^raid\|([1-9]\d*)\|(0|[1-9]\d*)\|(attack|guard|charge|restart)$/.exec(title);
  if (!match || !Number.isSafeInteger(Number(match[1])) || !Number.isSafeInteger(Number(match[2])))
    throw new MoveError('Invalid game command. Choose an action from the current README.');
  return { encounter: Number(match[1]), revision: Number(match[2]), action: match[3] };
}

// randomInt(min, maxExclusive) is injected; only accepted attacks consume randomness.
export function transition(current, command, actor, randomInt) {
  validateState(current);
  if (command.encounter !== current.encounter || command.revision !== current.revision)
    throw new MoveError('That turn has already changed. Refresh the README and choose again.');
  if (!['attack', 'guard', 'charge', 'restart'].includes(command.action)) throw new MoveError('Unknown action.');
  if (command.action === 'restart' && current.status === 'active') throw new MoveError('This encounter is still in progress.');
  if (command.action !== 'restart' && current.status !== 'active') throw new MoveError('This encounter has ended. Choose Play Again.');
  if (command.action === 'charge' && current.charged) throw new MoveError('Already charged! Attack to use it, or Guard to preserve it.');
  if (!Number.isSafeInteger(actor.issue) || actor.issue < 1 || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(actor.login))
    throw new Error('Invalid issue actor');

  let next = structuredClone(current);
  const event = {
    issue: actor.issue, player: actor.login, encounter: current.encounter,
    revision: current.revision + 1, action: command.action, turn: current.turn + 1,
    baseDamage: 0, critical: false, rolledDamage: 0, damage: 0, incoming: 0, blocked: 0, enemyBlocked: 0,
    enemyAction: INTENTS[current.intent].kind,
  };
  if (command.action === 'restart') {
    next = { ...initialState(), encounter: current.encounter + 1, wins: current.wins,
      losses: current.losses, previousResult: current.previousResult };
    event.encounter = next.encounter;
    event.turn = 0;
    event.summary = `@${actor.login} began encounter ${next.encounter}.`;
  } else {
    next.turn++;
    if (command.action === 'charge') next.charged = true;
    if (command.action === 'attack') {
      const [min, max] = current.charged ? [14, 19] : [5, 8];
      event.baseDamage = randomInt(min, max);
      const criticalRoll = randomInt(0, 10);
      if (!Number.isInteger(event.baseDamage) || event.baseDamage < min || event.baseDamage >= max
        || !Number.isInteger(criticalRoll) || criticalRoll < 0 || criticalRoll >= 10)
        throw new Error('Random source returned an invalid roll');
      event.critical = criticalRoll === 0;
      event.rolledDamage = event.critical ? Math.floor(event.baseDamage * 1.5) : event.baseDamage;
      event.enemyBlocked = INTENTS[current.intent].kind === 'guard' ? Math.floor(event.rolledDamage / 2) : 0;
      event.damage = event.rolledDamage - event.enemyBlocked;
      next.bossHp = Math.max(0, current.bossHp - event.damage);
      next.charged = false;
    }
    if (next.bossHp === 0) {
      next.status = 'victory';
      next.wins++;
    } else {
      const damage = INTENTS[current.intent].damage;
      event.incoming = command.action === 'guard' ? Math.min(1, damage) : damage;
      event.blocked = damage - event.incoming;
      next.heroHp = Math.max(0, current.heroHp - event.incoming);
      if (next.heroHp === 0) { next.status = 'defeat'; next.losses++; }
      else next.intent = (current.intent + 1) % INTENTS.length;
    }
    const actionText = command.action === 'attack'
      ? `dealt ${event.damage} damage${event.critical ? ' (critical!)' : ''}${event.enemyBlocked ? ` (Aura guarded ${event.enemyBlocked})` : ''}`
      : command.action === 'guard' ? `guarded, blocking ${event.blocked} damage` : 'charged the next attack';
    event.summary = `@${actor.login} ${actionText} and took ${event.incoming}.`;
    if (next.status === 'active' && event.enemyAction === 'charge') event.summary += ' Aura is charged: an assault comes next.';
    if (next.status !== 'active') {
      next.previousResult = { encounter: next.encounter, status: next.status, turns: next.turn };
      event.summary += next.status === 'victory' ? ' Aura is defeated!' : ' Frieren has fallen.';
    }
  }
  next.revision = event.revision;
  event.status = next.status;
  event.heroHp = next.heroHp;
  event.bossHp = next.bossHp;
  next.recent = [event, ...next.recent].slice(0, 5);
  return { state: validateState(next), event };
}
