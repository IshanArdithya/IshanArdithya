import { renderHud } from './hud.mjs';
import { createLettering } from './lettering.mjs';
import { TURN_TIMING as T, turnPlayback } from './playback.mjs';
import { RULES, ACTIONS, actionUnavailable, validateState } from './engine.mjs';
import { background, heroArt, auraArt, frierenEffects, auraEffects, xml } from './art.mjs';

export const START = '<!-- README-RAID:START -->';
export const END = '<!-- README-RAID:END -->';
export const DEFAULT_REPOSITORY = 'IshanArdithya/IshanArdithya';



const seconds = ms => `${ms / 1000}s`;
const timedEffect = (id, content, start, duration, popup = false) => `<g class="${popup ? 'raid-popup' : 'raid-window'}" data-timeline="${id}" style="animation-delay:${seconds(start)};animation-duration:${seconds(duration)}">${content}</g>`;
function floatingText(text, id, x, y, label, start, size = 28, color = '#fff2d6', anchor = 'middle', subtitle = '') {
  const style = `text-anchor="${anchor}" stroke="#101723" stroke-width="4" stroke-linejoin="round" paint-order="stroke"`;
  return timedEffect(id, text(x,y,label,size,color,style) + (subtitle ? text(x,y-26,subtitle,14,color,style) : ''), start,T.popupDuration,true);
}

