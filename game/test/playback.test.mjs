import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition } from '../engine.mjs';
import { turnPlayback, TURN_TIMING } from '../playback.mjs';
import { renderScene } from '../render.mjs';
const take = (state,action) => transition(state,{encounter:state.encounter,revision:state.revision,action},
  {issue:state.revision+1,login:'visitor'},(min,max)=>max===10?1:min);

test('playback uses the resolved enemy action, not the next announced intent',()=>{
  const before=initialState();
  const {state,event}=take(before,'attack');
  assert.deepEqual(event.before,{heroHp:26,bossHp:100,heroMana:240,bossMana:40});
  assert.equal(state.bossIntent,'attack'); assert.equal(turnPlayback(state).enemyPose,'attack');
  const svg=renderScene(state);
  assert.match(svg,/data-effect="aura-attack"/);
  assert.doesNotMatch(svg,/data-effect="aura-mana-recovery"/);
  assert.match(svg,/data-timeline="aura-damage"/);
  assert.match(svg,/data-timeline="frieren-damage"/);
  assert.match(svg,/data-hud="before-heroHp"/);
  assert.equal(before.heroHp,26);
  const playback=turnPlayback(state);
  assert.equal(playback.enemyDuration,3400);
  assert.equal(playback.heroDamageAt,5150);
  assert.equal(playback.duration,6100);
  assert.match(svg,/data-timeline="frieren-damage" style="animation-delay:5.15s/);
  assert.equal(turnPlayback(take({...initialState(),bossHp:1},'attack').state).duration,TURN_TIMING.victoryFinish);
});

test('winning blows skip Aura response and losing blows still play the full turn',()=>{
  const win=take({...initialState(),bossHp:1,bossUltimatePrepared:true},'attack').state;
  assert.equal(turnPlayback(win).enemyActs,false);
  assert.equal(turnPlayback(win).duration,TURN_TIMING.victoryFinish);
  assert.doesNotMatch(renderScene(win),/data-timeline="aura-action"|data-timeline="frieren-damage"/);
  const lose=take({...initialState(),heroHp:1,bossUltimatePrepared:true},'attack').state;
  assert.equal(turnPlayback(lose).enemyActs,true);
  assert.match(renderScene(lose),/data-timeline="frieren-damage"/);
  assert.equal(turnPlayback(lose).duration,6700);
});

test('guard feedback is separate from damage; zero damage does not create a popup',()=>{
  const heroGuard=take({...initialState(),bossUltimatePrepared:true},'guard').state;
  assert.match(renderScene(heroGuard),/data-timeline="frieren-guard"/);
  assert.doesNotMatch(renderScene(heroGuard),/data-timeline="aura-damage"/);
  const auraGuard=take({...initialState(),charged:true},'attack').state;
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


test('Assault renders five soldiers but resolves one paid hit before unlocking',()=>{
  const {state,event}=take({...initialState(),bossUltimatePrepared:true},'attack');
  const svg=renderScene(state);
  assert.equal(state.heroHp,16);
  assert.equal(state.bossMana,40);
  assert.equal(event.incoming,10);
  assert.equal((svg.match(/data-army-soldier="sword"/g)||[]).length,3);
  assert.equal((svg.match(/data-army-soldier="halberd"/g)||[]).length,2);
  assert.equal(turnPlayback(state).heroDamageAt,5750);
  assert.equal(turnPlayback(state).duration,6700);
  const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
  for (const [,id] of svg.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id));
  const guarded=take({...initialState(),bossUltimatePrepared:true},'guard').state;
  assert.equal(guarded.heroHp,25);
  assert.equal(turnPlayback(guarded).duration,6700);
  const recovered=take({...initialState(),bossMana:0},'attack').state;
  assert.doesNotMatch(renderScene(recovered),/data-army-soldier=/);
  assert.equal(turnPlayback(recovered).duration,TURN_TIMING.finish);
  assert.doesNotMatch(renderScene(state,{animate:false}),/data-army-soldier=/);
});


test('ultimate preparation has its own effect and no damage, casting has the beam and hit',()=>{
  const prepared=take(initialState(),'ultimate').state;
  assert.equal(turnPlayback(prepared).playerPose,'preparing');
  const svg=renderScene(prepared);
  assert.match(svg,/data-effect="ultimate-preparation"/);
  assert.match(svg,/data-timeline="frieren-ultimate-prepared"/);
  assert.doesNotMatch(svg,/data-effect="unleashed-zoltraak"|data-timeline="aura-damage"/);
  const cast=take(prepared,'ultimate').state;
  assert.equal(turnPlayback(cast).playerPose,'ultimate');
  assert.match(renderScene(cast),/data-effect="unleashed-zoltraak"/);
  assert.match(renderScene(cast),/data-timeline="aura-damage"/);
});
