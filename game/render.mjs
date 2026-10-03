import { TURN_TIMING as T, turnPlayback } from './playback.mjs';
import { RULES, ACTIONS, enemyIntent, actionUnavailable, validateState } from './engine.mjs';
import { background, heroArt, auraArt, frierenEffects, auraEffects, xml } from './art.mjs';

export const START = '<!-- README-RAID:START -->';
export const END = '<!-- README-RAID:END -->';
export const DEFAULT_REPOSITORY = 'IshanArdithya/IshanArdithya';

const text = (x, y, value, size = 24, color = '#f3e6cb', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${xml(value)}</text>`;

const seconds = ms => `${ms / 1000}s`;
const timedEffect = (id, content, start, duration, popup = false) => `<g class="${popup ? 'raid-popup' : 'raid-window'}" data-timeline="${id}" style="animation-delay:${seconds(start)};animation-duration:${seconds(duration)}">${content}</g>`;
function floatingText(id, x, y, label, start, size = 28, color = '#fff2d6', anchor = 'middle', subtitle = '') {
  const style = `text-anchor="${anchor}" stroke="#101723" stroke-width="4" stroke-linejoin="round" paint-order="stroke"`;
  return timedEffect(id, text(x,y,label,size,color,style) + (subtitle ? text(x,y-26,subtitle,14,color,style) : ''), start,T.popupDuration,true);
}

export function renderScene(state, { animate = true } = {}) {
  validateState(state);
  const last = state.recent[0];
  const playback = animate ? turnPlayback(state) : null;
  const duration = playback?.duration || 0;
  const intent = enemyIntent(state);
  const ended = state.status !== 'active';
  const pose = state.status === 'defeat' ? 'defeated' : state.status === 'victory' ? 'victorious'
    : last?.action === 'ultimate' ? 'ultimate' : last?.action === 'guard' ? 'guarding' : state.charged ? 'charged' : last?.action === 'attack' ? 'attacking' : 'ready';
  const swap = (key, value, markup) => {
    if (!playback?.event.before || playback.event.before[key] === value) return markup(value);
    const time = key === 'bossHp' ? T.bossDamage : key === 'heroHp' ? T.heroDamage
      : key === 'heroMana' ? (playback.event.action === 'charge' ? T.bossDamage : T.player)
      : playback.enemyPose === 'guard' ? T.player : playback.enemyPose === 'charge' ? T.heroDamage : T.enemy;
    const style = `style="animation-delay:${seconds(time)}"`;
    return `<g class="raid-before" data-hud="before-${key}" ${style}>${markup(playback.event.before[key])}</g><g class="raid-after" data-hud="after-${key}" ${style}>${markup(value)}</g>`;
  };
  const bar = (key,x,y,max,color) => swap(key,state[key],value => `<rect x="${x}" y="${y}" width="${Math.round(250*value/max)}" height="6" fill="${color}"/>`);
  const reading = (key,x,y,max,unit,color,extra='') => swap(key,state[key],value => text(x,y,`${value}/${max} ${unit}`,24,color,extra));
  const heroAction = playback ? timedEffect('frieren-action',frierenEffects(playback.playerPose),T.player,
    playback.playerPose === 'guarding' && playback.enemyActs ? T.enemy+T.actionDuration : T.actionDuration) : '';
  const enemyAction = playback?.enemyActs ? timedEffect('aura-action',auraEffects(playback.enemyPose),
    playback.enemyPose === 'guard' ? T.player : T.enemy,
    playback.enemyPose === 'guard' ? T.enemy+T.actionDuration : T.actionDuration) : '';
  let popups = '';
  if (playback) {
    const e = playback.event;
    if (e.damage > 0) popups += floatingText('aura-damage',582,366,`−${e.damage}`,T.bossDamage,28,e.critical ? '#ffd279' : '#fff2d6','middle',e.critical ? 'CRITICAL' : '');
    if (e.action === 'guard') popups += floatingText('frieren-guard',212,342,'GUARD',50,18,'#a6ece5','start');
    if (e.action === 'charge') popups += floatingText('frieren-charge',212,342,'CHARGE',T.bossDamage,18,'#a6ece5','start');
    if (playback.enemyActs) {
      if (e.enemyAction === 'guard') popups += floatingText('aura-guard',444,303,'GUARD',T.enemy,18,'#d9b8ff','end');
      if (e.enemyAction === 'charge') popups += floatingText('aura-charge',444,303,'CHARGE',T.enemy,18,'#d9b8ff','end');
      if (e.incoming > 0) popups += floatingText('frieren-damage',65,390,`−${e.incoming}`,T.heroDamage,28,'#ffb5b5');
    }
  }
  const auraPose = state.status === 'victory' ? 'defeated' : intent.kind;
  const label = ended ? (state.status === 'victory' ? 'VICTORY · FOREST PROTECTED' : 'DEFEAT · RISE AGAIN')
    : intent.kind === 'guard' ? 'GUARD · HALF DAMAGE TAKEN'
    : `${intent.name.toUpperCase()} · ${intent.damage} DAMAGE`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="624" viewBox="0 0 640 624" role="img" aria-labelledby="title desc" class="${playback ? 'turn-playback' : ''}" style="--turn-duration:${seconds(duration)}">
  <title id="title">README Raid: Frieren vs Aura</title>
  <desc id="desc">${xml(`Encounter ${state.encounter}. Frieren ${state.heroHp}/${RULES.heroHp} HP. Aura ${state.bossHp}/${RULES.bossHp} HP. Mana: Frieren ${state.heroMana}/${RULES.heroMana}, Aura ${state.bossMana}/${RULES.bossMana}. ${cooldownSummary(state)}. ${ended ? state.status : intent.message} ${state.charged ? 'Charged attack ready.' : 'Not charged.'}`)}</desc>
  <style>
    text { font-family: ui-monospace, 'DejaVu Sans Mono', monospace; font-weight: 700; }
    .hair-left { animation: hair-left 3.8s steps(1,end) infinite; }
    .hair-right { animation: hair-right 4.2s steps(1,end) infinite; }
    .frieren-idle { animation: breathe 3.2s steps(1,end) infinite; }
    .blink { opacity: 0; animation: blink 5.8s steps(1,end) infinite; }
    .blink-half { opacity: 0; animation: blink-half 5.8s steps(1,end) infinite; }
    .spell-cast { animation: none; }
    .barrier { animation: glow 3s ease-in-out infinite; }
    .forest-leaves { animation: forest-leaves 6s steps(1,end) infinite; }
    .forest-light { animation: forest-light 12s ease-in-out infinite; }
    .forest-pollen { animation: forest-pollen 14s steps(8,end) infinite; }
    .forest-pollen-late { animation-delay: -7s; animation-duration: 18s; }
    .aura { animation: glow 3s ease-in-out infinite; }
    .aura-idle { animation: aura-breathe 4.8s steps(1,end) infinite; }
    .aura-hair { animation: aura-hair 4s steps(1,end) infinite; }
    .aura-cape { animation: aura-cape 5.2s steps(1,end) infinite; }
    .aura-pan-left { animation: aura-balance 4s steps(1,end) infinite; }
    .aura-pan-right { animation: aura-balance 4s steps(1,end) -2s infinite; }
    .aura-scales-powered .aura-pan-left,.aura-scales-powered .aura-pan-right { animation-duration: 2.8s; }
    .aura-scales-powered .aura-pan-right { animation-delay: -1.4s; }
    .aura-blink { opacity: 0; animation: aura-blink 6.7s steps(1,end) infinite; }
    .aura-mana,.aura-command { animation: glow 2.8s ease-in-out infinite; }
    @keyframes aura-breathe { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
    @keyframes aura-hair { 0%,100% { transform: translateX(0); } 50% { transform: translateX(1px); } }
    @keyframes aura-cape { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-1px); } }
    @keyframes aura-balance { 0%,100% { transform: translateY(0); } 50% { transform: translateY(1px); } }
    @keyframes aura-blink { 0%,94%,98%,100% { opacity: 0; } 95% { opacity: 1; } }
    @keyframes hair-left { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-1px); } }
    @keyframes hair-right { 0%,100% { transform: translateX(0); } 50% { transform: translateX(1px); } }
    @keyframes breathe { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
    @keyframes blink { 0%,95%,99.5%,100% { opacity: 0; } 96%,99% { opacity: 1; } }
    @keyframes blink-half { 0%,94%,96%,99%,100% { opacity: 0; } 95%,99.5% { opacity: 1; } }
    @keyframes cast { from { transform: translateX(-9px); opacity: .4; } to { transform: translateX(0); opacity: 1; } }
    @keyframes glow { 0%,100% { opacity: .65; } 50% { opacity: 1; } }
    @keyframes forest-leaves { 0%,100% { transform: translateX(0); } 50% { transform: translateX(1px); } }
    @keyframes forest-light { 0%,100% { opacity: .04; } 50% { opacity: .11; } }
    @keyframes forest-pollen { 0% { transform: translate(0,0); opacity: 0; } 20% { opacity: .6; } 80% { opacity: .6; } 100% { transform: translate(8px,-8px); opacity: 0; } }
    .raid-caster { animation: raid-caster 700ms steps(2,end) 1 both; }
    .raid-window,.raid-popup,.raid-before { opacity: 0; pointer-events: none; }
    .raid-window { animation: raid-window 700ms linear 1 forwards; }
    .raid-popup { animation: raid-popup 850ms ease-out 1 forwards; }
    .raid-before { animation: raid-hide 1ms steps(1,end) 1 both; }
    .raid-after { animation: raid-show 1ms steps(1,end) 1 both; }
    .raid-settled { animation: raid-show 1ms steps(1,end) var(--turn-duration) 1 both; }
    .raid-soldier-lunge { animation: raid-lunge 700ms steps(5,end) ${seconds(T.enemy)} 1 both; }
    .frieren-fallen-body { opacity: .55; }
    .aura-fallen-body { opacity: .4; }
    .turn-playback .frieren-fallen-body { animation: raid-frieren-fall var(--turn-duration) steps(1,end) 1 both; }
    .turn-playback .aura-fallen-body { animation: raid-aura-fall var(--turn-duration) steps(1,end) 1 both; }
    .turn-playback .fallen-eyes { animation: raid-show 1ms steps(1,end) var(--turn-duration) 1 both; }
    .raid-window .barrier,.raid-window .aura { animation: none; }
    @keyframes raid-caster { 0%,100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
    @keyframes raid-window { 0% { opacity: 0; } 15%,80% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes raid-popup { 0% { opacity: 0; transform: translateY(3px); } 15%,75% { opacity: 1; } 100% { opacity: 0; transform: translateY(-9px); } }
    @keyframes raid-hide { from { opacity: 1; } to { opacity: 0; } }
    @keyframes raid-show { from { opacity: 0; } to { opacity: 1; } }
    @keyframes raid-lunge { 0% { transform: translateX(0); } 75%,100% { transform: translateX(-130px); } }
    @keyframes raid-frieren-fall { from { opacity: 1; } to { opacity: .55; } }
    @keyframes raid-aura-fall { from { opacity: 1; } to { opacity: .4; } }
    @media (prefers-reduced-motion: reduce) { .hair-left,.hair-right,.frieren-idle,.blink,.blink-half,.spell-cast,.barrier,.forest-leaves,.forest-light,.forest-pollen,.aura,.aura-idle,.aura-hair,.aura-cape,.aura-pan-left,.aura-pan-right,.aura-blink,.aura-mana,.aura-command { animation: none !important; } .blink,.blink-half,.aura-blink { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .raid-caster,.raid-window,.raid-popup,.raid-before,.raid-after,.raid-settled,.raid-soldier-lunge,.turn-playback .frieren-fallen-body,.turn-playback .aura-fallen-body,.turn-playback .fallen-eyes { animation: none !important; }
      .raid-window,.raid-popup,.raid-before { opacity: 0; }
      .raid-after,.raid-settled,.fallen-eyes { opacity: 1; }
    }
  </style>
  <g shape-rendering="crispEdges">${background()}
    <path d="M24 90h250v6H24zM366 90h250v6H366zM24 130h250v6H24zM366 130h250v6H366z" fill="#303a4b"/>
    ${bar('heroHp',24,90,RULES.heroHp,'#55d7c3')}${bar('bossHp',366,90,RULES.bossHp,'#e66870')}
    ${bar('heroMana',24,130,RULES.heroMana,'#85b9ef')}${bar('bossMana',366,130,RULES.bossMana,'#c597ef')}
    <g transform="translate(35 242) scale(.8)">
      <g class="${playback && ['attack','ultimate'].includes(last.action) ? 'raid-caster' : ''}">${heroArt(pose, { effects: false })}</g>${heroAction}
      <g class="raid-settled">${frierenEffects(state.status === 'victory' ? 'victorious' : state.status === 'active' && state.charged ? 'charged' : 'ready')}</g>
    </g>
    <g transform="translate(0 180)">${auraArt(auraPose, { effects: false })}${enemyAction}</g>
  </g>
  ${text(24, 31, 'README RAID', 16, '#a5b5c9', 'letter-spacing="3"')}
  ${text(616, 31, `ENCOUNTER ${String(state.encounter).padStart(3, '0')}`, 14, '#a5b5c9', 'text-anchor="end"')}
  ${text(24, 54, 'FRIEREN')}${text(616, 54, 'AURA', 24, '#f3e6cb', 'text-anchor="end"')}
  ${reading('heroHp',24,82,RULES.heroHp,'HP','#55d7c3')}${reading('bossHp',616,82,RULES.bossHp,'HP','#e66870','text-anchor="end"')}
  ${reading('heroMana',24,120,RULES.heroMana,'MP','#85b9ef')}${reading('bossMana',616,120,RULES.bossMana,'MP','#c597ef','text-anchor="end"')}
${popups}
  ${text(24, 543, state.charged ? 'CHARGE: READY' : 'CHARGE: EMPTY', 24, state.charged ? '#55d7c3' : '#a5b5c9')}
  ${text(616, 543, `TURN ${state.turn}`, 16, '#a5b5c9', 'text-anchor="end"')}
  ${text(24, 575, cooldownSummary(state), 24, '#c5b3e8')}
  ${text(24, 608, ended ? label : `NEXT: ${label}`, 24, ended ? '#ebbb76' : '#f3e6cb')}
  <rect x=".5" y=".5" width="639" height="623" rx="12" fill="none" stroke="#364458"/>
</svg>\n`;
}