export function renderScene(state, { animate = true } = {}) {
  validateState(state);
  const lettering = createLettering();
  const { text } = lettering;
  const last = state.recent[0];
  const playback = animate ? turnPlayback(state) : null;
  const duration = playback?.duration || 0;
  const ended = state.status !== 'active';
  const pose = state.status === 'defeat' ? 'defeated' : state.status === 'victory' ? 'victorious'
    : last?.action === 'ultimate' ? (last.ultimatePhase === 'prepare' ? 'preparing' : 'ultimate') : last?.action === 'guard' ? 'guarding' : state.charged ? 'charged' : last?.action === 'attack' ? 'attacking' : 'ready';
  const swap = (key, value, markup) => {
    if (!playback?.event.before || playback.event.before[key] === value) return markup(value);
    const time = key === 'bossHp' ? T.bossDamage : key === 'heroHp' ? playback.heroDamageAt
      : key === 'heroMana' ? (playback.event.action === 'focus' ? T.bossDamage : T.player)
      : playback.enemyPose === 'guard' ? T.player : playback.enemyPose === 'charge' ? T.heroDamage : T.enemy;
    const style = `style="animation-delay:${seconds(time)}"`;
    return `<g class="raid-before" data-hud="before-${key}" ${style}>${markup(playback.event.before[key])}</g><g class="raid-after" data-hud="after-${key}" ${style}>${markup(value)}</g>`;
  };
  const heroAction = playback ? timedEffect('frieren-action',frierenEffects(playback.playerPose),T.player,
    playback.playerPose === 'guarding' && playback.enemyActs ? T.enemy+playback.enemyDuration : T.actionDuration) : '';
  const enemyAction = playback?.enemyActs ? timedEffect('aura-action',auraEffects(playback.enemyPose),
    playback.enemyPose === 'guard' ? T.player : T.enemy,
    playback.enemyPose === 'guard' ? T.enemy+playback.enemyDuration : playback.enemyDuration) : '';
  let popups = '';
  if (playback) {
    const e = playback.event;
    if (e.damage > 0) popups += floatingText(text, 'aura-damage',582,214,`−${e.damage}`,T.bossDamage,28,e.critical ? '#ffd279' : '#fff2d6','middle',e.critical ? 'CRITICAL' : '');
    if (e.action === 'guard') popups += floatingText(text, 'frieren-guard',212,190,'GUARD',50,18,'#a6ece5','start');
    if (e.action === 'focus') popups += floatingText(text, 'frieren-focus',212,190,'FOCUS',T.bossDamage,18,'#a6ece5','start');
    if (e.ultimatePhase === 'prepare') popups += floatingText(text, 'frieren-ultimate-prepared',212,190,'ULT CHARGED',T.bossDamage,14,'#d6a8f3','start');
    if (playback.enemyActs) {
      if (e.enemyAction === 'guard') popups += floatingText(text, 'aura-guard',444,151,'GUARD',T.enemy,18,'#d9b8ff','end');
      if (e.enemyAction === 'focus') popups += floatingText(text, 'aura-focus',444,151,'FOCUS',T.enemy,18,'#d9b8ff','end');
      if (e.enemyAction === 'prepare') popups += floatingText(text, 'aura-prepare',444,151,'PREPARE',T.enemy,16,'#d9b8ff','end');
      if (e.incoming > 0) popups += floatingText(text, 'frieren-damage',65,238,`−${e.incoming}`,playback.heroDamageAt,28,'#ffb5b5');
    }
  }
  const auraPose = state.status === 'victory' ? 'defeated' : 'ready';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-labelledby="title desc" class="${playback ? 'turn-playback' : ''}" style="--turn-duration:${seconds(duration)}">
  <title id="title">Aura the Guillotine: Frieren vs Aura</title>
  <desc id="desc">${xml(`Encounter ${state.encounter}. Frieren ${state.heroHp}/${RULES.heroHp} HP. Aura ${state.bossHp}/${RULES.bossHp} HP. Mana: Frieren ${state.heroMana}/${RULES.heroMana}, Aura ${state.bossMana}/${RULES.bossMana}. ${cooldownSummary(state)}. Ultimate ${state.ultimatePrepared ? 'prepared; mana already paid' : 'not prepared'}. ${ended ? state.status : 'Battle in progress.'} ${state.charged ? 'Attack focused.' : 'Attack normal.'}`)}</desc>
  <style>
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
    .raid-army-arrive { opacity: 0; animation: raid-show 180ms linear var(--march-delay) 1 forwards; }
    .raid-army-march { animation: raid-army-march 1400ms steps(3,end) var(--march-delay) 1 both; }
    .raid-army-front-leg { animation: raid-army-front-leg 1400ms steps(2,end) var(--march-delay) 1 both; }
    .raid-army-back-leg { animation: raid-army-back-leg 1400ms steps(2,end) var(--march-delay) 1 both; }
    .raid-army-edge { opacity: 0; animation: raid-army-edge 1800ms linear var(--weapon-delay) 1 both; }
    .raid-army-command { opacity: 0; animation: raid-army-edge ${seconds(T.assaultDuration)} linear ${seconds(T.enemy)} 1 both; }
    .raid-knight-advance { animation: raid-knight-advance ${seconds(T.knightWalkDuration)} steps(3,end) ${seconds(T.enemy)} 1 both; }
    .raid-halberd-glow { opacity: 0; animation: raid-halberd-glow ${seconds(T.knightDuration)} linear ${seconds(T.enemy)} 1 both; }
    .raid-knight-left-leg { animation: raid-knight-left-leg ${seconds(T.knightWalkDuration)} steps(3,end) ${seconds(T.enemy)} 1 both; }
    .raid-knight-right-leg { animation: raid-knight-right-leg ${seconds(T.knightWalkDuration)} steps(3,end) ${seconds(T.enemy)} 1 both; }
    .raid-shield-advance { animation: raid-shield-advance 650ms steps(3,end) 1 both; }
    .raid-shield-front-foot { animation: raid-shield-front-foot 650ms steps(3,end) 1 both; }
    .raid-shield-back-foot { animation: raid-shield-back-foot 650ms steps(3,end) 1 both; }
    .raid-shield-raise { animation: raid-shield-raise 650ms steps(1,end) 1 both; }
    .raid-shield-block { opacity: 0; animation: raid-shield-block 2.4s linear 1 both; }
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
    @keyframes raid-army-march { 0%,10% { transform: translateX(0); } 40%,50% { transform: translateX(-6px); } 85%,100% { transform: translateX(-12px); } }
    @keyframes raid-army-front-leg { 0%,10%,40%,50%,85%,100% { transform: translate(0,0); } 25% { transform: translate(-2px,-2px); } 65% { transform: translate(1px,0); } }
    @keyframes raid-army-back-leg { 0%,10%,40%,50%,85%,100% { transform: translate(0,0); } 25% { transform: translate(1px,0); } 65% { transform: translate(-2px,-2px); } }
    @keyframes raid-army-edge { 0%,100% { opacity: 0; } 20%,80% { opacity: .9; } }
    @keyframes raid-knight-advance {
      0%,12% { transform: translateX(0); }
      30%,36% { transform: translateX(-8px); }
      54%,100% { transform: translateX(-16px); }
    }
    @keyframes raid-knight-left-leg {
      0%,12%,30%,36%,54%,100% { transform: translate(0,0); }
      20% { transform: translate(-2px,-2px); }
      44% { transform: translate(1px,0); }
    }
    @keyframes raid-knight-right-leg {
      0%,12%,30%,36%,54%,100% { transform: translate(0,0); }
      20% { transform: translate(1px,0); }
      44% { transform: translate(-2px,-2px); }
    }
    @keyframes raid-halberd-glow {
      0%,35%,100% { opacity: 0; }
      45%,86% { opacity: .9; }
    }
    @keyframes raid-frieren-fall { from { opacity: 1; } to { opacity: .55; } }
    @keyframes raid-shield-advance {
      0%,15% { transform: translateX(0); }
      75%,100% { transform: translateX(-10px); }
    }
    @keyframes raid-shield-front-foot {
      0%,15%,75%,100% { transform: translate(0,0); }
      45% { transform: translate(-2px,-2px); }
    }
    @keyframes raid-shield-back-foot {
      0%,15%,100% { transform: translate(0,0); }
      75% { transform: translate(1px,0); }
    }
    @keyframes raid-shield-raise {
      0%,70% { transform: translate(0,0); }
      100% { transform: translate(-1px,-1px); }
    }
    @keyframes raid-shield-block {
      0%,22%,100% { opacity: 0; }
      28%,36% { opacity: .8; }
      45%,85% { opacity: .4; }
    }
    @keyframes raid-aura-fall { from { opacity: 1; } to { opacity: .4; } }
    @media (prefers-reduced-motion: reduce) { .hair-left,.hair-right,.frieren-idle,.blink,.blink-half,.spell-cast,.barrier,.forest-leaves,.forest-light,.forest-pollen,.aura,.aura-idle,.aura-hair,.aura-cape,.aura-pan-left,.aura-pan-right,.aura-blink,.aura-mana,.aura-command { animation: none !important; } .blink,.blink-half,.aura-blink { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .raid-caster,.raid-window,.raid-popup,.raid-before,.raid-after,.raid-settled,.raid-knight-advance,.raid-halberd-glow,.raid-knight-left-leg,.raid-knight-right-leg,.turn-playback .frieren-fallen-body,.turn-playback .aura-fallen-body,.turn-playback .fallen-eyes { animation: none !important; }
      .raid-army-arrive,.raid-army-march,.raid-army-front-leg,.raid-army-back-leg,.raid-army-edge,.raid-army-command { animation: none !important; }
      .raid-shield-advance,.raid-shield-front-foot,.raid-shield-back-foot,.raid-shield-raise,.raid-shield-block { animation: none !important; }
      .raid-window,.raid-popup,.raid-before,.raid-shield-block { opacity: 0; }
      .raid-after,.raid-settled,.fallen-eyes { opacity: 1; }
    }
  </style>
  <g shape-rendering="crispEdges">${background()}
    <g transform="translate(35 90) scale(.8)">
      <g class="${playback && ['attacking','ultimate'].includes(playback.playerPose) ? 'raid-caster' : ''}">${heroArt(pose, { effects: false })}</g>${heroAction}
      <g class="raid-settled">${frierenEffects(state.status === 'victory' ? 'victorious' : state.status === 'active' && state.ultimatePrepared ? 'preparing' : state.status === 'active' && state.charged ? 'charged' : 'ready')}</g>
    </g>
    <g transform="translate(0 28)">${auraArt(auraPose, { effects: false })}${enemyAction}</g>
  </g>
  ${renderHud(state, { text, swap, playback })}
${popups}
${ended ? `<g class="raid-settled" data-battle-result="${state.status}"><rect x="210" y="116" width="220" height="40" rx="4" fill="#101723" opacity=".9"/>${text(320,144,state.status === 'victory' ? 'VICTORY' : 'DEFEAT',24,'#ebbb76','text-anchor="middle"',196)}</g>` : ''}
  <rect x=".5" y=".5" width="639" height="359" rx="12" fill="none" stroke="#364458"/>
</svg>\n`;
  return svg.replace('  <style>', `${lettering.definitions()}\n  <style>`);
}

export function cooldownSummary(state) {
  return `CD · GUARD: ${state.guardCooldown ? `${state.guardCooldown}T` : 'READY'} · ULT: ${state.ultimateCooldown ? `${state.ultimateCooldown}T` : 'READY'}`;
}
export function actionDescription(state, action) {
  return {
    attack: `Attack: 5 - 7 damage, or 14 - 18 focused; ${state.charged ? RULES.chargedCost : RULES.attackCost} mana`,
    guard: `Guard: take at most 1 damage; ${RULES.guardCost} mana; skip one turn before reusing`,
    focus: `Focus: restore ${RULES.chargeRestore} mana and empower the next normal Attack`,
    ultimate: state.ultimatePrepared
      ? `Zoltraak (Cast): ${RULES.ultimateDamage} damage; mana already paid; starts a ${RULES.ultimateCooldown}-turn cooldown`
      : `Zoltraak (Prep): spend ${RULES.ultimateCost} mana now; Aura responds; cast on a later turn`,
  }[action];
}
export function buttonKind(state, action) {
  const kind = action === 'ultimate' && state.ultimatePrepared ? 'ultimate-cast' : action;
  return actionUnavailable(state, action) ? `${kind}-disabled` : kind;
}
export function buttonIcon(action) {
  return action === 'restart' ? null : `${action}.png`;
}
export const BUTTON_ASSETS = [...ACTIONS, ...ACTIONS.map(a => `${a}-disabled`), 'ultimate-cast', 'ultimate-cast-disabled', 'restart'];
export function renderButton(action, iconHref = buttonIcon(action)) {
  const disabled = action.endsWith('-disabled');
  const base = disabled ? action.slice(0, -9) : action;
  const config = {
    attack: ['ATTACK', '#e66870'], guard: ['GUARD', '#82b5d5'], focus: ['FOCUS', '#55d7c3'],
    ultimate: ['ZOLTRAAK', '#d6a8f3', 'PREP'], 'ultimate-cast': ['ZOLTRAAK', '#e5c5ff', 'CAST'], restart: ['PLAY AGAIN', '#ebbb76'],
  }[base];
  if (!config) throw new Error('Unknown button');
  const color = disabled ? '#667285' : config[1];
  const lettering = createLettering();
  if (base === 'restart') {
    const label = lettering.text(48,27,config[0],14,color,'text-anchor="middle"',82);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="44" viewBox="0 0 96 44" role="img" aria-label="PLAY AGAIN"><rect x="1" y="1" width="94" height="42" rx="5" fill="#172234" stroke="${color}"/>${lettering.definitions()}${label}</svg>\n`;
  }
  if (!iconHref) throw new Error(`Missing icon for ${base}`);
  const label = lettering.text(64,115,config[0],18,disabled ? '#9aa5b5' : '#f3e6cb','text-anchor="middle"',112);
  const badge = config[2] ? `<g data-phase-badge="${config[2]}"><path d="M78 6h40v2h2v15h-2v2H78v-2h-2V8h2z" fill="#171c2c" stroke="${color}" shape-rendering="crispEdges"/>${lettering.text(98,20,config[2],12,disabled ? '#9aa5b5' : '#f0deff','text-anchor="middle"',36)}</g>` : '';
  const title = `${config[0]}${config[2] ? ` (${config[2]})` : ''}${disabled ? ' unavailable' : ''}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${xml(title)}" data-action-card="${base}">
<title>${xml(title)}</title><rect x="1" y="1" width="126" height="126" rx="5" fill="#131d2a" stroke="${disabled ? '#435063' : '#897754'}"/>
<path d="M8 3h112" stroke="${color}" opacity=".7"/>
<image href="${xml(iconHref)}" x="18" y="5" width="92" height="92" preserveAspectRatio="xMidYMid meet"/>
${lettering.definitions()}${label}${badge}</svg>\n`;
}

