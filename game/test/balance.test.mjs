import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../balance.mjs';
test('40,000 seeded fights reward defense and make the ultimate useful but optional', () => {
  const tactics=simulate('tactical'), basic=simulate('no-ultimate'), spam=simulate('attack'), rush=simulate('reckless');
  assert.equal(tactics.wins,10000);
  assert.ok(basic.wins>1000 && basic.wins<tactics.wins);
  assert.ok(tactics.minTurns>=20 && tactics.maxTurns<=70);
  assert.ok(spam.wins<200); assert.ok(rush.wins<6000);
});
