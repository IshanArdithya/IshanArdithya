import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition, parseCommand, validateState, migrateState, MoveError, RULES, chooseBossIntent } from '../engine.mjs';

const move = (state, action, random = (min, max) => max === 10 ? 1 : min) => transition(state,
  { encounter: state.encounter, revision: state.revision, action }, { issue: state.revision + 1, login: 'visitor' }, random);

test('initial state and strict command parsing', () => {
  assert.equal(initialState().heroHp, 26);
  assert.equal(initialState().bossHp, 100);
  assert.equal(parseCommand('raid|1|0|ultimate').action, 'ultimate');
  assert.deepEqual(parseCommand('raid|1|0|focus'), { encounter: 1, revision: 0, action: 'focus' });
  for (const title of ['raid|1|0|charge', 'raid|0|0|attack', 'raid|1|01|attack', 'raid|1|0|ATTACK', 'raid|1|0|attack\n',
    'raid|1|0|attack;echo secret', 'raid|1|9007199254740992|attack', 'hello'])
    assert.throws(() => parseCommand(title), MoveError);
});

test('transitions preserve the input and advance the intent, revision, and history', () => {
  const state = initialState(), before = structuredClone(state);
  const result = move(state, 'attack');
  assert.deepEqual(state, before);
  assert.equal(result.state.bossHp, 95);
  assert.equal(result.state.heroHp, 22);
  assert.equal(result.event.enemyAction, 'attack');
  assert.equal(result.state.bossIntent, 'attack');
  let rolled = false;
  move(result.state, 'focus', () => { rolled = true; return 0; });
  assert.equal(rolled, true);
  assert.equal(result.state.revision, 1);
  assert.equal(result.state.recent[0].issue, 1);
});

test('Focus persists through guard, then is consumed by attack', () => {
  const focused = move(initialState(), 'focus');
  assert.equal(focused.event.enemyAction, 'attack');
  assert.equal(focused.state.charged, true);
  const guarded = move(focused.state, 'guard');
  assert.equal(guarded.event.enemyAction, 'guard');
  assert.equal(guarded.state.charged, true);
  assert.equal(guarded.state.heroHp, focused.state.heroHp);
  const result = move(guarded.state, 'attack');
  assert.equal(result.event.enemyAction, 'guard');
  assert.equal(result.event.damage, 7);
  assert.equal(result.state.charged, false);
});

test('guard only protects this turn and never heals', () => {
  const casting = { ...initialState(), bossUltimatePrepared: true };
  const guarded = move({ ...casting, heroHp: 20 }, 'guard');
  assert.equal(guarded.event.incoming, 1);
  assert.equal(guarded.event.blocked, 9);
  assert.equal(guarded.state.heroHp, 19);
  assert.equal(move({ ...initialState(), bossMana: 0 }, 'guard').event.incoming, 0);
  const next = move({ ...guarded.state, bossUltimatePrepared: true, bossMana: 30 }, 'attack');
  assert.equal(next.event.incoming, 10);
});

test('normal and focused damage boundaries; critical rounds down', () => {
  for (const charged of [false, true]) {
    for (const high of [false, true]) {
      for (const critical of [false, true]) {
        const result = move({ ...initialState(), charged }, 'attack', (min, max) => max === 10 ? (critical ? 0 : 9) : min === 0 ? 0 : high ? max - 1 : min);
        const base = charged ? (high ? 18 : 14) : (high ? 7 : 5);
        const rolled = critical ? Math.floor(base * 1.5) : base;
        assert.equal(result.event.baseDamage, base);
        assert.equal(result.event.rolledDamage, rolled);
        assert.equal(result.event.damage, charged ? rolled - Math.floor(rolled / 2) : rolled);
        assert.equal(result.event.enemyAction, charged ? 'guard' : 'attack');
        assert.equal(result.event.critical, critical);
      }
    }
  }
});

test('only one of ten critical rolls is a critical hit', () => {
  for (let roll = 0; roll < 10; roll++)
    assert.equal(move(initialState(), 'attack', (min, max) => max === 10 ? roll : min).event.critical, roll === 0);
});

