import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { initialState, transition, actionUnavailable } from './engine.mjs';

export function simulate(policy, encounters = 10000) {
  let wins = 0, minTurns = Infinity, maxTurns = 0, turnTotal = 0, minHp = Infinity;
  for (let seed = 0; seed < encounters; seed++) {
    let r = seed;
    const random = (min,max) => { r = (Math.imul(1664525,r)+1013904223) >>> 0; return min+Math.floor(r/2**32*(max-min)); };
    let state = initialState();
    while (state.status === 'active' && state.turn < 100) {
      const can = a => !actionUnavailable(state,a);
      const threatened = state.bossUltimatePrepared || state.bossCharged || state.heroHp <= 8;
      let action;
      if (policy === 'attack') action = can('attack') ? 'attack' : 'focus';
      else if (policy === 'reckless') action = can('ultimate') ? 'ultimate' : !state.charged ? 'focus' : can('attack') ? 'attack' : 'focus';
      else if (threatened && can('guard')) action = 'guard';
      else if (policy !== 'no-ultimate' && !state.ultimatePrepared && can('ultimate')) action = 'ultimate';
      else if (state.charged && can('attack')) action = 'attack';
      else if (can('focus')) action = 'focus';
      else action = can('attack') ? 'attack' : 'guard';
      state = transition(state, { encounter: state.encounter, revision: state.revision, action },
        { issue: state.revision+1, login: 'simulation' }, random).state;
    }
    if (state.status === 'victory') { wins++; minTurns = Math.min(minTurns,state.turn); maxTurns = Math.max(maxTurns,state.turn); turnTotal += state.turn; minHp = Math.min(minHp,state.heroHp); }
  }
  return { policy, encounters, wins, minTurns: wins ? minTurns : null, maxTurns: wins ? maxTurns : null,
    meanTurns: wins ? Number((turnTotal/wins).toFixed(2)) : null, minHp: wins ? minHp : null };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  for (const policy of ['tactical','no-ultimate','attack','reckless']) console.log(JSON.stringify(simulate(policy)));
