import { RULES, actionUnavailable, enemyIntent } from './engine.mjs';
import { HUD_PORTRAITS } from './hud-source.mjs';

const frame = (x,y,w,h,c=4) => `M${x+c} ${y}h${w-2*c}v${c}h${c}v${h-2*c}h-${c}v${c}H${x+c}v-${c}h-${c}V${y+c}h${c}z`;
const center = 'text-anchor="middle"';
const gold = '#c8a76a';
const ivory = '#fff0cb';

// Share the action eligibility rules so the badge never promises an unusable ultimate.
export function ultimateIndicator(state, character = 'frieren') {
  const ready = character === 'aura'
    ? state.status === 'active' && enemyIntent(state).kind === 'assault'
    : !actionUnavailable(state, 'ultimate');
  const label = character === 'aura' ? (ready ? 'ULT READY' : 'ULT NOT READY')
    : state.status !== 'active' ? 'ULT NOT READY'
    : state.ultimateCooldown ? 'ULT COOLDOWN'
    : state.ultimatePrepared ? 'ULT CHARGED'
    : state.heroMana < RULES.ultimateCost ? 'ULT LOW MP' : 'ULT READY';
  return { ready, label };
}

export function renderHud(state, { text, swap, playback }) {
  const portrait = (name,x,accent) => `<g data-hud-portrait="${name}">
    <path d="${frame(x-2,16,64,64,6)}" fill="#070d15"/>
    <path d="${frame(x,18,60,60,4)}" fill="${gold}"/>
    <path d="${frame(x+2,20,56,56,4)}" fill="#5b4c3e"/>
    <path d="${frame(x+4,22,52,52,2)}" fill="#0b1420"/>
    <defs><clipPath id="portrait-${name}"><path d="${frame(x+6,24,48,48,2)}"/></clipPath></defs>
    <g clip-path="url(#portrait-${name})">
      <path d="M${x+6} 24h48v48h-48z" fill="${name==='frieren'?'#14333b':'#342039'}"/>
      <g transform="translate(${x+10} 28) scale(1.25)">${HUD_PORTRAITS[name]}</g>
    </g>
    <path d="M${x+8} 22h44v2h-44z" fill="${ivory}"/>
    <path d="M${x+8} 72h44v2h-44z" fill="${accent}"/>
    ${[x+2,x+52].map(cx=>`<path d="M${cx} 18h6v6h-6zM${cx} 72h6v6h-6z" fill="${ivory}"/><path d="M${cx+2} 20h2v2h-2zM${cx+2} 74h2v2h-2z" fill="#866536"/>`).join('')}
  </g>`;
  const rails = (mirror,accent) => `<g${mirror?' transform="translate(640 0) scale(-1 1)"':''} aria-hidden="true">
    <path d="${frame(86,26,188,54,4)}" fill="#070d16"/>
    <path d="${frame(88,28,184,50,2)}" fill="${gold}"/>
    <path d="${frame(90,30,180,46,2)}" fill="#111b28"/>
    <path d="M92 28h176v2H92zM92 76h176v2H92z" fill="${ivory}"/>
    <path d="${frame(90,4,144,20,4)}" fill="#070f1b"/>
    <path d="M94 4h132v2H94z" fill="${gold}"/>
    <path d="M96 22h132v2H96z" fill="${accent}"/>
  </g>`;
  const meter = (key,x,y,max,unit,reverse=false) => {
    const id = `hud-meter-${key}`;
    const colors = unit==='HP' ? ['#25865b','#83e9a5','#175539'] : ['#2874b6','#8ad9f4','#234b80'];
    const fill = value => {
      const width = Math.round(174*Math.max(0,Math.min(1,value/max)));
      const start = reverse ? x+176-width : x+2;
      return `<g role="progressbar" aria-label="${key.startsWith('hero')?'Frieren':'Aura'} ${unit}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}" data-hud-meter="${key}">
        <g clip-path="url(#${id})">
          <rect data-hud-fill="${key}" x="${start}" y="${y+2}" width="${width}" height="16" fill="${colors[0]}"/>
          ${width ? `<path d="M${start} ${y+3}h${width}v3h-${width}z" fill="${colors[1]}"/><path d="M${start} ${y+15}h${width}v3h-${width}z" fill="${colors[2]}"/>` : ''}
        </g>
        ${text(x+89,y+17,`${value}/${max} ${unit}`,14,ivory,`${center} stroke="#09141f" stroke-width="1.5" paint-order="stroke"`,150)}
      </g>`;
    };
    return `<path d="${frame(x-2,y-2,182,24)}" fill="#060d17"/>
      <path d="${frame(x,y,178,20,2)}" fill="#778084"/>
      <path d="${frame(x+2,y+2,174,16,2)}" fill="#0c1724"/>
      <defs><clipPath id="${id}"><path d="${frame(x+2,y+2,174,16,2)}"/></clipPath></defs>
      ${swap(key,state[key],fill)}`;
  };
  const emblem = ({ready,label}, character) => {
    const prepared = label === 'ULT CHARGED';
    const isAura = character === 'aura';
    const name = isAura ? 'Aura' : 'Frieren';
    const trim = prepared ? '#cba0fa' : ready ? '#e4bd74' : '#646e7d';
    const shine = ready ? '#fff0bd' : '#8993a1';
    return `<g data-ultimate-ready="${ready}" data-character="${character}" role="img" aria-label="${name}: ${label}">
      <title>${isAura
        ? (ready ? 'Aura: Army Assault is next and has enough mana.' : 'Aura: Army Assault not ready. Requires the Assault turn, 30 MP, and a completed turn.')
        : (prepared ? 'Frieren: Ultimate charged. Cast it for no additional mana.' : ready ? 'Frieren: Ready to prepare Ultimate for 80 MP. Aura will respond.' : 'Frieren: Ultimate unavailable until cooldown ends and 80 MP is available, or while this turn resolves.')}</title>
      <path d="${frame(isAura?376:88,82,176,26,2)}" fill="#08111c"/>
      <g transform="translate(${isAura?525:91} 84)" aria-hidden="true">
        <path d="M10 0h4v4h4v4h4v6h-4v4h-4v4h-4v-4H6v-4H2V8h4V4h4z" fill="${trim}"/>
        <path d="M10 3h4v4h3v3h3v2h-3v3h-3v4h-4v-4H7v-3H4v-2h3V7h3z" fill="${ready?(isAura?'#963961':'#71366f'):'#293340'}"/>
        <path d="M11 5h2v5h4v2h-4v5h-2v-5H7v-2h4z" fill="${shine}"/>
        ${prepared?'<path d="M10 9h4v4h-4z" fill="#ffffff"/>':''}
        ${ready?'<path d="M0 2h2v2H0zM22 18h2v2h-2z" fill="#ffe7a0"/>':''}
      </g>
      ${text(isAura?518:122,101,label,12,ready?ivory:'#919ba8',`${isAura?'text-anchor="end" ':''}letter-spacing=".5"`,132)}
    </g>`;
  };
  const badge = character => {
    const indicator = ultimateIndicator(state, character);
    // Both badges settle after playback; pending actions should not look usable.
    return `<g data-hud="ultimate-badge" data-character="${character}">${indicator.ready && playback
      ? `<g class="raid-before" style="animation-delay:${playback.duration/1000}s">${emblem({ready:false,label:'ULT NOT READY'},character)}</g><g class="raid-after" style="animation-delay:${playback.duration/1000}s">${emblem(indicator,character)}</g>`
      : emblem(indicator,character)}</g>`;
  };
  return `<g data-hud="pixel-fighter" shape-rendering="crispEdges">
    ${rails(false,'#50cbd1')}${rails(true,'#db73b6')}
    ${portrait('frieren',12,'#50cbd1')}${portrait('aura',568,'#db73b6')}
    ${text(98,20,'FRIEREN',14,ivory,'letter-spacing="1"',118)}
    ${text(542,20,'AURA',14,ivory,'text-anchor="end" letter-spacing="1"',118)}
    ${meter('heroHp',90,30,RULES.heroHp,'HP')}
    ${meter('heroMana',90,56,RULES.heroMana,'MP')}
    ${meter('bossHp',372,30,RULES.bossHp,'HP',true)}
    ${meter('bossMana',372,56,RULES.bossMana,'MP',true)}
    <g data-hud="turn-counter">
      <path d="${frame(286,14,68,68,10)}" fill="#060c16"/>
      <path d="${frame(288,16,64,64,8)}" fill="${gold}"/>
      <path d="${frame(290,18,60,60,6)}" fill="#554936"/>
      <path d="${frame(292,20,56,56,4)}" fill="#111b29"/>
      <path d="M302 20h36v2h-36zM302 54h36v2h-36z" fill="#665c4a"/>
      <path d="M289 46h3v4h-3z" fill="#50cbd1"/>
      <path d="M348 46h3v4h-3z" fill="#db73b6"/>
      ${text(320,49,String(state.turn),26,'#ffe0a0',center,44)}
      ${text(320,69,'TURNS',12,ivory,center,46)}
    </g>
    ${badge('frieren')}${badge('aura')}
  </g>`.replace(/[ \t]+\n/g, '\n');
}
