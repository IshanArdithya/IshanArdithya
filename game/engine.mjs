export const RULES = Object.freeze({ heroHp: 26, bossHp: 100, heroMana: 240, bossMana: 60,
  bossStartMana: 40, attackCost: 10, chargedCost: 20, guardCost: 15, chargeRestore: 40,
  ultimateCost: 80, ultimateDamage: 32, ultimateCooldown: 6, bossGuardCost: 15,
  bossAssaultCost: 30, bossChargeRestore: 35 });
export const ACTIONS = Object.freeze(['attack', 'guard', 'focus', 'ultimate']);
const BOSS_INTENTS = Object.freeze(['attack', 'guard', 'focus', 'prepare', 'cast']);
export class MoveError extends Error {}
export function initialState() {
  return { version: 6, encounter: 1, revision: 0, status: 'active', turn: 0,
    heroHp: RULES.heroHp, bossHp: RULES.bossHp, heroMana: RULES.heroMana, bossMana: RULES.bossStartMana,
    guardCooldown: 0, ultimateCooldown: 0, ultimatePrepared: false, charged: false,
    bossIntent: null, bossCharged: false, bossUltimatePrepared: false,
    wins: 0, losses: 0, previousResult: null, recent: [], players: {} };
}
export function enemyIntent(state, kind = state.bossIntent) {
  if (kind === 'guard') return { kind, name: 'Guard', damage: 0, cost: RULES.bossGuardCost, message: 'Aura spends 15 mana to guard. Your damage is halved, rounded up.' };
  if (kind === 'focus') return { kind, name: 'Focus', damage: 0, cost: 0, message: 'Aura focuses, restoring mana and empowering her next Attack.' };
  if (kind === 'prepare') return { kind, name: 'Prepare Ultimate', damage: 0, cost: RULES.bossAssaultCost, message: 'Aura spends 30 mana to prepare her ultimate. She casts it next turn.' };
  if (kind === 'cast') return { kind, name: 'Cast Ultimate', damage: 10, cost: 0, message: 'Aura casts her prepared ultimate. Incoming: 10 damage.' };
  const damage = state.bossCharged ? 8 : 4;
  return { kind: 'attack', name: state.bossCharged ? 'Focused Attack' : 'Attack', damage, cost: 0,
    message: state.bossCharged ? 'Aura spends Focus on an empowered attack. Incoming: 8 damage; no mana cost.' : 'Aura commands a soldier to attack. Incoming: 4 damage; no mana cost.' };
}
function previousActions(state) {
  return state.recent
    .filter(event => event.encounter === state.encounter && event.action !== 'restart')
    .slice(0, 3)
    .map(event => event.ultimatePhase === 'prepare' ? 'prepare' : event.ultimatePhase === 'cast' ? 'cast' : event.action);
}
export function chooseBossIntent(state, randomInt) {
  if (state.bossUltimatePrepared) return 'cast';
  if (state.bossMana < RULES.bossGuardCost) return 'focus';
  if ((state.ultimatePrepared || state.charged) && state.bossMana >= RULES.bossGuardCost) return 'guard';
  const previous = previousActions(state);
  const options = [['attack', state.bossCharged ? 5 : 3], ['guard', 1]];
  if (!(state.bossCharged && state.bossMana === RULES.bossMana)) options.push(['focus', state.bossMana < RULES.bossAssaultCost ? 3 : 2]);
  if (state.bossMana >= RULES.bossAssaultCost) options.push(['prepare', 3]);
  const weight = (kind, amount) => {
    const option = options.find(([name]) => name === kind);
    if (option) option[1] += amount;
  };
  if (previous.filter(action => action === 'attack').length >= 2) weight('guard', 4);
  if (previous[0] === 'guard') { weight('attack', 2); weight('prepare', 2); }
  const total = options.reduce((sum, [, amount]) => sum + amount, 0);
  let roll = randomInt(0, total);
  if (!Number.isInteger(roll) || roll < 0 || roll >= total) throw new Error('Random source returned an invalid roll');
  for (const [kind, amount] of options) {
    if (roll < amount) return kind;
    roll -= amount;
  }
}
export function actionUnavailable(state, action) {
  if (state.status !== 'active') return 'This encounter has ended. Choose Play Again.';
  if (action === 'guard' && state.guardCooldown) return 'Guard is cooling down. Take one other turn first.';
  if (action === 'ultimate' && state.ultimateCooldown) return `Ultimate is cooling down: ${state.ultimateCooldown} other turns remaining.`;
  const cost = action === 'attack' ? (state.charged ? RULES.chargedCost : RULES.attackCost)
    : action === 'guard' ? RULES.guardCost : action === 'ultimate' && !state.ultimatePrepared ? RULES.ultimateCost : 0;
  if (state.heroMana < cost) return `Not enough mana: ${cost} required. Use Focus to recover mana.`;
  if (action === 'focus' && state.charged && state.heroMana === RULES.heroMana) return 'Already focused with full mana. Choose another action.';
  return null;
}
export function validateState(state) {
  const integer = (key, min, max = Number.MAX_SAFE_INTEGER) => {
    if (!Number.isSafeInteger(state[key]) || state[key] < min || state[key] > max) throw new Error(`Invalid game state: ${key}`);
  };
  if (state.version !== 6) throw new Error('Unsupported game state version');
  for (const key of ['revision','turn','wins','losses']) integer(key,0);
  integer('encounter',1); integer('heroHp',0,RULES.heroHp); integer('bossHp',0,RULES.bossHp);
  integer('heroMana',0,RULES.heroMana); integer('bossMana',0,RULES.bossMana);
  integer('guardCooldown',0,1); integer('ultimateCooldown',0,RULES.ultimateCooldown);
  if (state.bossIntent !== null && !BOSS_INTENTS.includes(state.bossIntent) || typeof state.bossCharged !== 'boolean' || typeof state.bossUltimatePrepared !== 'boolean'
    || !['active','victory','defeat'].includes(state.status) || typeof state.charged !== 'boolean' || typeof state.ultimatePrepared !== 'boolean' || !Array.isArray(state.recent) || state.recent.length > 5)
    throw new Error('Invalid game state');
  if ((state.status === 'active' && (!state.heroHp || !state.bossHp)) || (state.status === 'victory' && (state.bossHp !== 0 || !state.heroHp))
    || (state.status === 'defeat' && (state.heroHp !== 0 || !state.bossHp))) throw new Error('Inconsistent battle status');
  if (state.ultimatePrepared && state.ultimateCooldown) throw new Error('Prepared ultimate cannot be cooling down');
  if (!state.players || typeof state.players !== 'object' || Array.isArray(state.players)) throw new Error('Invalid game state: players');
  for (const [login, count] of Object.entries(state.players)) {
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(login) || !Number.isSafeInteger(count) || count < 1)
      throw new Error('Invalid game state: players');
  }
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
  if (state.version === 3) state = { ...state, version: 4, ultimatePrepared: false, revision: state.revision + 1 };
  if (state.version === 4) state = { ...state, version: 5, players: state.players ?? {} };
  if (state.version === 5) {
    state = { ...state, version: 6, bossIntent: null, bossCharged: false, bossUltimatePrepared: false };
    delete state.intent;
  }
  if (state.version === 6 && state.turn === 0 && Array.isArray(state.recent) && state.recent.length === 0) state = { ...state, bossIntent: null };
  return validateState(state);
}
export function parseCommand(title) {
  const match = /^raid\|([1-9]\d*)\|(0|[1-9]\d*)\|(attack|guard|focus|ultimate|restart)$/.exec(title);
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
  const intent = command.action === 'restart' ? null : enemyIntent(current, chooseBossIntent(current, randomInt));
  const ultimatePhase = command.action === 'ultimate' ? (current.ultimatePrepared ? 'cast' : 'prepare') : null;
  let next = structuredClone(current);
  const event = { issue: actor.issue, player: actor.login, encounter: current.encounter, revision: current.revision+1,
    action: command.action, turn: current.turn+1, baseDamage: 0, critical: false, rolledDamage: 0, damage: 0,
    incoming: 0, blocked: 0, enemyBlocked: 0, manaSpent: 0, manaRestored: 0,
    enemyManaSpent: 0, enemyManaRestored: 0, enemyAction: intent ? intent.kind : null };
  if (ultimatePhase) event.ultimatePhase = ultimatePhase;
  if (command.action !== 'restart') event.before = { heroHp: current.heroHp, bossHp: current.bossHp, heroMana: current.heroMana, bossMana: current.bossMana };
  if (command.action === 'restart') {
    next = { ...initialState(), encounter: current.encounter+1, wins: current.wins, losses: current.losses, previousResult: current.previousResult, players: current.players };
    event.encounter = next.encounter; event.turn = 0;
    event.summary = `@${actor.login} began encounter ${next.encounter}.`;
  } else {
    next.turn++;
    next.guardCooldown = command.action === 'guard' ? 1 : Math.max(0,current.guardCooldown-1);
    next.ultimateCooldown = ultimatePhase === 'cast' ? RULES.ultimateCooldown : Math.max(0,current.ultimateCooldown-1);
    if (command.action === 'focus') {
      next.charged = true;
      event.manaRestored = Math.min(RULES.chargeRestore,RULES.heroMana-current.heroMana);
      next.heroMana += event.manaRestored;
    } else {
      event.manaSpent = command.action === 'guard' ? RULES.guardCost : command.action === 'ultimate' ? (ultimatePhase === 'prepare' ? RULES.ultimateCost : 0)
        : current.charged ? RULES.chargedCost : RULES.attackCost;
      next.heroMana -= event.manaSpent;
    }
    if (ultimatePhase) next.ultimatePrepared = ultimatePhase === 'prepare';
    if (intent.kind === 'guard') { event.enemyManaSpent = intent.cost; next.bossMana -= intent.cost; }
    if (command.action === 'attack' || ultimatePhase === 'cast') {
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
      if (command.action === 'attack') next.charged = false;
    }
    if (!next.bossHp) { next.status = 'victory'; next.wins++; }
    else {
      if (intent.kind === 'focus') {
        event.enemyManaRestored = Math.min(RULES.bossChargeRestore,RULES.bossMana-next.bossMana);
        next.bossMana += event.enemyManaRestored;
        next.bossCharged = true;
      } else if (intent.kind === 'prepare') {
        event.enemyManaSpent = intent.cost; next.bossMana -= intent.cost; next.bossUltimatePrepared = true;
      } else if (intent.kind === 'cast') next.bossUltimatePrepared = false;
      else if (intent.kind === 'attack') next.bossCharged = false;
      event.incoming = command.action === 'guard' ? Math.min(1,intent.damage) : intent.damage;
      event.blocked = intent.damage-event.incoming;
      next.heroHp = Math.max(0,current.heroHp-event.incoming);
      if (!next.heroHp) { next.status = 'defeat'; next.losses++; }
      else next.bossIntent = intent.kind;
    }
    const hit = `dealt ${event.damage} damage${event.critical ? ' (critical!)' : ''}${event.enemyBlocked ? ` (Aura guarded ${event.enemyBlocked})` : ''}`;
    const actionText = ultimatePhase === 'prepare' ? 'prepared Unleashed Zoltraak' : ultimatePhase === 'cast' ? `cast Unleashed Zoltraak and ${hit}` : command.action === 'attack' ? hit
      : command.action === 'guard' ? `guarded, blocking ${event.blocked} damage` : `focused and restored ${event.manaRestored} mana`;
    event.summary = `@${actor.login} ${actionText} and took ${event.incoming}.${event.manaSpent ? ` Spent ${event.manaSpent} mana.` : ''}`;
    if (event.enemyManaRestored) event.summary += ` Aura restored ${event.enemyManaRestored} mana.`;
    if (event.enemyManaSpent) event.summary += ` Aura spent ${event.enemyManaSpent} mana.`;
    if (next.status !== 'active') {
      next.previousResult = { encounter: next.encounter, status: next.status, turns: next.turn };
      event.summary += next.status === 'victory' ? ' Aura is defeated!' : ' Frieren has fallen.';
    }
  }
  next.revision = event.revision;
  next.players = { ...next.players, [actor.login]: (next.players[actor.login] ?? 0) + 1 };
  Object.assign(event,{ status: next.status, heroHp: next.heroHp, bossHp: next.bossHp, heroMana: next.heroMana, bossMana: next.bossMana,
    guardCooldown: next.guardCooldown, ultimateCooldown: next.ultimateCooldown, ultimatePrepared: next.ultimatePrepared, charged: next.charged });
  next.recent = [event,...next.recent].slice(0,5);
  return { state: validateState(next), event };
}
