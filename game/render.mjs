import { INTENTS, validateState } from './engine.mjs';
import { background, heroArt, auraArt, xml } from './art.mjs';

export const START = '<!-- README-RAID:START -->';
export const END = '<!-- README-RAID:END -->';
export const DEFAULT_REPOSITORY = 'IshanArdithya/IshanArdithya';

const text = (x, y, value, size = 24, color = '#f3e6cb', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${xml(value)}</text>`;

export function renderScene(state) {
  validateState(state);
  const last = state.recent[0];
  const ended = state.status !== 'active';
  const pose = state.status === 'defeat' ? 'defeated' : state.status === 'victory' ? 'victorious'
    : last?.action === 'guard' ? 'guarding' : state.charged ? 'charged' : last?.action === 'attack' ? 'attacking' : 'ready';
  const auraPose = state.status === 'victory' ? 'defeated' : INTENTS[state.intent].kind;
  const label = ended ? (state.status === 'victory' ? 'VICTORY · SHRINE PROTECTED' : 'DEFEAT · RISE AGAIN')
    : state.intent === 0 ? 'GUARD · HALF DAMAGE TAKEN'
    : `${INTENTS[state.intent].name.toUpperCase()} · ${INTENTS[state.intent].damage} DAMAGE`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-labelledby="title desc">
  <title id="title">README Raid: Frieren vs Aura</title>
  <desc id="desc">${xml(`Encounter ${state.encounter}. Frieren ${state.heroHp}/24 HP. Aura ${state.bossHp}/60 HP. ${ended ? state.status : INTENTS[state.intent].message} ${state.charged ? 'Charged attack ready.' : 'Not charged.'}`)}</desc>
  <style>
    text { font-family: ui-monospace, 'DejaVu Sans Mono', monospace; font-weight: 700; }
    .hair-left { transform-origin: 490px 300px; animation: hair-left 3.8s steps(4,end) infinite; }
    .hair-right { transform-origin: 790px 515px; animation: hair-right 4.2s steps(4,end) infinite; }
    .frieren-idle { animation: breathe 3.2s steps(1,end) infinite; }
    .blink { opacity: 0; animation: blink 5.8s steps(1,end) infinite; }
    .blink-half { opacity: 0; animation: blink-half 5.8s steps(1,end) infinite; }
    .spell-cast { animation: cast .6s steps(4,end) both; }
    .barrier { animation: glow 3s ease-in-out infinite; }
    .lantern { animation: glow 4s ease-in-out infinite; }
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
    @keyframes hair-left { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(1.8deg); } }
    @keyframes hair-right { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-2.5deg); } }
    @keyframes breathe { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
    @keyframes blink { 0%,95%,99.5%,100% { opacity: 0; } 96%,99% { opacity: 1; } }
    @keyframes blink-half { 0%,94%,96%,99%,100% { opacity: 0; } 95%,99.5% { opacity: 1; } }
    @keyframes cast { from { transform: translateX(-9px); opacity: .4; } to { transform: translateX(0); opacity: 1; } }
    @keyframes glow { 0%,100% { opacity: .65; } 50% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .hair-left,.hair-right,.frieren-idle,.blink,.blink-half,.spell-cast,.barrier,.lantern,.aura,.aura-idle,.aura-hair,.aura-cape,.aura-pan-left,.aura-pan-right,.aura-blink,.aura-mana,.aura-command { animation: none !important; } .blink,.blink-half,.aura-blink { opacity: 0; } }
  </style>
  <g shape-rendering="crispEdges">${background()}
    <path d="M24 106h250v7H24zM366 106h250v7H366z" fill="#303a4b"/>
    <rect x="24" y="106" width="${Math.round(250 * state.heroHp / 24)}" height="7" fill="#55d7c3"/>
    <rect x="366" y="106" width="${Math.round(250 * state.bossHp / 60)}" height="7" fill="#e66870"/>
    ${heroArt(pose)}${auraArt(auraPose)}
    ${state.charged && pose === 'guarding' ? '<path class="aura" d="M128 257v-48h5v48zM226 251v-33h5v33z" fill="#55d7c3"/>' : ''}
  </g>
  ${text(24, 31, 'README RAID', 16, '#a5b5c9', 'letter-spacing="3"')}
  ${text(616, 31, `ENCOUNTER ${String(state.encounter).padStart(3, '0')}`, 14, '#a5b5c9', 'text-anchor="end"')}
  ${text(24, 66, 'FRIEREN')}${text(616, 66, 'AURA', 24, '#f3e6cb', 'text-anchor="end"')}
  ${text(24, 95, `${state.heroHp}/24 HP`, 24, '#55d7c3')}${text(616, 95, `${state.bossHp}/60 HP`, 24, '#e66870', 'text-anchor="end"')}
  ${last?.critical ? text(249, 248, 'CRITICAL', 16, '#ebbb76') : ''}
  ${text(24, 311, state.charged ? 'CHARGE: READY' : 'CHARGE: EMPTY', 24, state.charged ? '#55d7c3' : '#a5b5c9')}
  ${text(616, 311, `TURN ${state.turn}`, 16, '#a5b5c9', 'text-anchor="end"')}
  ${text(24, 344, ended ? label : `NEXT: ${label}`, 24, ended ? '#ebbb76' : '#f3e6cb')}
  <rect x=".5" y=".5" width="639" height="359" rx="12" fill="none" stroke="#364458"/>
</svg>\n`;
}

