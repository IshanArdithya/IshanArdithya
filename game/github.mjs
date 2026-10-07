import { readFile, appendFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, generatedPaths, writeArtifacts } from './generate.mjs';
import { migrateState } from './engine.mjs';
import { processIssue } from './process.mjs';

const exec = promisify(execFile);
const RECEIPT_MARKER = '<!-- readme-raid-result -->';

export function githubClient(repository, token, fetcher = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !token) throw new Error('Missing GitHub repository/token');
  return async (path, method = 'GET', body) => {
    const response = await fetcher(`https://api.github.com/repos/${repository}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GitHub API ${method} ${path} failed (${response.status})`);
    return response.status === 204 ? null : response.json();
  };
}

export function acknowledger(api, repository) {
  return async (number, message) => {
    let existing;
    for (let page = 1; ; page++) {
      const comments = await api(`/issues/${number}/comments?per_page=100&page=${page}`);
      existing = comments.find(c => c.user?.login === 'github-actions[bot]' && c.body?.startsWith(RECEIPT_MARKER));
      if (existing || comments.length < 100) break;
    }
    const body = `${RECEIPT_MARKER}\n${message}\n\n[Return to Aura the Guillotine and refresh](https://github.com/${repository}#aura-the-guillotine).`;
    if (existing) {
      if (existing.body !== body) await api(`/issues/comments/${existing.id}`, 'PATCH', { body });
    } else await api(`/issues/${number}/comments`, 'POST', { body });
    await api(`/issues/${number}`, 'PATCH', { state: 'closed' });
  };
}

export function gitRepository(root, repository, branch) {
  if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.RUNNER_TEMP) throw new Error('Git persistence is only allowed in a GitHub Actions runner.');
  const git = (...args) => exec('git', args, { cwd: root, timeout: 60_000, maxBuffer: 1024 * 1024 });
  return {
    async loadLatest() {
      await git('fetch', '--no-tags', 'origin', `+refs/heads/${branch}:refs/remotes/origin/raid-default`);
      await git('reset', '--hard', 'refs/remotes/origin/raid-default');
      const state = migrateState(JSON.parse(await readFile(resolve(root, 'game/state.json'), 'utf8')));
      const events = (await readFile(resolve(root, 'game/events.jsonl'), 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line));
      if (events.length !== state.revision || (events.length && events.at(-1).revision !== state.revision))
        throw new Error('State/event log revision mismatch');
      return { state, events };
    },
    async commit(state, event) {
      await writeArtifacts(root, state, { repository, branch });
      await appendFile(resolve(root, 'game/events.jsonl'), `${JSON.stringify(event)}\n`);
      await git('config', 'user.name', 'github-actions[bot]');
      await git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
      await git('add', '--', ...generatedPaths(state));
      await git('add', '-u', '--', 'game/assets');
      await git('commit', '-m', `raid: ${event.action} by ${event.player} (#${event.issue})`);
      await git('push', 'origin', `HEAD:refs/heads/${branch}`);
    },
  };
}

export async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const api = githubClient(repository, process.env.GITHUB_TOKEN);
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const issueNumber = process.env.INPUT_ISSUE_NUMBER || event.issue?.number;
  if (!/^[1-9]\d*$/.test(String(issueNumber)) || !Number.isSafeInteger(Number(issueNumber))) throw new Error('A positive issue number is required.');
  const issue = await api(`/issues/${Number(issueNumber)}`);
  const branch = process.env.DEFAULT_BRANCH;
  if (!branch) throw new Error('Repository default branch is missing');
  const result = await processIssue(issue, gitRepository(ROOT, repository, branch), acknowledger(api, repository));
  console.log(JSON.stringify({ issue: Number(issueNumber), ignored: !!result.ignored, rejected: !!result.rejected,
    duplicate: !!result.duplicate, revision: result.event?.revision }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await main(); }
  catch (error) {
    console.error(`Aura the Guillotine failed: ${error.message}`);
    process.exitCode = 1;
  }
}
