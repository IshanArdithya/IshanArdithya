import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition, parseCommand, validateState, migrateState, MoveError, RULES, enemyIntent, actionUnavailable } from '../engine.mjs';

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
  assert.equal(result.state.bossHp, 97);
  assert.equal(result.state.heroHp, 26);
  assert.equal(result.state.intent, 1);
  assert.equal(result.state.revision, 1);
  assert.equal(result.state.recent[0].issue, 1);
});

test('Focus persists through guard, then is consumed by attack', () => {
  let state = move(initialState(), 'focus').state;
  state = move(state, 'guard').state;
  assert.equal(state.charged, true);
  assert.equal(state.heroHp, 25);
  assert.equal(state.intent, 2);
  const result = move(state, 'attack');
  assert.equal(result.event.damage, 14);
  assert.equal(result.state.charged, false);
  assert.equal(result.state.heroHp, 25);
  assert.equal(result.state.intent, 3);
});

test('guard only protects this turn and never heals', () => {
  const guarded = move({ ...initialState(), intent: 3, heroHp: 20 }, 'guard');
  assert.equal(guarded.event.incoming, 1);
  assert.equal(guarded.event.blocked, 9);
  assert.equal(guarded.state.heroHp, 19);
  assert.equal(move(initialState(), 'guard').event.incoming, 0);
  const next = move({ ...guarded.state, intent: 3, bossMana: 30 }, 'attack');
  assert.equal(next.event.incoming, 10);
});