test('Aura guard halves the final critical damage, rounded up, and only lasts one turn', () => {
  const hit = move({ ...initialState(), charged: true }, 'attack', (min, max) => max === 10 ? 0 : max - 1);
  assert.equal(hit.event.baseDamage, 18);
  assert.equal(hit.event.rolledDamage, 27);
  assert.equal(hit.event.enemyBlocked, 13);
  assert.equal(hit.event.damage, 14);
  assert.equal(hit.event.enemyAction, 'guard');
  assert.equal(hit.state.charged, false);
  assert.equal(hit.state.bossHp, 86);
  const next = move(hit.state, 'attack');
  assert.equal(next.event.damage, 5);
  assert.equal(next.event.enemyBlocked, 0);
});

test('preparing an ultimate deals nothing and the next turn always casts it', () => {
  const opening = move(initialState(), 'attack', (min, max) => max === 10 ? 1 : min === 0 ? 6 : min);
  assert.equal(opening.event.damage, 5);
  assert.equal(opening.event.incoming, 0);
  assert.equal(opening.event.enemyAction, 'prepare');
  assert.equal(opening.event.enemyManaSpent, 30);
  assert.equal(opening.state.bossMana, 10);
  assert.equal(opening.state.bossUltimatePrepared, true);
  assert.equal(opening.state.bossIntent, 'prepare');
  const blocked = move(opening.state, 'guard', () => { throw new Error('A prepared ultimate does not roll'); });
  assert.equal(blocked.event.incoming, 1);
  assert.equal(blocked.event.blocked, 9);
  assert.equal(blocked.state.bossUltimatePrepared, false);
  assert.equal(move(opening.state, 'attack').event.incoming, 10);
  const low = { ...initialState(), bossMana: 10 };
  assert.equal(chooseBossIntent(low, () => { throw new Error('Low mana does not roll'); }), 'focus');
  const prepared = { ...initialState(), bossUltimatePrepared: true, bossMana: 0, charged: true };
  assert.equal(chooseBossIntent(prepared, () => { throw new Error('A prepared ultimate does not roll'); }), 'cast');
  const threatened = { ...initialState(), charged: true };
  assert.equal(chooseBossIntent(threatened, () => { throw new Error('A heavy hit does not roll'); }), 'guard');
});

test('legacy state migration preserves progress and maps the old heavy attack to assault', () => {
  const old = { ...initialState(), version: 1, intent: 2, revision: 7, heroHp: 9, bossHp: 21, wins: 2 };
  const next = migrateState(old);
  assert.equal(next.version, 6);
  assert.equal(next.bossIntent, null);
  assert.equal(next.bossUltimatePrepared, false);
  assert.equal(next.revision, 8);
  assert.equal(next.heroHp, 10);
  assert.equal(next.bossHp, 35);
  assert.equal(next.wins, 2);
  assert.equal(old.version, 1);
  assert.throws(() => migrateState({ ...old, intent: 7 }), /legacy/);
});

test('invalid actions and stale commands never consume randomness or change state', () => {
  const current = move(initialState(), 'focus').state;
  const before = structuredClone(current);
  const rng = () => { throw new Error('Randomness must not be called'); };
  assert.throws(() => move(current, 'focus', rng), MoveError);
  assert.throws(() => move(current, 'restart', rng), MoveError);
  assert.throws(() => move(current, 'magic', rng), MoveError);
  assert.throws(() => transition(current, parseCommand('raid|1|0|attack'), { issue: 2, login: 'visitor' }, rng), /changed/);
  assert.deepEqual(current, before);
});

test('killing blow clamps HP, wins once, and prevents retaliation', () => {
  const result = move({ ...initialState(), bossHp: 1, heroHp: 1 }, 'attack');
  assert.equal(result.state.status, 'victory');
  assert.equal(result.state.bossHp, 0);
  assert.equal(result.state.heroHp, 1);
  assert.equal(result.event.incoming, 0);
  assert.equal(result.state.wins, 1);
  assert.throws(() => move(result.state, 'attack'), /ended/);
});

