import test from 'node:test';
import assert from 'node:assert/strict';
import { createLettering } from '../lettering.mjs';
import { renderScene, renderButton, BUTTON_ASSETS } from '../render.mjs';
import { fixtures } from '../preview.mjs';

test('game and buttons use accessible path lettering without font loading', () => {
  const svgs = [...Object.values(fixtures()).map(state => renderScene(state)), ...BUTTON_ASSETS.map(renderButton)];
  for (const svg of svgs) {
    assert.doesNotMatch(svg, /<text\b|@font-face|font-family|https?:\/\/(?!www.w3.org)/);
    assert.match(svg, /data-font="IM Fell DW Pica"/);
    assert.match(svg, /data-lettering="[^"]+"/);
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const [,target] of svg.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), target);
  }
});

test('changing equal-length numeric counters keeps their advance and anchor stable', () => {
  const lettering = createLettering();
  const left = value => lettering.text(616,82,value,24,'#fff','text-anchor="end"').match(/translate\(([-\d.]+) 82\)/)[1];
  assert.equal(left('11/26 HP'),left('26/26 HP'));
  const repeated = createLettering();
  const first = repeated.text(0,20,'HP');
  repeated.text(0,50,'HP');
  assert.equal((repeated.definitions().match(/<path /g)||[]).length,2);
  assert.match(first, /aria-label="HP"/);
  assert.throws(() => lettering.text(0,0,'☃'), /Unsupported lettering/);
});
