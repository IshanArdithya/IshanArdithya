import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../engine.mjs';
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

test('charge badge follows stored charge independently of ultimate mana and cooldown', () => {
  const state=initialState();
  assert.deepEqual(ultimateIndicator(state),{charged:false});
  for (const changes of [{heroMana:80},{heroMana:0},{ultimateCooldown:2}]) {
    const charged={...state,...changes,charged:true};
    assert.deepEqual(ultimateIndicator(charged),{charged:true});
    assert.match(renderScene(charged),/data-charge-badge="charged"/);
  }
  for(const status of ['victory','defeat']) assert.equal(ultimateIndicator({...state,charged:true,status}).charged,false);
});

test('HUD uses a textless charge badge, omits encounters, and retains resource playback', () => {
  for (const state of Object.values(fixtures())) {
    const svg=renderScene(state);
    assert.doesNotMatch(svg,/data-lettering="(?:ULT |ENCOUNTER)/);
    assert.match(svg,/data-hud="turn-counter"/);
    assert.equal((svg.match(/data-charge-badge=/g)||[]).length,1);
  }
  assert.match(renderScene(fixtures().charged),/data-charge-badge="charged"/);
  assert.match(renderScene(fixtures().charged,{animate:false}),/data-charge-badge="charged"/);
  const hit=renderScene(fixtures().attacking);
  assert.match(hit,/data-charge-badge="empty"/);
  assert.match(hit,/data-hud="before-heroHp"/);
  assert.match(hit,/data-hud="after-heroHp"/);
});