test('defeat, restart, previous result, and encounter/revision continuity', () => {
  const lost = move({ ...initialState(), heroHp: 1 }, 'focus').state;
  assert.equal(lost.status, 'defeat');
  assert.equal(lost.heroHp, 0);
  assert.equal(lost.losses, 1);
  const replay = move(lost, 'restart').state;
  assert.equal(replay.encounter, 2);
  assert.equal(replay.revision, 2);
  assert.equal(replay.heroHp, 26);
  assert.equal(replay.bossHp, 100);
  assert.equal(replay.bossIntent, null);
  assert.equal(replay.bossUltimatePrepared, false);
  assert.equal(replay.turn, 0);
  assert.equal(replay.charged, false);
  assert.deepEqual(replay.previousResult, { encounter: 1, status: 'defeat', turns: 1 });
  assert.equal(replay.losses, 1);
  assert.equal(replay.recent.length, 1);
  assert.throws(() => transition(replay, { encounter: 1, revision: 2, action: 'attack' }, { issue: 3, login: 'visitor' }), /changed/);
});

test('corrupt state fails closed and recent turns remain bounded', () => {
  for (const patch of [{ version: 7 }, { heroHp: -1 }, { bossIntent: 'sleep' }, { status: 'victory' }, { charged: 1 }, { players: [] }, { players: { visitor: 0 } }, { bossCharged: 'yes' }])
    assert.throws(() => validateState({ ...initialState(), ...patch }));
  let state = initialState();
  for (let i = 0; i < 10; i++) {
    const action = !state.charged || state.heroMana < RULES.heroMana ? 'focus' : 'attack';
    state = move(state, action).state;
  }
  assert.equal(state.recent.length, 5);
  assert.equal(state.recent[0].revision, 10);
});

test('mana costs, capped recovery, and refocusing while focused', () => {
  let state = { ...initialState(), heroMana: 200 };
  state = move(state,'focus').state;
  assert.equal(state.heroMana,240);
  assert.throws(() => move(state,'focus'), /full mana/);
  const guarded = move(state,'guard');
  assert.equal(guarded.state.heroMana,225);
  assert.equal(guarded.event.manaSpent,15);
  assert.equal(move(guarded.state,'focus').state.heroMana,240);
  assert.equal(move({ ...state, intent: 2 },'attack').state.heroMana,220);
  assert.equal(move(initialState(),'attack').state.heroMana,230);
  assert.equal(move({ ...state, heroMana: 0 },'focus').state.heroMana,40);
});

test('Guard requires a different accepted turn before reuse', () => {
  const guarded = move(initialState(),'guard').state;
  assert.equal(guarded.guardCooldown,1);
  assert.throws(() => move(guarded,'guard'), /cooling down/);
  const after = move(guarded,'focus').state;
  assert.equal(after.guardCooldown,0);
  assert.equal(move(after,'guard').state.guardCooldown,1);
});

test('ultimate preparation spends mana, deals no damage, and gives Aura a turn', () => {
  const before=initialState();
  const result=move(before,'ultimate');
  assert.equal(result.event.enemyAction,'attack');
  assert.equal(result.event.ultimatePhase,'prepare');
  assert.equal(result.event.damage,0); assert.equal(result.event.manaSpent,80);
  assert.equal(result.state.bossHp,100); assert.equal(result.state.heroHp,22);
  assert.equal(result.state.heroMana,160); assert.equal(result.state.ultimatePrepared,true);
  assert.equal(result.state.ultimateCooldown,0); assert.equal(result.state.charged,false);
  assert.equal(before.heroMana,240);
  assert.throws(()=>move({...initialState(),heroMana:79},'ultimate'),/80 required/);
});

