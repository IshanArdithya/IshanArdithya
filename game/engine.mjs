export const RULES = Object.freeze({ heroHp: 26, bossHp: 100, heroMana: 240, bossMana: 60,
  bossStartMana: 40, attackCost: 10, chargedCost: 20, guardCost: 15, chargeRestore: 40,
  ultimateCost: 80, ultimateDamage: 32, ultimateCooldown: 6, bossGuardCost: 15,
  bossAssaultCost: 30, bossChargeRestore: 35 });
export const ACTIONS = Object.freeze(['attack', 'guard', 'charge', 'ultimate']);
export const INTENTS = Object.freeze([
  { kind: 'guard', name: 'Guard', damage: 0, cost: RULES.bossGuardCost, message: 'Aura spends 15 mana to guard. Your damage is halved, rounded up.' },
  { kind: 'attack', name: 'Attack', damage: 4, cost: 0, message: 'Aura commands a soldier to attack. Incoming: 4 damage; no mana cost.' },
  { kind: 'charge', name: 'Charge', damage: 0, cost: 0, message: 'Aura restores 35 mana. A 10-damage assault follows.' },
  { kind: 'assault', name: 'Assault', damage: 10, cost: RULES.bossAssaultCost, message: 'Aura spends 30 mana on an army assault. Incoming: 10 damage!' },
]);
export class MoveError extends Error {}
export function initialState() {
  return { version: 3, encounter: 1, revision: 0, status: 'active', turn: 0,
    heroHp: RULES.heroHp, bossHp: RULES.bossHp, heroMana: RULES.heroMana, bossMana: RULES.bossStartMana,
    guardCooldown: 0, ultimateCooldown: 0, charged: false, intent: 0,
    wins: 0, losses: 0, previousResult: null, recent: [] };
}
export function enemyIntent(state) {
  const planned = INTENTS[state.intent];
  return state.bossMana < planned.cost ? { kind: 'charge', name: 'Recover mana', damage: 0, cost: 0,
    message: `Aura cannot afford ${planned.name}. She restores 35 mana instead; no incoming damage.` } : planned;
}
// A non-null reason is shared by the engine, README links, and local controls.
export function actionUnavailable(state, action) {
  if (state.status !== 'active') return 'This encounter has ended. Choose Play Again.';
  if (action === 'guard' && state.guardCooldown) return 'Guard is cooling down. Take one other turn first.';
  if (action === 'ultimate' && state.ultimateCooldown) return `Ultimate is cooling down: ${state.ultimateCooldown} other turns remaining.`;
  if (action === 'ultimate' && !state.charged) return 'Charge before casting Unleashed Zoltraak.';
  const cost = action === 'attack' ? (state.charged ? RULES.chargedCost : RULES.attackCost)
    : action === 'guard' ? RULES.guardCost : action === 'ultimate' ? RULES.ultimateCost : 0;
  if (state.heroMana < cost) return `Not enough mana: ${cost} required. Charge to recover mana.`;
  if (action === 'charge' && state.charged && state.heroMana === RULES.heroMana) return 'Already charged with full mana. Choose another action.';
  return null;
}
export function validateState(state) {
  const integer = (key, min, max = Number.MAX_SAFE_INTEGER) => {
    if (!Number.isSafeInteger(state[key]) || state[key] < min || state[key] > max) throw new Error(`Invalid game state: ${key}`);
  };
  if (state.version !== 3) throw new Error('Unsupported game state version');
  for (const key of ['revision','turn','wins','losses']) integer(key,0);
  integer('encounter',1); integer('heroHp',0,RULES.heroHp); integer('bossHp',0,RULES.bossHp);
  integer('heroMana',0,RULES.heroMana); integer('bossMana',0,RULES.bossMana);
  integer('guardCooldown',0,1); integer('ultimateCooldown',0,RULES.ultimateCooldown); integer('intent',0,INTENTS.length-1);
  if (!['active','victory','defeat'].includes(state.status) || typeof state.charged !== 'boolean' || !Array.isArray(state.recent) || state.recent.length > 5)
    throw new Error('Invalid game state');
  if ((state.status === 'active' && (!state.heroHp || !state.bossHp)) || (state.status === 'victory' && (state.bossHp !== 0 || !state.heroHp))
    || (state.status === 'defeat' && (state.heroHp !== 0 || !state.bossHp))) throw new Error('Inconsistent battle status');
  return state;
}
export function migrateState(state) {
  if (state.version === 1) {
    if (![0,1,2].includes(state.intent)) throw new Error('Invalid legacy enemy intent');
    state = { ...state, version: 2, intent: [0,1,3][state.intent] };
  }
  if (state.version === 2) {
    if (!Number.isInteger(state.heroHp) || state.heroHp < 0 || state.heroHp > 24 || !Number.isInteger(state.bossHp) || state.bossHp < 0 || state.bossHp > 60)
      throw new Error('Invalid legacy health');
    state = { ...state, version: 3, heroHp: Math.ceil(state.heroHp / 24 * RULES.heroHp), bossHp: Math.ceil(state.bossHp / 60 * RULES.bossHp),
      heroMana: RULES.heroMana, bossMana: RULES.bossStartMana, guardCooldown: 0, ultimateCooldown: 0 };
  }
  return validateState(state);
}
export function parseCommand(title) {
  const match = /^raid\|([1-9]\d*)\|(0|[1-9]\d*)\|(attack|guard|charge|ultimate|restart)$/.exec(title);
  if (!match || !Number.isSafeInteger(Number(match[1])) || !Number.isSafeInteger(Number(match[2])))
    throw new MoveError('Invalid game command. Choose an action from the current README.');
  return { encounter: Number(match[1]), revision: Number(match[2]), action: match[3] };
}
export function transition(current, command, actor, randomInt) {
  validateState(current);
  if (command.encounter !== current.encounter || command.revision !== current.revision) throw new MoveError('That turn has already changed. Refresh the README and choose again.');
  if (![...ACTIONS,'restart'].includes(command.action)) throw new MoveError('Unknown action.');
  if (command.action === 'restart' && current.status === 'active') throw new MoveError('This encounter is still in progress.');
  if (command.action !== 'restart') { const reason = actionUnavailable(current,command.action); if (reason) throw new MoveError(reason); }
  if (!Number.isSafeInteger(actor.issue) || actor.issue < 1 || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(actor.login)) throw new Error('Invalid issue actor');
  const intent = enemyIntent(current);
  let next = structuredClone(current);
  const event = { issue: actor.issue, player: actor.login, encounter: current.encounter, revision: current.revision+1,
    action: command.action, turn: current.turn+1, baseDamage: 0, critical: false, rolledDamage: 0, damage: 0,
    incoming: 0, blocked: 0, enemyBlocked: 0, enemyAction: intent.kind, manaSpent: 0, manaRestored: 0,
    enemyManaSpent: 0, enemyManaRestored: 0 };
  if (command.action !== 'restart') event.before = { heroHp: current.heroHp, bossHp: current.bossHp, heroMana: current.heroMana, bossMana: current.bossMana };
  if (command.action === 'restart') {
    next = { ...initialState(), encounter: current.encounter+1, wins: current.wins, losses: current.losses, previousResult: current.previousResult };
    event.encounter = next.encounter; event.turn = 0;
    event.summary = `@${actor.login} began encounter ${next.encounter}.`;
  } else {
    next.turn++;
    // Counters count other accepted turns; retries/invalid requests cannot tick them.
    next.guardCooldown = command.action === 'guard' ? 1 : Math.max(0,current.guardCooldown-1);
    next.ultimateCooldown = command.action === 'ultimate' ? RULES.ultimateCooldown : Math.max(0,current.ultimateCooldown-1);
    if (command.action === 'charge') {
      next.charged = true;
      event.manaRestored = Math.min(RULES.chargeRestore,RULES.heroMana-current.heroMana);
      next.heroMana += event.manaRestored;
    } else {
      event.manaSpent = command.action === 'guard' ? RULES.guardCost : command.action === 'ultimate' ? RULES.ultimateCost
        : current.charged ? RULES.chargedCost : RULES.attackCost;
      next.heroMana -= event.manaSpent;
    }
    // Aura's guard is paid before the player's strike because it protects that strike.
    if (intent.kind === 'guard') { event.enemyManaSpent = intent.cost; next.bossMana -= intent.cost; }
    if (command.action === 'attack' || command.action === 'ultimate') {
      if (command.action === 'ultimate') event.baseDamage = RULES.ultimateDamage;
      else {
        const [min,max] = current.charged ? [14,19] : [5,8];
        event.baseDamage = randomInt(min,max);
        const criticalRoll = randomInt(0,10);
        if (!Number.isInteger(event.baseDamage) || event.baseDamage < min || event.baseDamage >= max || !Number.isInteger(criticalRoll) || criticalRoll < 0 || criticalRoll >= 10)
          throw new Error('Random source returned an invalid roll');
        event.critical = criticalRoll === 0;
      }
      event.rolledDamage = event.critical ? Math.floor(event.baseDamage*1.5) : event.baseDamage;
      event.enemyBlocked = intent.kind === 'guard' ? Math.floor(event.rolledDamage/2) : 0;
      event.damage = event.rolledDamage-event.enemyBlocked;
      next.bossHp = Math.max(0,current.bossHp-event.damage);
      next.charged = false;
    }
    if (!next.bossHp) { next.status = 'victory'; next.wins++; }
    else {
      if (intent.kind !== 'guard') { event.enemyManaSpent = intent.cost; next.bossMana -= intent.cost; }
      if (intent.kind === 'charge') {
        event.enemyManaRestored = Math.min(RULES.bossChargeRestore,RULES.bossMana-next.bossMana);
        next.bossMana += event.enemyManaRestored;
      }
      event.incoming = command.action === 'guard' ? Math.min(1,intent.damage) : intent.damage;
      event.blocked = intent.damage-event.incoming;
      next.heroHp = Math.max(0,current.heroHp-event.incoming);
      if (!next.heroHp) { next.status = 'defeat'; next.losses++; }
      else next.intent = (current.intent+1)%INTENTS.length;
    }
    const hit = `dealt ${event.damage} damage${event.critical ? ' (critical!)' : ''}${event.enemyBlocked ? ` (Aura guarded ${event.enemyBlocked})` : ''}`;
    const actionText = command.action === 'ultimate' ? `cast Unleashed Zoltraak and ${hit}` : command.action === 'attack' ? hit
      : command.action === 'guard' ? `guarded, blocking ${event.blocked} damage` : `charged and restored ${event.manaRestored} mana`;
    event.summary = `@${actor.login} ${actionText} and took ${event.incoming}.${event.manaSpent ? ` Spent ${event.manaSpent} mana.` : ''}`;
    if (event.enemyManaRestored) event.summary += ` Aura restored ${event.enemyManaRestored} mana.`;
    if (event.enemyManaSpent) event.summary += ` Aura spent ${event.enemyManaSpent} mana.`;
    if (next.status !== 'active') {
      next.previousResult = { encounter: next.encounter, status: next.status, turns: next.turn };
      event.summary += next.status === 'victory' ? ' Aura is defeated!' : ' Frieren has fallen.';
    }
  }
  next.revision = event.revision;
  Object.assign(event,{ status: next.status, heroHp: next.heroHp, bossHp: next.bossHp, heroMana: next.heroMana, bossMana: next.bossMana,
    guardCooldown: next.guardCooldown, ultimateCooldown: next.ultimateCooldown });
  next.recent = [event,...next.recent].slice(0,5);
  return { state: validateState(next), event };
}
