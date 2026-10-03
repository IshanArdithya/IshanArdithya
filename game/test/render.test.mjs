import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../engine.mjs';
import { renderScene, renderSection, renderButton, updateReadme, issueUrl, START, END } from '../render.mjs';
import { fixtures } from '../preview.mjs';

test('README insertion preserves all existing content and subsequent rendering is idempotent', () => {
  const before = 'intro\ncontact links\n\n## Things I code with:\nexisting content\n';
  const section = renderSection(initialState());
  const after = updateReadme(before, section);
  assert.equal(after.replace(`${section}\n\n`, ''), before);
  assert.equal(updateReadme(after, section), after);
  const changed = updateReadme(after, `${START}\nnew\n${END}`);
  assert.equal(changed.split(START)[0], after.split(START)[0]);
  assert.equal(changed.split(END)[1], after.split(END)[1]);
});

test('malformed README markers fail closed', () => {
  for (const input of ['nothing', START, END, `${END}${START}`, `${START}${START}${END}`, `${START}${END}${END}`])
    assert.throws(() => updateReadme(input, 'new'));
});

test('issue links encode the exact encounter, revision, action, and instructions', () => {
  const url = new URL(issueUrl({ ...initialState(), encounter: 3, revision: 17 }, 'attack'));
  assert.equal(url.searchParams.get('title'), 'raid|3|17|attack');
  assert.match(url.searchParams.get('body'), /shared turn/);
});

test('charged state has no charge link and terminal state only offers restart', () => {
  const all = fixtures();
  const charged = renderSection(all.charged);
  assert.match(charged, /Charged ✓/);
  assert.doesNotMatch(charged, /title=raid%7C\d+%7C\d+%7Ccharge&/);
  for (const state of [all.victory, all.defeat]) {
    const section = renderSection(state);
    assert.match(section, /%7Crestart&/);
    assert.doesNotMatch(section, /%7C(?:attack|guard|charge)&/);
  }
});

test('fixtures contain self-contained accessible SVG with reduced-motion and still fallbacks', () => {
  for (const [name, state] of Object.entries(fixtures())) {
    const svg = renderScene(state);
    assert.match(svg, /viewBox="0 0 640 360"/);
    assert.match(svg, /<title id="title">/);
    assert.match(svg, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(svg, /<script|<foreignObject|@import|\son\w+=/i);
    // The supplied exact SVG is a PNG wrapper. Allow embedded images and local
    // layer references, while still forbidding any external resource fetch.
    for (const [, href] of svg.matchAll(/\bhref="([^"]+)"/g))
      assert.ok(href.startsWith('#') || href.startsWith('data:image/png;base64,'));
    for (const [, target] of svg.matchAll(/url\(([^)]+)\)/g)) assert.ok(target.startsWith('#'));
    assert.equal(svg, renderScene(state));
    assert.ok(svg.length < 1_000_000, `${name} must embed the supplied image only once`);
  }
});

test('each battle state has its intended character pose and readable health', () => {
  const all = fixtures();
  for (const [name, pose] of Object.entries({ ready: 'ready', charged: 'charged', attacking: 'attacking', guarding: 'guarding', victory: 'victorious', defeat: 'defeated' })) {
    assert.match(renderScene(all[name]), new RegExp(`data-pose="${pose}"`));
    assert.ok(renderSection(all[name]).includes(`**Frieren:** ${all[name].heroHp}/24 HP`));
  }
  assert.match(renderScene(all.critical), />CRITICAL</);
});

test('button geometry and generated image revision are stable', () => {
  for (const action of ['attack', 'guard', 'charge', 'charged', 'restart']) assert.match(renderButton(action), /width="96" height="44"/);
  assert.match(renderSection(initialState()), /battle.svg\?v=0/);
  assert.match(renderSection(initialState(), { repository: 'owner/repo', branch: 'trunk' }), /owner\/repo\/trunk\/game\/assets/);
});