export function issueUrl(state, action, repository = DEFAULT_REPOSITORY) {
  const query = new URLSearchParams({
    title: `raid|${state.encounter}|${state.revision}|${action}`,
    body: `Submit this issue to take one shared turn in Aura the Guillotine. No editing needed.\n\nWait for the result, then return and refresh: https://github.com/${repository}#aura-the-guillotine\n\nEveryone controls Frieren together. If another visitor moves first, refresh and choose again.`,
  });
  return `https://github.com/${repository}/issues/new?${query}`;
}

export function sceneFile(state) {
  return `battle-e${state.encounter}t${state.turn}.svg`;
}

export function renderSection(state, { repository = DEFAULT_REPOSITORY, branch = 'main' } = {}) {
  validateState(state);
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
  const raw = `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(branch)}/game/assets`;
  const buttonFile = action => `${action === 'restart' ? action : buttonKind(state, action)}.svg`;
  const button = (action, alt) => `<a href="${xml(issueUrl(state, action, repository))}"><img src="${raw}/${buttonFile(action)}" width="${action === 'restart' ? '96' : '23%'}" alt="${xml(alt)}"></a>`;
  const active = state.status === 'active';
  const controls = active ? ACTIONS.map(action => {
    const reason = actionUnavailable(state, action);
    return reason ? `<picture><img src="${raw}/${buttonFile(action)}" width="23%" alt="${xml(`${actionDescription(state, action)}. Unavailable: ${reason}`)}"></picture>` : button(action, actionDescription(state, action));
  }).join(' ') : button('restart', 'Play Again: start a new encounter');
  const unavailable = active ? ACTIONS.filter(a => actionUnavailable(state, a)).map(a => `${a}: ${actionUnavailable(state, a)}`).join(' ') : '';
  const outcome = active ? '' : `<p><strong>${state.status === 'victory' ? 'Victory! The forest is safe.' : 'Defeat. Frieren will rise again.'}</strong> Choose Play Again for a fresh encounter.</p>\n`;
  const moves = state.recent.filter(event => event.encounter === state.encounter);
  const history = moves.length ? moves.map(event => {
    const label = event.action === 'restart' ? 'New encounter' : `Turn ${event.turn}`;
    const mention = `@${event.player}`;
    const body = event.summary.startsWith(`${mention} `) ? event.summary : `${mention} ${event.summary}`;
    return `<p><a href="${xml(`https://github.com/${repository}/issues/${event.issue}`)}">${xml(label)}</a> · ${xml(body)}</p>`;
  }).join('\n') : '<p>Starts with the first move.</p>';
  const record = `${state.wins} ${state.wins === 1 ? 'victory' : 'victories'} | ${state.losses} ${state.losses === 1 ? 'defeat' : 'defeats'}`;
  const owner = repository.split('/')[0].toLowerCase();
  const ranked = Object.entries(state.players)
    .filter(([login]) => login.toLowerCase() !== owner)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10);
  const leaderboard = ranked.length
    ? `<table>\n${ranked.map(([login, count], index) => `<tr><td>${index + 1}</td><td>@${xml(login)}</td><td>${count} ${count === 1 ? 'turn' : 'turns'}</td></tr>`).join('\n')}\n</table>`
    : '<p>No visitor turns yet.</p>';
  const still = src => `<picture><img src="${src}" width="64" alt=""></picture>`;
  const ability = (icon, name, effect) => `<tr><td width="72" valign="top">${still(`${raw}/${icon}.png`)}</td><td valign="top"><p><strong>${name}</strong></p><p>${effect}</p></td></tr>`;
  const pattern = (name, first, second) => `<td width="25%" valign="top"><p><strong>${name}</strong></p><p>${first}</p><p>${second}</p></td>`;
  return `${START}
## Aura the Guillotine

**Keep Aura outside the walls.** Frieren faces Aura. Everyone takes a turn. Choose an action, submit the prefilled issue, then return and refresh. GitHub sign-in required.

<picture><img src="https://raw.githubusercontent.com/${repository}/${encodeURIComponent(branch)}/game/assets/${sceneFile(state)}" width="100%" alt="${xml(`Frieren ${state.heroHp}/${RULES.heroHp} HP; Aura ${state.bossHp}/${RULES.bossHp} HP; ${state.status}; ${state.charged ? 'attack focused' : 'attack normal'}; ultimate ${state.ultimatePrepared ? 'prepared' : 'not prepared'}`)}"></picture>

${controls}

<table>
<tr>
<td width="50%" valign="top">
<h3>Encounter</h3>
<p><strong>${String(state.encounter).padStart(3, '0')}</strong> | ${{ active: 'In progress', victory: 'Victory', defeat: 'Defeat' }[state.status]}</p>
<p>${record}</p>
<h3>Starting stats</h3>
<table>
<tr>
<td width="72" valign="middle">${still(`${raw}/frieren-portrait.svg`)}</td>
<td valign="middle"><p><strong>Frieren</strong></p><p>${RULES.heroHp} HP / ${RULES.heroMana} MP</p></td>
<td width="72" valign="middle">${still(`${raw}/aura-portrait.svg`)}</td>
<td valign="middle"><p><strong>Aura</strong></p><p>${RULES.bossHp} HP / ${RULES.bossStartMana}/${RULES.bossMana} MP</p></td>
</tr>
</table>
${unavailable ? `<p>${xml(unavailable)}</p>\n` : ''}${outcome}${state.previousResult ? `<p>Previous result: encounter ${state.previousResult.encounter}, ${state.previousResult.status}, ${state.previousResult.turns} turns.</p>\n` : ''}</td>
<td width="50%" valign="top">
<h3>Recent moves</h3>
${history}
</td>
</tr>
</table>

### Top 10

${leaderboard}

### Ability summary

<table>
${ability('attack', 'Attack', '5 - 7 damage for 10 mana; 14 - 18 for 20 mana when focused. 10% critical chance (×1.5, rounded down).')}
${ability('guard', 'Guard', 'Spend 15 mana to take at most 1 damage. Preserve Focus and ultimate preparation. Take one other turn before guarding again.')}
${ability('focus', 'Focus', 'Restore up to 40 mana and empower the next normal Attack. Mana can be refilled while focused. Focus does not prepare Ultimate.')}
${ability('ultimate', 'Prepare Ult / Cast Ult', 'First spend 80 mana to prepare; Aura responds. On a later turn, cast for 32 fixed damage at no further mana cost. Preparation persists through Attack, Guard, and Focus. Casting preserves Focus and starts a six-turn cooldown. No critical hits.')}
</table>

### Enemy pattern

<p>Aura's next move stays hidden. She reads your last few turns, then chooses. She cannot see the move you play this turn.</p>
<table>
<tr>
${pattern('Attack', '4 damage, or 8 after Focus', 'Costs nothing')}
${pattern('Guard', '15 MP', 'Halves damage taken')}
${pattern('Focus', 'Restores up to 35 MP', 'Next Attack deals 8')}
${pattern('Ultimate', 'Prepare for 30 MP', 'Casts next turn for 10')}
</tr>
</table>
<p>Under 15 MP, she uses Focus. After Prepare, she casts on the next turn. If your Attack is focused or your Ultimate is ready, she Guards when she has the MP. A string of Attacks draws Guard more often.</p>
<p>Her Guard halves the hit, Ultimate included. Land the last blow and she does not strike back. Cooldowns advance only on a move that goes through.</p>
<p>The numbers in this fight are original. Scales of Obedience is coming in a future update. <a href="game/ABILITIES.md">Ability notes</a>.</p>

<details>
<summary>How a shared turn works</summary>

Everyone shares the same hero. Consecutive turns are allowed. Nothing happens while nobody is playing.

Cooldowns do not tick while nobody plays. Invalid actions, stale links, and retries spend no mana and consume no turns. Ultimate and Guard availability belongs to the shared encounter, not individual visitors.

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
