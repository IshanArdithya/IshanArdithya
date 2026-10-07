import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition } from '../engine.mjs';
import { ultimateIndicator } from '../hud.mjs';
import { renderScene } from '../render.mjs';
import { fixtures } from '../preview.mjs';

const fill = (svg,key) => {
  const match = svg.match(new RegExp(`data-hud-fill="${key}" x="(\\d+)" y="(\\d+)" width="(\\d+)"`));
  assert.ok(match, key);
  return {x:Number(match[1]), width:Number(match[3])};
};

test('mirrored HUD fills match health/mana and keep centered numeric labels', () => {
  const state={...initialState(),heroHp:13,bossHp:50,heroMana:120,bossMana:30};
  const svg=renderScene(state);
  for (const key of ['heroHp','heroMana']) assert.deepEqual(fill(svg,key),{x:92,width:87});
  for (const key of ['bossHp','bossMana']) assert.deepEqual(fill(svg,key),{x:461,width:87});
  for (const label of ['13/26 HP','50/100 HP','120/240 MP','30/60 MP'])
    assert.ok(svg.includes(`data-lettering="${label}"`));
  const ended=renderScene({...state,status:'defeat',heroHp:0,heroMana:0,bossMana:0});
  for (const key of ['heroHp','heroMana','bossMana']) assert.equal(fill(ended,key).width,0);
  const full=renderScene({...initialState(),bossMana:60});
  for (const key of ['heroHp','heroMana','bossHp','bossMana']) assert.equal(fill(full,key).width,174);
});

test('ultimate badge distinguishes prepare, charged, cooldown, and low mana states', () => {
  const state=initialState();
  assert.deepEqual(ultimateIndicator(state),{ready:true,label:'ULT READY'});
  assert.deepEqual(ultimateIndicator({...state,charged:true}),{ready:true,label:'ULT READY'});
  assert.deepEqual(ultimateIndicator({...state,ultimatePrepared:true,heroMana:0}),{ready:true,label:'ULT CHARGED'});
  for (const [changes,label] of [[{heroMana:79},'ULT LOW MP'],[{heroMana:0},'ULT LOW MP'],
    [{ultimateCooldown:1},'ULT COOLDOWN'],[{status:'victory',bossHp:0},'ULT NOT READY'],[{status:'defeat',heroHp:0},'ULT NOT READY']]) {
    const unavailable={...state,...changes};
    assert.deepEqual(ultimateIndicator(unavailable),{ready:false,label});
    assert.match(renderScene(unavailable),/data-ultimate-ready="false" data-character="frieren"/);
    assert.doesNotMatch(renderScene(unavailable),/data-ultimate-ready="true" data-character="frieren"/);
  }
  assert.match(renderScene(fixtures().prepared,{animate:false}),/data-lettering="ULT CHARGED"/);
  assert.match(renderScene(fixtures().ultimate,{animate:false}),/data-lettering="ULT COOLDOWN"/);
});

test('ultimate readiness appears when playback finishes; still images show the final state', () => {
  for (const state of Object.values(fixtures())) {
    const svg=renderScene(state);
    assert.doesNotMatch(svg,/data-lettering="ENCOUNTER/);
    assert.match(svg,/data-hud="turn-counter"/);
    assert.equal((svg.match(/data-hud="ultimate-badge"/g)||[]).length,2);
  }
  const charged=renderScene(fixtures().charged);
  assert.match(charged,/class="raid-before" style="animation-delay:3.4s"><g data-ultimate-ready="false"/);
  assert.match(charged,/class="raid-after" style="animation-delay:3.4s"><g data-ultimate-ready="true"/);
  const still=renderScene(fixtures().charged,{animate:false});
  assert.match(still,/data-lettering="ULT READY"/);
  assert.doesNotMatch(still,/data-ultimate-ready="false" data-character="frieren"/);
  const hit=renderScene(fixtures().attacking);
  assert.match(hit,/data-lettering="ULT NOT READY"/);
  assert.match(hit,/data-hud="before-heroHp"/);
  assert.match(hit,/data-hud="after-heroHp"/);
});

test('Aura badge shows a charged ultimate, enough mana to prepare, or too little mana', () => {
  const charged={...initialState(),bossIntent:'cast',bossUltimatePrepared:true,bossMana:10};
  assert.deepEqual(ultimateIndicator(charged,'aura'),{ready:true,label:'ULT CHARGED'});
  assert.match(renderScene(charged),/data-ultimate-ready="true" data-character="aura"/);
  assert.deepEqual(ultimateIndicator(initialState(),'aura'),{ready:true,label:'ULT READY'});
  for (const [changes,label] of [[{bossMana:29,bossIntent:'focus',bossUltimatePrepared:false},'ULT LOW MP'],[{bossMana:0,bossIntent:'focus',bossUltimatePrepared:false},'ULT LOW MP'],[{status:'victory',bossHp:0},'ULT NOT READY'],[{status:'defeat',heroHp:0},'ULT NOT READY']]) {
    const state={...charged,...changes};
    assert.deepEqual(ultimateIndicator(state,'aura'),{ready:false,label});
    assert.match(renderScene(state),/data-ultimate-ready="false" data-character="aura"/);
  }
  const state=transition({...initialState(),bossIntent:'focus',bossMana:0},
    {encounter:1,revision:0,action:'guard'}, {issue:1,login:'visitor'},()=>0).state;
  assert.match(renderScene(state),/data-ultimate-ready="true" data-character="aura"/);
});
