import { randomInt as secureRandomInt } from 'node:crypto';
import { MoveError, parseCommand, transition } from './engine.mjs';

export async function processIssue(issue, repository, acknowledge, randomInt = secureRandomInt) {
  if (issue.pull_request || issue.user?.type !== 'User' || !issue.title.startsWith('raid|')) return { ignored: true };
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { state, events } = await repository.loadLatest();
    const receipt = events.find(event => event.issue === issue.number);
    if (receipt) {
      await acknowledge(issue.number, receipt.summary);
      return { duplicate: true, event: receipt };
    }
    let result;
    try {
      result = transition(state, parseCommand(issue.title), { issue: issue.number, login: issue.user.login }, randomInt);
    } catch (error) {
      if (!(error instanceof MoveError)) throw error;
      await acknowledge(issue.number, error.message);
      return { rejected: true, reason: error.message };
    }
    try { await repository.commit(result.state, result.event); }
    catch (error) { lastError = error; continue; }
    await acknowledge(issue.number, result.event.summary);
    return result;
  }
  const { events } = await repository.loadLatest();
  const receipt = events.find(event => event.issue === issue.number);
  if (receipt) {
    await acknowledge(issue.number, receipt.summary);
    return { duplicate: true, event: receipt };
  }
  throw new Error('Could not persist this move after three attempts. The issue remains open; retry it from Actions.', { cause: lastError });
}