test('casting prepaid ultimate preserves Focus, costs no mana, never crits, and respects guard', () => {
  const prepared={...initialState(),ultimatePrepared:true,charged:true,heroMana:0,bossMana:0};
  const hit=move(prepared,'ultimate',()=>{throw Error('No roll for ultimate')});
  assert.equal(hit.event.ultimatePhase,'cast'); assert.equal(hit.event.damage,32);
  assert.equal(hit.event.enemyAction,'focus');
  assert.equal(hit.event.critical,false); assert.equal(hit.event.manaSpent,0);
  assert.equal(hit.state.heroMana,0); assert.equal(hit.state.charged,true);
  assert.equal(hit.state.ultimatePrepared,false); assert.equal(hit.state.ultimateCooldown,6);
  assert.equal(move({...prepared,bossMana:40},'ultimate').event.damage,16);
});

test('Focus and ultimate preparation persist independently through other actions', () => {
  let state=move(initialState(),'ultimate').state;
  state=move(state,'focus').state;
  assert.equal(state.ultimatePrepared,true); assert.equal(state.charged,true);
  state=move(state,'attack').state;
  assert.equal(state.ultimatePrepared,true); assert.equal(state.charged,false);
  state=move(state,'guard').state;
  assert.equal(state.ultimatePrepared,true);
  const focus=move(initialState(),'focus').state;
  assert.equal(focus.ultimatePrepared,false);
});

test('ultimate cooldown starts on casting, requires six other turns, and cannot be bypassed by Focus', () => {
  let s=move({...initialState(),ultimatePrepared:true,heroMana:160,bossMana:0},'ultimate').state;
  for(let remaining=6;remaining>0;remaining--) {
    assert.equal(s.ultimateCooldown,remaining);
    const before=structuredClone(s);
    assert.throws(()=>move(s,'ultimate'),/cooling down/);
    assert.deepEqual(s,before);
    const action = !s.charged || s.heroMana < RULES.heroMana ? 'focus' : 'attack';
    s=move(s,action).state;
  }
  assert.equal(s.ultimateCooldown,0);
  s=move(s,'ultimate').state;
  assert.equal(s.ultimatePrepared,true); assert.equal(s.ultimateCooldown,0);
  s=move(s,'ultimate').state;
  assert.equal(s.ultimatePrepared,false); assert.equal(s.ultimateCooldown,6);
});

test('preparation can be interrupted by defeat, and restart clears both boosts', () => {
  const lost=move({...initialState(),heroHp:1},'ultimate').state;
  assert.equal(lost.status,'defeat'); assert.equal(lost.heroMana,160);
  assert.throws(()=>move(lost,'ultimate'),/ended/);
  const reset=move(lost,'restart').state;
  assert.equal(reset.ultimatePrepared,false); assert.equal(reset.charged,false);
  assert.equal(reset.heroMana,240);
});

test('insufficient mana rejects before randomness; mana/cooldown ranges fail closed', () => {
  for(const [action,cost] of [['attack',10],['guard',15],['ultimate',80]]) {
    const state = { ...initialState(), heroMana:cost-1, charged:action==='ultimate' };
    const before = structuredClone(state);
    assert.throws(() => move(state,action,() => { throw Error('No rolls'); }), /mana/);
    assert.deepEqual(state,before);
  }
  for(const patch of [{heroMana:-1},{heroMana:241},{bossMana:61},{ultimateCooldown:7},{guardCooldown:2}])
    assert.throws(() => validateState({...initialState(),...patch}));
});

test('Aura focuses when low, empowers the next attack, and pays to prepare', () => {
  const guarded = move({ ...initialState(), ultimatePrepared: true }, 'attack');
  assert.equal(guarded.event.enemyAction, 'guard');
  assert.equal(guarded.state.bossMana, 25);
  assert.equal(guarded.event.enemyManaSpent, 15);
  const focused = move({ ...initialState(), bossMana: 0 }, 'attack');
  assert.equal(focused.event.incoming, 0);
  assert.equal(focused.event.enemyManaRestored, 35);
  assert.equal(focused.state.bossCharged, true);
  assert.equal(focused.state.bossMana, 35);
  const empowered = move(focused.state, 'guard');
  assert.equal(empowered.event.enemyAction, 'attack');
  assert.equal(empowered.event.incoming, 1);
  assert.equal(empowered.event.blocked, 7);
  assert.equal(empowered.state.bossCharged, false);
  const preparing = move(initialState(), 'focus', (min, max) => max === 10 ? 1 : min === 0 ? 6 : min);
  assert.equal(preparing.event.enemyManaSpent, 30);
  assert.equal(preparing.state.bossUltimatePrepared, true);
  assert.equal(preparing.state.bossIntent, 'prepare');
  const pressing = { ...initialState(), recent: [{ encounter: 1, action: 'attack' }, { encounter: 1, action: 'attack' }] };
  assert.equal(chooseBossIntent(initialState(), () => 4), 'focus');
  assert.equal(chooseBossIntent(pressing, () => 4), 'guard');
  const opening = { ...initialState(), recent: [{ encounter: 1, action: 'guard' }] };
  assert.equal(chooseBossIntent(opening, () => 4), 'attack');
});

