import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition } from '../engine.mjs';
import { turnPlayback, TURN_TIMING } from '../playback.mjs';
import { renderScene } from '../render.mjs';
const take = (state,action) => transition(state,{encounter:state.encounter,revision:state.revision,action},
  {issue:state.revision+1,login:'visitor'},(min,max)=>max===10?1:min);

test('playback uses the resolved enemy action, not the next announced intent',()=>{
  const before={...initialState(),intent:1};
  const {state,event}=take(before,'attack');
  assert.deepEqual(event.before,{heroHp:26,bossHp:100,heroMana:240,bossMana:40});
  assert.equal(state.intent,2); assert.equal(turnPlayback(state).enemyPose,'attack');
  const svg=renderScene(state);
  assert.match(svg,/data-effect="aura-attack"/);
  assert.doesNotMatch(svg,/data-effect="aura-mana-recovery"/);
  assert.match(svg,/data-timeline="aura-damage"/);
  assert.match(svg,/data-timeline="frieren-damage"/);
  assert.match(svg,/data-hud="before-heroHp"/);
  assert.equal(before.heroHp,26);
});

test('winning blows skip Aura response and losing blows still play the full turn',()=>{
  const win=take({...initialState(),bossHp:1,intent:3},'attack').state;
  assert.equal(turnPlayback(win).enemyActs,false);
  assert.equal(turnPlayback(win).duration,TURN_TIMING.victoryFinish);
  assert.doesNotMatch(renderScene(win),/data-timeline="aura-action"|data-timeline="frieren-damage"/);
  const lose=take({...initialState(),heroHp:1,intent:3},'attack').state;
  assert.equal(turnPlayback(lose).enemyActs,true);
  assert.match(renderScene(lose),/data-timeline="frieren-damage"/);
  assert.equal(turnPlayback(lose).duration,TURN_TIMING.finish);
});

test('guard feedback is separate from damage; zero damage does not create a popup',()=>{
  const heroGuard=take({...initialState(),intent:3},'guard').state;
  assert.match(renderScene(heroGuard),/data-timeline="frieren-guard"/);
  assert.doesNotMatch(renderScene(heroGuard),/data-timeline="aura-damage"/);
  const auraGuard=take(initialState(),'attack').state;
  assert.match(renderScene(auraGuard),/data-timeline="aura-guard"/);
  assert.doesNotMatch(renderScene(auraGuard),/data-timeline="frieren-damage"/);
});

test('restart, still renders, and initial state have no turn replay',()=>{
  assert.equal(turnPlayback(initialState()),null);
  const won=take({...initialState(),bossHp:1},'attack').state;
  const reset=take(won,'restart').state;
  assert.equal(turnPlayback(reset),null);
  const still=renderScene(won,{animate:false});
  assert.doesNotMatch(still,/data-timeline=|data-hud="before-/);
  assert.match(still,/0\/100 HP/);
});