test('normal and focused damage boundaries; critical rounds down', () => {
  for (const charged of [false, true]) {
    for (const high of [false, true]) {
      for (const critical of [false, true]) {
        const result = move({ ...initialState(), charged, intent: 2 }, 'attack', (min, max) => max === 10 ? (critical ? 0 : 9) : high ? max - 1 : min);
        const base = charged ? (high ? 18 : 14) : (high ? 7 : 5);
        assert.equal(result.event.baseDamage, base);
        assert.equal(result.event.damage, critical ? Math.floor(base * 1.5) : base);
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
  assert.equal(hit.state.charged, false);
  assert.equal(hit.state.bossHp, 86);
  assert.equal(hit.state.intent, 1);
  const next = move(hit.state, 'attack');
  assert.equal(next.event.damage, 5);
  assert.equal(next.event.enemyBlocked, 0);
});

test('Aura charge exposes an opening followed by the announced assault', () => {
  const opening = move({ ...initialState(), intent: 2 }, 'attack');
  assert.equal(opening.event.damage, 5);
  assert.equal(opening.event.incoming, 0);
  assert.equal(opening.event.enemyAction, 'charge');
  assert.equal(opening.state.intent, 3);
  const blocked = move(opening.state, 'guard');
  assert.equal(blocked.event.incoming, 1);
  assert.equal(blocked.event.blocked, 9);
  assert.equal(blocked.state.intent, 0);
  assert.equal(move(opening.state, 'attack').event.incoming, 10);
});

test('legacy state migration preserves progress and maps the old heavy attack to assault', () => {
  const old = { ...initialState(), version: 1, intent: 2, revision: 7, heroHp: 9, bossHp: 21, wins: 2 };
  const next = migrateState(old);
  assert.equal(next.version, 4);
  assert.equal(next.intent, 3);
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
  const result = move({ ...initialState(), bossHp: 1, heroHp: 1, intent: 3 }, 'attack');
  assert.equal(result.state.status, 'victory');
  assert.equal(result.state.bossHp, 0);
  assert.equal(result.state.heroHp, 1);
  assert.equal(result.event.incoming, 0);
  assert.equal(result.state.wins, 1);
  assert.throws(() => move(result.state, 'attack'), /ended/);
});

test('defeat, restart, previous result, and encounter/revision continuity', () => {
  const lost = move({ ...initialState(), heroHp: 1, intent: 3 }, 'focus').state;
  assert.equal(lost.status, 'defeat');
  assert.equal(lost.heroHp, 0);
  assert.equal(lost.losses, 1);
  const replay = move(lost, 'restart').state;
  assert.equal(replay.encounter, 2);
  assert.equal(replay.revision, 2);
  assert.equal(replay.heroHp, 26);
  assert.equal(replay.bossHp, 100);
  assert.equal(replay.intent, 0);
  assert.equal(replay.turn, 0);
  assert.equal(replay.charged, false);
  assert.deepEqual(replay.previousResult, { encounter: 1, status: 'defeat', turns: 1 });
  assert.equal(replay.losses, 1);
  assert.equal(replay.recent.length, 1);
  assert.throws(() => transition(replay, { encounter: 1, revision: 2, action: 'attack' }, { issue: 3, login: 'visitor' }), /changed/);
});

test('corrupt state fails closed and recent turns remain bounded', () => {
  for (const patch of [{ version: 5 }, { heroHp: -1 }, { intent: 4 }, { status: 'victory' }, { charged: 1 }])
    assert.throws(() => validateState({ ...initialState(), ...patch }));
  let state = initialState();
  for (let i = 0; i < 10; i++) state = move(state, enemyIntent(state).damage ? 'guard' : 'focus').state;
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
  const before={...initialState(),intent:1};
  const result=move(before,'ultimate',()=>{throw Error('No roll during preparation')});
  assert.equal(result.event.ultimatePhase,'prepare');
  assert.equal(result.event.damage,0); assert.equal(result.event.manaSpent,80);
  assert.equal(result.state.bossHp,100); assert.equal(result.state.heroHp,22);
  assert.equal(result.state.heroMana,160); assert.equal(result.state.ultimatePrepared,true);
  assert.equal(result.state.ultimateCooldown,0); assert.equal(result.state.charged,false);
  assert.equal(before.heroMana,240);
  assert.throws(()=>move({...initialState(),heroMana:79},'ultimate'),/80 required/);
});

test('casting prepaid ultimate preserves Focus, costs no mana, never crits, and respects guard', () => {
  const prepared={...initialState(),ultimatePrepared:true,charged:true,heroMana:0,intent:2};
  const hit=move(prepared,'ultimate',()=>{throw Error('No roll for ultimate')});
  assert.equal(hit.event.ultimatePhase,'cast'); assert.equal(hit.event.damage,32);
  assert.equal(hit.event.critical,false); assert.equal(hit.event.manaSpent,0);
  assert.equal(hit.state.heroMana,0); assert.equal(hit.state.charged,true);
  assert.equal(hit.state.ultimatePrepared,false); assert.equal(hit.state.ultimateCooldown,6);
  assert.equal(move({...prepared,intent:0},'ultimate').event.damage,16);
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
  let s=move({...initialState(),ultimatePrepared:true,heroMana:160,intent:2},'ultimate').state;
  for(let remaining=6;remaining>0;remaining--) {
    assert.equal(s.ultimateCooldown,remaining);
    const before=structuredClone(s);
    assert.throws(()=>move(s,'ultimate'),/cooling down/);
    assert.deepEqual(s,before);
    s=move(s,enemyIntent(s).damage===10?'guard':'focus').state;
  }
  assert.equal(s.ultimateCooldown,0);
  s=move(s,'ultimate').state;
  assert.equal(s.ultimatePrepared,true); assert.equal(s.ultimateCooldown,0);
  s=move(s,'ultimate').state;
  assert.equal(s.ultimatePrepared,false); assert.equal(s.ultimateCooldown,6);
});

test('preparation can be interrupted by defeat, and restart clears both boosts', () => {
  const lost=move({...initialState(),heroHp:1,intent:3},'ultimate').state;
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

test('Aura spends guard/assault mana, charges to cap, and announces affordable fallback', () => {
  assert.equal(move(initialState(),'attack').state.bossMana,25);
  const assault = move({...initialState(),intent:3},'guard');
  assert.equal(assault.state.bossMana,10); assert.equal(assault.event.enemyManaSpent,30);
  const charge = move({...initialState(),intent:2},'attack');
  assert.equal(charge.state.bossMana,60); assert.equal(charge.event.enemyManaRestored,20);
  for(const intent of [0,3]) {
    const s = {...initialState(),intent,bossMana:0};
    assert.equal(enemyIntent(s).name,'Recover mana');
    const result = move(s,'attack');
    assert.equal(result.event.damage,5); assert.equal(result.event.incoming,0);
    assert.equal(result.state.bossMana,35); assert.equal(result.event.enemyBlocked,0);
    assert.equal(result.state.intent,(intent+1)%4);
  }
});

test('ultimate victory skips retaliation and enemy mana recovery; replay resets resources', () => {
  const won = move({...initialState(), ultimatePrepared:true, bossHp:10, intent:2, bossMana:0},'ultimate');
  assert.equal(won.state.status,'victory'); assert.equal(won.state.bossMana,0);
  assert.equal(won.event.enemyManaRestored,0);
  const replay = move(won.state,'restart').state;
  assert.equal(replay.heroMana,240); assert.equal(replay.bossMana,40);
  assert.equal(replay.guardCooldown,0); assert.equal(replay.ultimateCooldown,0);
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
  assert.equal(current.version,4); assert.equal(current.revision,13);
  assert.equal(current.charged,true); assert.equal(current.ultimatePrepared,false);
  assert.equal(current.ultimateCooldown,4); assert.equal(current.wins,3);
  assert.deepEqual(current.recent,old.recent); assert.deepEqual(old,snapshot);
  assert.deepEqual(migrateState(current),current);
  assert.throws(()=>transition(current,{encounter:1,revision:12,action:'ultimate'},{issue:18,login:'visitor'}),/changed/);
  for(const patch of [{ultimatePrepared:1},{ultimatePrepared:true,ultimateCooldown:1}])
    assert.throws(()=>validateState({...initialState(),...patch}));
});
