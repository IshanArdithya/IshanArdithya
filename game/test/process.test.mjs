import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../engine.mjs';
import { processIssue } from '../process.mjs';
import { acknowledger, githubClient, gitRepository } from '../github.mjs';

const issue = (number = 1, title = 'raid|1|0|attack') => ({ number, title, user: { login: 'visitor', type: 'User' } });
const rng = (min, max) => max === 10 ? 1 : min;
function memory() {
  return {
    state: initialState(), events: [], writes: 0,
    async loadLatest() { return { state: structuredClone(this.state), events: structuredClone(this.events) }; },
    async commit(state, event) { this.state = state; this.events.push(event); this.writes++; },
  };
}

test('persists before acknowledgment and duplicate delivery never rolls twice', async () => {
  const repo = memory();
  let feedback = 0;
  const acknowledge = async () => { assert.equal(repo.writes, 1); feedback++; };
  await processIssue(issue(), repo, acknowledge, rng);
  const duplicate = await processIssue(issue(), repo, acknowledge, () => { throw new Error('No reroll'); });
  assert.equal(duplicate.duplicate, true);
  assert.equal(repo.writes, 1);
  assert.equal(feedback, 2);
});

test('two submissions from the same revision accept only one', async () => {
  const repo = memory();
  const feedback = [];
  await processIssue(issue(), repo, async (...args) => feedback.push(args), rng);
  const stale = await processIssue(issue(2, 'raid|1|0|focus'), repo, async (...args) => feedback.push(args), rng);
  assert.equal(stale.rejected, true);
  assert.equal(repo.writes, 1);
  assert.match(feedback[1][1], /Refresh/);
});

test('same visitor can take consecutive refreshed turns', async () => {
  const repo = memory();
  await processIssue(issue(), repo, async () => {}, rng);
  await processIssue(issue(2, 'raid|1|1|focus'), repo, async () => {}, rng);
  assert.equal(repo.writes, 2);
  assert.equal(repo.state.charged, true);
});

test('unrelated issues, bots, and pull requests do nothing', async () => {
  for (const input of [issue(1, 'ordinary issue'), { ...issue(), user: { type: 'Bot' } }, { ...issue(), pull_request: {} }]) {
    assert.equal((await processIssue(input, { loadLatest() { throw new Error('Must not load'); } }, async () => {})).ignored, true);
  }
});

test('malformed commands are acknowledged without persistence', async () => {
  const repo = memory();
  let message;
  assert.equal((await processIssue(issue(1, 'raid|$(touch /tmp/unsafe)'), repo, async (_, value) => { message = value; })).rejected, true);
  assert.match(message, /Invalid/);
  assert.equal(repo.writes, 0);
});

test('retry repairs feedback after a successfully persisted move', async () => {
  const repo = memory();
  await assert.rejects(processIssue(issue(), repo, async () => { throw new Error('API down'); }, rng), /API down/);
  const result = await processIssue(issue(), repo, async () => {}, () => { throw new Error('No reroll'); });
  assert.equal(result.duplicate, true);
  assert.equal(repo.writes, 1);
});

test('push failure retries and reloads before each attempt', async () => {
  const repo = memory(); const commit = repo.commit.bind(repo); let attempts = 0;
  repo.commit = async (...args) => { if (++attempts < 3) throw new Error('push rejected'); await commit(...args); };
  await processIssue(issue(), repo, async () => {}, rng);
  assert.equal(attempts, 3);
  assert.equal(repo.writes, 1);
});

test('all failed pushes leave issue open and state unmodified', async () => {
  const repo = memory(); let attempts = 0;
  repo.commit = async () => { attempts++; throw new Error('push rejected'); };
  await assert.rejects(processIssue(issue(), repo, async () => { throw new Error('Must not close'); }, rng), /three attempts/);
  assert.equal(attempts, 3);
  assert.equal(repo.state.revision, 0);
});

test('ambiguous push success is detected from the saved receipt', async () => {
  const repo = memory(); const commit = repo.commit.bind(repo);
  repo.commit = async (...args) => { await commit(...args); throw new Error('connection lost'); };
  const result = await processIssue(issue(), repo, async () => {}, rng);
  assert.equal(result.duplicate, true);
  assert.equal(repo.writes, 1);
});

test('acknowledger edits its own existing receipt and then closes the issue', async () => {
  const calls = [];
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (method === 'GET') return [{ id: 7, user: { login: 'github-actions[bot]' }, body: '<!-- readme-raid-result -->\nold' }];
  };
  await acknowledger(api, 'owner/repo')(2, 'Victory!');
  assert.equal(calls[1].path, '/issues/comments/7');
  assert.equal(calls[1].method, 'PATCH');
  assert.deepEqual(calls[2].body, { state: 'closed' });
});

test('acknowledger ignores forged receipt comments and creates its own', async () => {
  const calls = [];
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (method === 'GET') return [{ id: 7, user: { login: 'visitor' }, body: '<!-- readme-raid-result -->\nforged' }];
  };
  await acknowledger(api, 'owner/repo')(2, 'Done');
  assert.equal(calls[1].method, 'POST');
});

test('HTTP errors never expose authentication tokens', async () => {
  const api = githubClient('owner/repo', 'secret-token', async () => ({ ok: false, status: 403 }));
  await assert.rejects(api('/issues/1'), error => error.message.includes('403') && !error.message.includes('secret-token'));
});

test('local execution cannot reset a developer checkout', () => {
  if (process.env.GITHUB_ACTIONS !== 'true') assert.throws(() => gitRepository('/tmp', 'owner/repo', 'main'), /runner/);
});

test('prepare and cast retries cannot double spend or turn a retried preparation into a cast', async () => {
  const repo=memory(); repo.state.intent=2;
  const prepare=issue(1,'raid|1|0|ultimate');
  await assert.rejects(processIssue(prepare,repo,async()=>{throw Error('feedback failed')}),/feedback failed/);
  const before=structuredClone(repo.state);
  assert.equal((await processIssue(prepare,repo,async()=>{})).duplicate,true);
  assert.deepEqual(repo.state,before); assert.equal(repo.state.heroMana,160);
  assert.equal(repo.state.ultimatePrepared,true); assert.equal(repo.state.ultimateCooldown,0);
  assert.equal(repo.state.bossHp,100);
  assert.equal((await processIssue(issue(2,'raid|1|0|ultimate'),repo,async()=>{})).rejected,true);
  const cast=issue(3,'raid|1|1|ultimate');
  await processIssue(cast,repo,async()=>{});
  const after=structuredClone(repo.state);
  assert.equal(after.bossHp,68); assert.equal(after.heroMana,160);
  assert.equal(after.ultimatePrepared,false); assert.equal(after.ultimateCooldown,6);
  assert.equal((await processIssue(cast,repo,async()=>{})).duplicate,true);
  assert.deepEqual(repo.state,after);
  assert.equal((await processIssue(issue(4,'raid|1|2|ultimate'),repo,async()=>{})).rejected,true);
  assert.deepEqual(repo.state,after);
});
