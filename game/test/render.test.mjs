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

test('full-mana focused state has no Focus link and terminal state only offers restart', () => {
  const all = fixtures();
  const charged = renderSection(all.charged);
  assert.match(charged, /focus-disabled.svg/);
  assert.doesNotMatch(charged, /title=raid%7C\d+%7C\d+%7Cfocus&/);
  for (const state of [all.victory, all.defeat]) {
    const section = renderSection(state);
    assert.match(section, /%7Crestart&/);
    assert.doesNotMatch(section, /%7C(?:attack|guard|focus|ultimate)&/);
  }
});

test('fixtures contain self-contained accessible SVG with reduced-motion and still fallbacks', () => {
  for (const [name, state] of Object.entries(fixtures())) {
    const svg = renderScene(state);
    assert.match(svg, /viewBox="0 0 640 360"/);
    assert.match(svg, /<title id="title">/);
    assert.match(svg, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(svg, /<script|<foreignObject|<image\b|data:image|@import|\son\w+=/i);
    for (const [, href] of svg.matchAll(/\bhref="([^"]+)"/g))
      assert.ok(href.startsWith('#'));
    for (const [, target] of svg.matchAll(/url\(([^)]+)\)/g)) assert.ok(target.startsWith('#'));
    assert.equal(svg, renderScene(state));
    assert.ok(svg.length < 850_000, `${name} should contain compact art, HUD portraits and reusable lettering paths`);
  }
});

test('each battle state has its intended character pose and readable health', () => {
  const all = fixtures();
  for (const [name, pose] of Object.entries({ ready: 'ready', charged: 'charged', attacking: 'attacking', guarding: 'guarding', victory: 'victorious', defeat: 'defeated' })) {
    assert.match(renderScene(all[name]), new RegExp(`data-pose="${pose}"`));
    assert.ok(renderSection(all[name]).includes(`Frieren ${all[name].heroHp}/26 HP`));
  }
  assert.match(renderScene(all.critical), />CRITICAL</);
  const defender = renderScene(all.charged);
  for (const layer of ['frontLeg','backLeg','body','shield'])
    assert.ok(defender.includes(`data-shield-layer="${layer}"`));
  const attacker = renderScene(all.attacking);
  assert.doesNotMatch(attacker, /<image\b|data:image|halberd-sprite/);
  for (const layer of ['frontLeg','backLeg','body','weapon'])
    assert.ok(attacker.includes(`data-knight-layer="${layer}"`));
});

test('square ability cards keep icon art in a PNG and labels as lettering', () => {
  for (const action of ['attack', 'guard', 'focus', 'ultimate', 'ultimate-cast']) {
    for (const kind of [action, `${action}-disabled`]) {
      const svg = renderButton(kind);
      assert.match(svg, /width="128" height="128" viewBox="0 0 128 128"/);
      assert.match(svg, new RegExp(`href="${kind}\\.png"`));
      assert.match(svg, /data-lettering="/);
      assert.doesNotMatch(svg, /id="arcane-|<script|muted-icon/);
      for (const [, href] of svg.matchAll(/\bhref="#([^"]+)"/g)) assert.match(href, /^letter-/);
    }
  }
  assert.match(renderButton('ultimate'), /ZOLTRAAK \(PREP\)/);
  assert.match(renderButton('ultimate-cast'), /ZOLTRAAK \(CAST\)/);
  assert.match(renderButton('restart'), /width="96" height="44"/);
  const section = renderSection(initialState());
  assert.equal([...section.matchAll(/width="23%"/g)].length, 4);
  assert.doesNotMatch(section, /<br>/);
  assert.match(section, /<picture><img src="[^"]+frieren-portrait\.svg" width="64" alt=""/);
  assert.match(section, /<picture><img src="[^"]+attack\.png" width="64" alt=""/);
  assert.doesNotMatch(section, /attack\.png" width="64" height=/);
  assert.match(section, /aura-portrait\.svg/);
  assert.match(section, /<strong>Frieren<\/strong><\/p><p>26 HP \/ 240 MP/);
  assert.match(renderSection(initialState()), /battle-e1t0\.svg" width="100%"/);
  assert.doesNotMatch(renderSection(initialState()), /\/battle\.svg"/);
  assert.match(renderSection(initialState(), { repository: 'owner/repo', branch: 'trunk' }), /owner\/repo\/trunk\/game\/assets/);
});

test('top 10 ranks visitors by accepted turns and omits the profile owner', () => {
  assert.match(renderSection(initialState()), /No visitor turns yet/);
  const state = { ...initialState(), players: { IshanArdithya: 9, ishanardithya: 4, SakinduD: 1, visitor: 3 } };
  const section = renderSection(state);
  assert.match(section, /<td>1<\/td><td>@visitor<\/td><td>3 turns<\/td>/);
  assert.match(section, /<td>2<\/td><td>@SakinduD<\/td><td>1 turn<\/td>/);
  assert.doesNotMatch(section, /@IshanArdithya|@ishanardithya/);
  const players = { owner: 100 };
  for (let index = 0; index < 12; index++) players[`player${String(index).padStart(2, '0')}`] = 20 - index;
  const board = renderSection({ ...initialState(), players }, { repository: 'owner/repo' });
  assert.doesNotMatch(board, /@owner/);
  assert.equal([...board.matchAll(/<td>@player/g)].length, 10);
  assert.match(board, /<td>1<\/td><td>@player00<\/td><td>20 turns<\/td>/);
  assert.doesNotMatch(board, /@player1[01]/);
});

test('mana, ultimate effects, fallback intent, and unavailable actions appear in the rendered state', () => {
  const all=fixtures();
  assert.match(renderScene(all.ultimate), /data-effect="unleashed-zoltraak"/);
  assert.match(renderScene(all.ultimate), /ULT: 6T/);
  assert.match(renderScene(all.depleted), /0\/240 MP/);
  assert.match(renderSection(all.depleted), /Focus/);
  const section=renderSection(all.depleted);
  for(const action of ['attack','guard','ultimate']) {
    assert.match(section,new RegExp(`<picture><img src="[^"]+${action}-disabled\\.svg"`));
    assert.ok(!section.includes(`%7C${action}&`));
  }
  assert.match(section, /%7Cfocus&/);
  assert.match(renderSection(all.charged), /%7Cultimate&/);
});

test('ultimate controls use phase-specific assets but the same revisioned action', () => {
  const all=fixtures();
  assert.match(renderSection(all.ready),/assets\/ultimate.svg/);
  assert.match(renderSection(all.prepared),/assets\/ultimate-cast.svg/);
  assert.match(renderSection(all.prepared),/%7Cultimate&/);
  assert.doesNotMatch(renderSection(all.prepared),/%7Cultimate-cast&/);
  assert.match(renderScene(all.prepared),/data-effect="ultimate-preparation"/);
  assert.doesNotMatch(renderScene(all.prepared),/data-effect="unleashed-zoltraak"/);
  assert.match(renderSection(initialState()), /<h3>Recent moves<\/h3>\n<p>Starts with the first move\.<\/p>/);
  assert.match(renderSection(all.charged), /<a href="https:\/\/github.com\/IshanArdithya\/IshanArdithya\/issues\/1">Turn 1<\/a> · @visitor /);
  assert.doesNotMatch(renderSection(all.charged), /\[Turn 1 · @visitor\]/);
  assert.doesNotMatch(renderScene(all.charged),/data-lettering="(?:ATTACK:|CD ·|NEXT:)/);
  assert.match(renderSection(all.ready),/%7Cfocus&/);
  assert.doesNotMatch(renderSection(all.ready),/%7Ccharge&/);
});