export function renderButton(action) {
  const config = {
    attack: ['ATTACK', '#e66870'], guard: ['GUARD', '#82b5d5'], charge: ['CHARGE', '#55d7c3'],
    charged: ['CHARGED ✓', '#8896a9'], restart: ['PLAY AGAIN', '#ebbb76'],
  }[action];
  if (!config) throw new Error('Unknown button');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="44" viewBox="0 0 96 44" role="img" aria-label="${xml(config[0])}"><rect x="1" y="1" width="94" height="42" rx="5" fill="#172234" stroke="${config[1]}"/><path d="M10 35h76" stroke="${config[1]}" opacity=".3"/><text x="48" y="26" text-anchor="middle" font-family="ui-monospace,monospace" font-size="${action === 'restart' || action === 'charged' ? 12 : 14}" font-weight="700" fill="${config[1]}">${xml(config[0])}</text></svg>\n`;
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
  const controls = active ? `${button('attack', 'Attack — 5–7 damage, or 14–18 when charged')} ${button('guard', 'Guard — take at most 1 damage; keep charge')} ${state.charged ? `![Charged ✓ — attack to use it](${raw}/charged.svg)` : button('charge', 'Charge — power up the next attack')}` : button('restart', 'Play Again — start a new encounter');
  const next = active ? `**Next:** ${INTENTS[state.intent].name} · ${INTENTS[state.intent].damage} damage. ${INTENTS[state.intent].message}`
    : `**${state.status === 'victory' ? 'Victory! The shrine is safe.' : 'Defeat. Frieren will rise again.'}** Choose Play Again for a fresh encounter.`;
  const history = state.recent.length ? state.recent.map(e => `- [Turn ${e.turn} · @${e.player}](https://github.com/${repository}/issues/${e.issue}): ${e.summary.replace(`@${e.player} `, '')}`).join('\n') : 'No moves yet. Take the first turn!';
  return `${START}
## README Raid

**Frieren faces Aura. Everyone takes a turn.** Help protect the moonlit shrine.

![Frieren ${state.heroHp}/24 HP; Aura ${state.bossHp}/60 HP; ${state.status}; ${state.charged ? 'charged' : 'uncharged'}](https://raw.githubusercontent.com/${repository}/${encodeURIComponent(branch)}/game/assets/battle.svg?v=${state.revision})

${controls}

**Frieren:** ${state.heroHp}/24 HP · **Aura:** ${state.bossHp}/60 HP · **Charge:** ${state.charged ? 'ready' : 'empty'}

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
| Attack | 5–7 damage, or 14–18 when charged. Uses charge. A 10% critical chance multiplies damage by 1.5, rounded down. |
| Guard | Take at most 1 damage this turn and preserve charge. No healing. |
| Charge | Power up your next Attack. Take incoming damage normally. Charge cannot stack. |

Aura repeats **Guard → Attack (4) → Charge (0) → Assault (10)**. Her Guard halves your damage (rounded up) after critical hits; her Charge leaves her open and prepares the next assault. Your action resolves first; a killing blow prevents retaliation. Moves from an outdated page are rejected without changing the game.

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