export function cooldownSummary(state) {
  return `CD · GUARD: ${state.guardCooldown ? `${state.guardCooldown}T` : 'READY'} · ULT: ${state.ultimateCooldown ? `${state.ultimateCooldown}T` : 'READY'}`;
}
export function actionDescription(state, action) {
  return {
    attack: `Attack — 5–7 damage, or 14–18 charged; ${state.charged ? RULES.chargedCost : RULES.attackCost} mana`,
    guard: `Guard — take at most 1 damage; ${RULES.guardCost} mana; skip one turn before reusing`,
    charge: `Charge — restore ${RULES.chargeRestore} mana and prepare an attack or ultimate`,
    ultimate: `Unleashed Zoltraak — ${RULES.ultimateDamage} damage; ${RULES.ultimateCost} mana; requires Charge; ${RULES.ultimateCooldown} other turns before reuse`,
  }[action];
}
export function buttonKind(state, action) {
  return actionUnavailable(state, action) ? `${action}-disabled` : action;
}
export const BUTTON_ASSETS = [...ACTIONS, ...ACTIONS.map(a => `${a}-disabled`), 'charged', 'restart'];
export function renderButton(action) {
  const disabled = action.endsWith('-disabled');
  const base = disabled ? action.slice(0, -9) : action;
  const config = {
    attack: ['ATTACK', '#e66870'], guard: ['GUARD', '#82b5d5'], charge: ['CHARGE', '#55d7c3'],
    ultimate: ['ULTIMATE', '#d6a8f3'], charged: ['CHARGED ✓', '#8896a9'], restart: ['PLAY AGAIN', '#ebbb76'],
  }[base];
  if (!config) throw new Error('Unknown button');
  const color = disabled ? '#667285' : config[1];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="44" viewBox="0 0 96 44" role="img" aria-label="${xml(config[0])}${disabled ? ' unavailable' : ''}"><rect x="1" y="1" width="94" height="42" rx="5" fill="#172234" stroke="${color}"/><path d="M10 35h76" stroke="${color}" opacity=".3"/><text x="48" y="26" text-anchor="middle" font-family="ui-monospace,monospace" font-size="${base === 'restart' || base === 'charged' ? 12 : 14}" font-weight="700" fill="${color}">${xml(config[0])}</text></svg>\n`;
}

export function issueUrl(state, action, repository = DEFAULT_REPOSITORY) {
  const query = new URLSearchParams({
    title: `raid|${state.encounter}|${state.revision}|${action}`,
    body: `Submit this issue to take one shared turn in README Raid. No editing needed.\n\nWait for the result, then return and refresh: https://github.com/${repository}#readme-raid\n\nEveryone controls Frieren together. If another visitor moves first, refresh and choose again.`,
  });
  return `https://github.com/${repository}/issues/new?${query}`;
}