test('ultimate victory skips retaliation and enemy mana recovery; replay resets resources', () => {
  const won = move({...initialState(), ultimatePrepared:true, bossHp:10, bossMana:0},'ultimate');
  assert.equal(won.state.status,'victory'); assert.equal(won.state.bossMana,0);
  assert.equal(won.event.enemyManaRestored,0);
  const replay = move(won.state,'restart').state;
  assert.equal(replay.heroMana,240); assert.equal(replay.bossMana,40);
  assert.equal(replay.guardCooldown,0); assert.equal(replay.ultimateCooldown,0);
});

test('accepted moves add to each player total and a new encounter keeps them', () => {
  const first = move(initialState(), 'attack');
  assert.deepEqual(first.state.players, { visitor: 1 });
  const second = transition(first.state, { encounter: 1, revision: 1, action: 'focus' }, { issue: 2, login: 'ally' }, (min, max) => max === 10 ? 1 : min);
  assert.deepEqual(second.state.players, { visitor: 1, ally: 1 });
  const again = move(second.state, 'guard');
  assert.equal(again.state.players.visitor, 2);
  const replay = move({ ...again.state, status: 'victory', bossHp: 0 }, 'restart');
  assert.deepEqual(replay.state.players, { visitor: 3, ally: 1 });
  const saved = { ...initialState(), version: 4 };
  delete saved.players;
  assert.deepEqual(migrateState(saved).players, {});
  assert.equal(migrateState(saved).revision, 0);
});

test('version 2 upgrade preserves fractional health, history, counters, and endings', () => {
  const old = {...initialState(),version:2,heroHp:12,bossHp:30,revision:9,turn:9,wins:2};
  const upgraded=migrateState(old);
  assert.equal(upgraded.heroHp,13); assert.equal(upgraded.bossHp,50);
  assert.equal(upgraded.revision,10); assert.equal(upgraded.wins,2);
  assert.equal(upgraded.heroMana,240); assert.equal(old.version,2);
  assert.equal(migrateState({...old,status:'victory',bossHp:0}).status,'victory');
  assert.equal(migrateState({...old,status:'defeat',heroHp:0}).status,'defeat');
});

test('version 3 migration preserves battle and receipts, clears ultimate preparation, and invalidates old links', () => {
  const old={...initialState(),version:3,charged:true,ultimateCooldown:4,revision:12,turn:12,wins:3,
    recent:[{issue:17,revision:12,action:'ultimate',summary:'previous result'}]};
  delete old.ultimatePrepared;
  const snapshot=structuredClone(old), current=migrateState(old);
  assert.equal(current.version,6); assert.equal(current.revision,13);
  assert.equal(current.charged,true); assert.equal(current.ultimatePrepared,false);
  assert.equal(current.ultimateCooldown,4); assert.equal(current.wins,3);
  assert.deepEqual(current.recent,old.recent); assert.deepEqual(old,snapshot);
  assert.deepEqual(migrateState(current),current);
  assert.throws(()=>transition(current,{encounter:1,revision:12,action:'ultimate'},{issue:18,login:'visitor'}),/changed/);
  for(const patch of [{ultimatePrepared:1},{ultimatePrepared:true,ultimateCooldown:1}])
    assert.throws(()=>validateState({...initialState(),...patch}));
});
