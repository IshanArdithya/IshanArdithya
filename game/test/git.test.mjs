import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { initialState } from '../engine.mjs';
import { gitRepository } from '../github.mjs';
import { processIssue } from '../process.mjs';
import { writeArtifacts } from '../generate.mjs';

const exec = promisify(execFile);

test('real Git adapter saves atomic moves on a non-main branch and survives a conflicting push', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'readme-raid-git-'));
  const bare = join(directory, 'origin.git'), work = join(directory, 'runner'), other = join(directory, 'other');
  const priorActions = process.env.GITHUB_ACTIONS, priorTemp = process.env.RUNNER_TEMP;
  process.env.GITHUB_ACTIONS = 'true'; process.env.RUNNER_TEMP = directory;
  const git = (cwd, ...args) => exec('git', args, { cwd, env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } });
  try {
    await mkdir(work);
    await git(directory, 'init', '--bare', '--initial-branch=trunk', bare);
    await git(work, 'init', '--initial-branch=trunk');
    await git(work, 'config', 'user.name', 'Test');
    await git(work, 'config', 'user.email', 'test@example.invalid');
    await git(work, 'config', 'commit.gpgsign', 'false');
    await writeFile(join(work, 'README.md'), 'Existing introduction.\n\n## Things I code with:\nExisting technologies.\n');
    await writeArtifacts(work, initialState(), { repository: 'owner/profile', branch: 'trunk' });
    await writeFile(join(work, 'game/events.jsonl'), '');
    await git(work, 'add', '.'); await git(work, 'commit', '-m', 'Initial state');
    await git(work, 'remote', 'add', 'origin', bare); await git(work, 'push', 'origin', 'trunk');
    await git(directory, 'clone', bare, other);
    await git(other, 'config', 'user.name', 'Test'); await git(other, 'config', 'user.email', 'test@example.invalid');
    const adapter = gitRepository(work, 'owner/profile', 'trunk');
    const commit = adapter.commit;
    let interfere = true;
    adapter.commit = async (...args) => {
      if (interfere) {
        interfere = false;
        await writeFile(join(other, 'notes.txt'), 'Unrelated change that must survive.\n');
        await git(other, 'add', 'notes.txt'); await git(other, 'commit', '-m', 'Concurrent edit');
        await git(other, 'push', 'origin', 'trunk');
      }
      return commit(...args);
    };
    const input = { number: 42, title: 'raid|1|0|charge', user: { login: 'visitor', type: 'User' } };
    let acknowledgments = 0;
    const acknowledge = async () => {
      const persisted = JSON.parse((await git(bare, 'show', 'trunk:game/state.json')).stdout);
      assert.equal(persisted.revision, 1);
      acknowledgments++;
    };
    const result = await processIssue(input, adapter, acknowledge);
    assert.equal(result.state.charged, true);
    assert.equal(result.state.revision, 1);
    assert.equal(await readFile(join(work, 'notes.txt'), 'utf8'), 'Unrelated change that must survive.\n');
    const paths = (await git(bare, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'trunk')).stdout.trim().split('\n').sort();
    assert.deepEqual(paths, ['README.md', 'game/assets/battle.svg', 'game/events.jsonl', 'game/state.json']);
    const receipt = await processIssue(input, adapter, acknowledge);
    assert.equal(receipt.duplicate, true);
    assert.equal(acknowledgments, 2);
    const events = (await readFile(join(work, 'game/events.jsonl'), 'utf8')).trim().split('\n');
    assert.equal(events.length, 1);
    assert.equal(JSON.parse(events[0]).issue, 42);
    const readme = await readFile(join(work, 'README.md'), 'utf8');
    assert.match(readme, /^Existing introduction\./);
    assert.match(readme, /Existing technologies\.\n$/);
    assert.match(readme, /owner\/profile\/trunk\/game\/assets/);
  } finally {
    if (priorActions === undefined) delete process.env.GITHUB_ACTIONS; else process.env.GITHUB_ACTIONS = priorActions;
    if (priorTemp === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = priorTemp;
    await rm(directory, { recursive: true, force: true });
  }
});