export function renderSection(state, { repository = DEFAULT_REPOSITORY, branch = 'main' } = {}) {
  validateState(state);
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
  const raw = `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(branch)}/game/assets`;
  const button = (action, alt) => `[![${alt}](${raw}/${action}.svg)](${issueUrl(state, action, repository)})`;
  const active = state.status === 'active';
  const intent = enemyIntent(state);
  const controls = active ? ACTIONS.map((action, i) => {
    const reason = actionUnavailable(state, action);
    const control = reason ? `![${actionDescription(state, action)} — unavailable: ${reason}](${raw}/${buttonKind(state, action)}.svg)` : button(action, actionDescription(state, action));
    return control + (i === 1 ? '<br>' : '');
  }).join(' ') : button('restart', 'Play Again — start a new encounter');
  const unavailable = active ? ACTIONS.filter(a => actionUnavailable(state, a)).map(a => `${a}: ${actionUnavailable(state, a)}`).join(' ') : '';
  const next = active ? `**Next:** ${intent.name} · ${intent.damage} damage. ${intent.message}`
    : `**${state.status === 'victory' ? 'Victory! The forest is safe.' : 'Defeat. Frieren will rise again.'}** Choose Play Again for a fresh encounter.`;
  const history = state.recent.length ? state.recent.map(e => `- [Turn ${e.turn} · @${e.player}](https://github.com/${repository}/issues/${e.issue}): ${e.summary.replace(`@${e.player} `, '')}`).join('\n') : 'No moves yet. Take the first turn!';
  return `${START}
## README Raid

**Frieren faces Aura. Everyone takes a turn.** Help protect the forest clearing.

![Frieren ${state.heroHp}/${RULES.heroHp} HP; Aura ${state.bossHp}/${RULES.bossHp} HP; ${state.status}; ${state.charged ? 'charged' : 'uncharged'}](https://raw.githubusercontent.com/${repository}/${encodeURIComponent(branch)}/game/assets/battle.svg?v=${state.revision})

${controls}

**Frieren:** ${state.heroHp}/${RULES.heroHp} HP · **Aura:** ${state.bossHp}/${RULES.bossHp} HP · **Charge:** ${state.charged ? 'ready' : 'empty'}

**Mana:** Frieren ${state.heroMana}/${RULES.heroMana} MP · Aura ${state.bossMana}/${RULES.bossMana} MP

**Cooldowns:** ${cooldownSummary(state)}. Counts decrease only on accepted turns.
${unavailable ? `\n${unavailable}\n` : ''}
${next}

${state.recent[0] ? `**Last turn:** ${state.recent[0].summary}` : '**Your move:** Charge while Aura guards, Attack during openings, and Guard her assault.'}

Choose an action → submit the prefilled issue → wait for the result → return and refresh. GitHub sign-in required.

**Victories:** ${state.wins} · **Defeats:** ${state.losses} · Encounter ${state.encounter} · Revision ${state.revision}
${state.previousResult ? `\nPrevious result: encounter ${state.previousResult.encounter}, ${state.previousResult.status}, ${state.previousResult.turns} turns.\n` : ''}
<details>
<summary>How to play / Recent turns</summary>

Everyone shares the same hero. You may play consecutive turns; nothing happens while nobody is playing.

| Action | Effect |
| --- | --- |
| Attack | 5–7 damage for 10 mana, or 14–18 for 20 mana when charged. Consumes charge. 10% critical chance, ×1.5 rounded down. |
| Guard | 15 mana. Take at most 1 damage and keep charge. Must take one other turn before guarding again. |
| Charge | Restore up to 40 mana and prepare one charged Attack or Ultimate. May refill mana while charged; cannot stack the damage boost. |
| Ultimate | Unleashed Zoltraak: 32 fixed damage for 80 mana. Requires and consumes charge. No critical multiplier. Six other accepted turns before reuse. |

Frieren starts with **26 HP / 240 MP**; Aura has **100 HP / 40 MP**, with a **60 MP** limit. These are game balance values, not canon measurements.

Aura cycles **Guard (15 MP) → Attack (4 damage, free) → Charge (+35 MP) → Assault (10 damage, 30 MP)**. Guard halves all incoming damage, including the ultimate. If she cannot afford Guard or Assault, she visibly recovers mana instead (0 damage, no guard). Check the displayed intent before choosing. Your action resolves first; a killing blow prevents retaliation and Aura's mana recovery.

Cooldowns do not tick while nobody plays. Invalid actions, stale links, and retries spend no mana and consume no turns. Ultimate and Guard availability belongs to the shared encounter, not individual visitors.

Her army and scales inspire this simplified encounter. [Character abilities and next-phase notes](game/ABILITIES.md).

${history}

[Game source and setup](game/README.md)

</details>
${END}`;
}

export function updateReadme(readme, section) {
  const start = readme.indexOf(START), end = readme.indexOf(END);
  if (start === -1 && end === -1) {
    const anchor = '## Things I code with:';
    const at = readme.indexOf(anchor);
    if (at === -1) throw new Error('README insertion anchor missing');
    return `${readme.slice(0, at)}${section}\n\n${readme.slice(at)}`;
  }
  if (start === -1 || end < start || readme.indexOf(START, start + START.length) !== -1 || readme.indexOf(END, end + END.length) !== -1)
    throw new Error('README raid markers are missing, duplicated, or out of order');
  return readme.slice(0, start) + section + readme.slice(end + END.length);
}
