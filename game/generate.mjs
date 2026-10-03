import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { initialState, validateState, migrateState } from './engine.mjs';
import { renderScene, renderButton, renderSection, updateReadme, DEFAULT_REPOSITORY, BUTTON_ASSETS } from './render.mjs';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const GENERATED_PATHS = ['README.md', 'game/state.json', 'game/events.jsonl', 'game/assets/battle.svg'];

export async function writeArtifacts(root, state, options) {
  validateState(state);
  // Validate the README before writing any files.
  const readme = updateReadme(await readFile(resolve(root, 'README.md'), 'utf8'), renderSection(state, options));
  const scene = renderScene(state);
  await mkdir(resolve(root, 'game/assets'), { recursive: true });
  await writeFile(resolve(root, 'game/state.json'), `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(resolve(root, 'game/assets/battle.svg'), scene);
  await writeFile(resolve(root, 'README.md'), readme);
}

export async function generate() {
  let state;
  try { state = migrateState(JSON.parse(await readFile(resolve(ROOT, 'game/state.json'), 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; state = initialState(); }
  await writeArtifacts(ROOT, state, {
    repository: process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY,
    branch: process.env.DEFAULT_BRANCH || 'main',
  });
  for (const action of BUTTON_ASSETS)
    await writeFile(resolve(ROOT, `game/assets/${action}.svg`), renderButton(action));
  await writeFile(resolve(ROOT, 'game/events.jsonl'), '', { flag: 'a' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await generate();
