import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './generate.mjs';
import { initialState, transition, ACTIONS } from './engine.mjs';
import { renderButton, renderScene, BUTTON_ASSETS, buttonKind } from './render.mjs';

export function fixtures() {
  const take = (state, action, critical = false) => transition(state, { encounter: state.encounter, revision: state.revision, action },
    { issue: state.revision + 1, login: 'visitor' }, (min, max) => max === 10 ? (critical ? 0 : 1) : min).state;
  const ready = initialState();
  const charged = take(ready, 'focus');
  const attacking = take(charged, 'attack');
  const guarding = take({ ...charged, intent: 3 }, 'guard');
  const critical = take(charged, 'attack', true);
  const victory = take({ ...ready, bossHp: 1 }, 'attack');
  const defeat = take({ ...ready, heroHp: 1, intent: 3 }, 'attack');
  const auraCharge = { ...ready, intent: 2 };
  const auraAssault = take({ ...ready, intent: 3 }, 'attack');
  const prepared = take(ready, 'ultimate');
  const ultimate = take(prepared, 'ultimate');
  const lowMana = { ...ready, heroMana: 79 };
  const depleted = { ...ready, heroMana: 0, bossMana: 0, charged: true, guardCooldown: 1, ultimateCooldown: 3 };
  return { prepared, ultimate, lowMana, depleted, ready, charged, attacking, guarding, critical, victory, defeat, 'aura-charge': auraCharge, 'aura-assault': auraAssault };
}

export async function preview() {
  const dir = resolve(ROOT, 'game/preview');
  await mkdir(dir, { recursive: true });
  for (const [name, state] of Object.entries(fixtures())) await writeFile(resolve(dir, `${name}.svg`), renderScene(state));
  for (const action of BUTTON_ASSETS) await writeFile(resolve(dir, `button-${action}.svg`), renderButton(action, `../assets/${action.replace(/-disabled$/, '')}.png`));
  const buttons = state => (state.status !== 'active' ? ['restart'] : ACTIONS.map(a => buttonKind(state,a))).map(action => `<img src="button-${action}.svg" width="${action === 'restart' ? 96 : 128}" height="${action === 'restart' ? 44 : 128}" alt="${action}">`).join(' ');
  const cards = Object.entries(fixtures()).map(([name, state]) => `<section id="${name}"><h2>${name}</h2><div class="sizes"><div class="wide"><img class="scene" src="${name}.svg" alt="${name}"><p>${buttons(state)}</p></div><div class="narrow"><img class="scene" src="${name}.svg" alt="${name} mobile"><p>${buttons(state)}</p></div></div></section>`).join('');
  await writeFile(resolve(dir, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>README Raid — art previews</title><style>body{margin:0;background:#f6f8fa;color:#1f2937;font:16px system-ui}main{max-width:1040px;margin:auto;padding:24px}h1{font-size:26px}h2{text-transform:capitalize;font-size:18px}.sizes{display:flex;gap:24px;align-items:start;flex-wrap:wrap}.wide{width:640px}.narrow{width:320px;background:#0d1117;padding-bottom:8px;color:#f3e6cb}.scene{display:block;width:100%;height:auto}p{display:flex;gap:8px}p img{width:calc((100% - 24px)/4);max-width:128px;height:auto;align-self:start}section{padding:16px 0 24px;border-bottom:1px solid #ccd1d9}section:target{outline:2px solid #239e9d}@media(prefers-color-scheme:dark){body{background:#0d1117;color:#f3e6cb}.narrow{background:#f6f8fa}}</style><main><h1>README Raid · SVG fixtures</h1><p>640px / 320px · Change your system motion preference to check the still fallback.</p>${cards}</main></html>`);
  console.log(`Preview: ${resolve(dir, 'index.html')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await preview();
