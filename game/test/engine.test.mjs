import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition, parseCommand, validateState, migrateState, MoveError } from '../engine.mjs';

const move = (state, action, random = (min, max) => max === 10 ? 1 : min) => transition(state,
  { encounter: state.encounter, revision: state.revision, action }, { issue: state.revision + 1, login: 'visitor' }, random);

test('initial state and strict command parsing', () => {
  assert.equal(initialState().heroHp, 24);
  assert.equal(initialState().bossHp, 60);
  assert.deepEqual(parseCommand('raid|1|0|charge'), { encounter: 1, revision: 0, action: 'charge' });
  for (const title of ['raid|0|0|attack', 'raid|1|01|attack', 'raid|1|0|ATTACK', 'raid|1|0|attack\n',
    'raid|1|0|attack;echo secret', 'raid|1|9007199254740992|attack', 'hello'])
    assert.throws(() => parseCommand(title), MoveError);
});

test('transitions preserve the input and advance the intent, revision, and history', () => {
  const state = initialState(), before = structuredClone(state);
  const result = move(state, 'attack');
  assert.deepEqual(state, before);
  assert.equal(result.state.bossHp, 57);
  assert.equal(result.state.heroHp, 24);
  assert.equal(result.state.intent, 1);
  assert.equal(result.state.revision, 1);
  assert.equal(result.state.recent[0].issue, 1);
});

test('charge persists through guard, then is consumed by attack', () => {
  let state = move(initialState(), 'charge').state;
  state = move(state, 'guard').state;
  assert.equal(state.charged, true);
  assert.equal(state.heroHp, 23);
  assert.equal(state.intent, 2);
  const result = move(state, 'attack');
  assert.equal(result.event.damage, 14);
  assert.equal(result.state.charged, false);
  assert.equal(result.state.heroHp, 23);
  assert.equal(result.state.intent, 3);
});

test('guard only protects this turn and never heals', () => {
  const guarded = move({ ...initialState(), intent: 3, heroHp: 20 }, 'guard');
  assert.equal(guarded.event.incoming, 1);
  assert.equal(guarded.event.blocked, 9);
  assert.equal(guarded.state.heroHp, 19);
  assert.equal(move(initialState(), 'guard').event.incoming, 0);
  const next = move({ ...guarded.state, intent: 3 }, 'attack');
  assert.equal(next.event.incoming, 10);
});

test('normal and charged damage boundaries; critical rounds down', () => {
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
  assert.equal(hit.state.bossHp, 46);
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
  assert.equal(next.version, 2);
  assert.equal(next.intent, 3);
  assert.equal(next.revision, 7);
  assert.equal(next.heroHp, 9);
  assert.equal(next.bossHp, 21);
  assert.equal(next.wins, 2);
  assert.equal(old.version, 1);
  assert.throws(() => migrateState({ ...old, intent: 7 }), /legacy/);
});

test('invalid actions and stale commands never consume randomness or change state', () => {
  const current = move(initialState(), 'charge').state;
  const before = structuredClone(current);
  const rng = () => { throw new Error('Randomness must not be called'); };
  assert.throws(() => move(current, 'charge', rng), MoveError);
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
  const lost = move({ ...initialState(), heroHp: 1, intent: 3 }, 'charge').state;
  assert.equal(lost.status, 'defeat');
  assert.equal(lost.heroHp, 0);
  assert.equal(lost.losses, 1);
  const replay = move(lost, 'restart').state;
  assert.equal(replay.encounter, 2);
  assert.equal(replay.revision, 2);
  assert.equal(replay.heroHp, 24);
  assert.equal(replay.bossHp, 60);
  assert.equal(replay.intent, 0);
  assert.equal(replay.turn, 0);
  assert.equal(replay.charged, false);
  assert.deepEqual(replay.previousResult, { encounter: 1, status: 'defeat', turns: 1 });
  assert.equal(replay.losses, 1);
  assert.equal(replay.recent.length, 1);
  assert.throws(() => transition(replay, { encounter: 1, revision: 2, action: 'attack' }, { issue: 3, login: 'visitor' }), /changed/);
});

test('corrupt state fails closed and recent turns remain bounded', () => {
  for (const patch of [{ version: 3 }, { heroHp: -1 }, { intent: 4 }, { status: 'victory' }, { charged: 1 }])
    assert.throws(() => validateState({ ...initialState(), ...patch }));
  let state = initialState();
  for (let i = 0; i < 10; i++) state = move(state, 'guard').state;
  assert.equal(state.recent.length, 5);
  assert.equal(state.recent[0].revision, 10);
});

test('seeded simulation rewards tactics across 10,000 encounters', () => {
  function fight(seed, tactical) {
    let s = seed >>> 0;
    const random = (min, max) => {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return min + Math.floor(s / 2 ** 32 * (max - min));
    };
    let state = initialState();
    while (state.status === 'active' && state.turn < 30) {
      const action = !tactical ? 'attack' : state.intent === 3 ? 'guard'
        : state.intent === 0 ? (state.charged ? 'guard' : 'charge')
        : state.intent === 2 ? 'attack' : state.charged ? 'attack' : 'charge';
      state = move(state, action, random).state;
    }
    return state;
  }
  let tacticalWins = 0, attackWins = 0;
  for (let i = 0; i < 10000; i++) {
    const state = fight(i, true);
    tacticalWins += state.status === 'victory';
    assert.ok(state.turn >= 6 && state.turn <= 14);
    attackWins += fight(i, false).status === 'victory';
  }
  assert.equal(tacticalWins, 10000);
  assert.ok(attackWins < 100);
});
