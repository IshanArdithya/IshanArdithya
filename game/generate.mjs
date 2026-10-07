import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { initialState, validateState, migrateState } from './engine.mjs';
import { loadButtonIcons } from './button-icons.mjs';
import { renderScene, renderButton, renderSection, updateReadme, DEFAULT_REPOSITORY, BUTTON_ASSETS, buttonIcon } from './render.mjs';

function iconDocument(iconSvg, { muted = false } = {}) {
  const artwork = iconSvg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    .replace(/<(title|desc)\b[^>]*>[\s\S]*?<\/\1>/g, '').trim();
  const picture = muted
    ? `<defs><filter id="muted-icon" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/></filter></defs><g filter="url(#muted-icon)">${artwork}</g>`
    : artwork;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="284" height="284" viewBox="18 18 284 284" shape-rendering="crispEdges">${picture}</svg>`;
}

function rasterizeButton(svg, dest) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('resvg', ['-w', '568', '-h', '568', '-', dest], { stdio: ['pipe', 'inherit', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolvePromise() : reject(new Error(stderr || `resvg exited ${code}`)));
    child.stdin.end(svg);
  });
}

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

export async function writeButtons(root) {
  const icons = await loadButtonIcons();
  const dir = resolve(root, 'game/assets');
  await mkdir(dir, { recursive: true });
  const written = new Set();
  for (const action of BUTTON_ASSETS) {
    if (action === 'restart') {
      await writeFile(resolve(dir, 'restart.svg'), renderButton('restart'));
      continue;
    }
    const base = action.replace(/-disabled$/, '');
    if (!written.has(base)) {
      written.add(base);
      await rasterizeButton(iconDocument(icons[base]), resolve(dir, buttonIcon(base)));
      await rasterizeButton(iconDocument(icons[base], { muted: true }), resolve(dir, buttonIcon(`${base}-disabled`)));
    }
    const href = `data:image/png;base64,${(await readFile(resolve(dir, buttonIcon(action)))).toString('base64')}`;
    await writeFile(resolve(dir, `${action}.svg`), renderButton(action, href));
  }
}

export async function generate() {
  let state;
  try { state = migrateState(JSON.parse(await readFile(resolve(ROOT, 'game/state.json'), 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; state = initialState(); }
  await writeArtifacts(ROOT, state, {
    repository: process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY,
    branch: process.env.DEFAULT_BRANCH || 'main',
  });
  await writeButtons(ROOT);
  await writeFile(resolve(ROOT, 'game/events.jsonl'), '', { flag: 'a' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await generate();
