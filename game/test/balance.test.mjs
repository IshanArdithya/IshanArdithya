import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../balance.mjs';
test('40,000 seeded fights reward defense and make the ultimate useful but optional', () => {
  const tactics=simulate('tactical'), basic=simulate('no-ultimate'), spam=simulate('attack'), rush=simulate('reckless');
  assert.equal(tactics.wins,10000); assert.equal(basic.wins,10000);
  assert.ok(tactics.meanTurns<basic.meanTurns);
  assert.ok(tactics.minTurns>=10 && tactics.maxTurns<=20);
  assert.equal(spam.wins,0); assert.ok(rush.wins<100);
});
