import { FRIEREN_IMAGE } from './frieren-source.mjs';

// Masks use the source image's 1254 × 1254 coordinates. The original image is
// embedded once; clipped copies isolate the twin tails without changing pixels.
const LEFT_HAIR = 'M410 240H548V350H500V395H447V450H428V520H387V583H348V644H300V720H280V795H85V540H190V480H230V420H270V360H330V300H390Z';
const RIGHT_HAIR = 'M779 505H800V527H821V548H843V570H856V608H820L802 588L782 549H779Z';

function closedEyes(half = false) {
  // Cover only the two eye regions. Separate stepped skin patches follow the
  // existing fringe so neither the hair nor the nose moves during a blink.
  const lower = half ? 438 : 480;
  const lid = half ? 431 : 449;
  return `<path d="M612 400h45v21h-45zM593 420h64v${lower - 420}h-64zM716 400h43v21h20v17h-20v${lower - 438}h-43z" fill="#fde4cf"/>
    <path d="M593 420h18v18h-18z" fill="#f9c7af"/>
    <path d="M595 ${lid}h18v8h-18zM613 ${lid + 8}h43v9h-43zM716 ${lid + 8}h41v9h-41zM757 ${lid}h17v8h-17z" fill="#392c36"/>`;
}

function magic(pose) {
  if (pose === 'attacking') return `<g class="spell-cast" data-effect="spell-bolt">
    <path d="M171 47h42v3h15v3h24v3h-24v3h-15v3h-42v-3h-12v-9h12z" fill="#55d7c3" opacity=".3"/>
    <path d="M156 51h63v3h21v3h-21v3h-63z" fill="#c2f4e7"/>
    <path d="M162 54h66v3h-66zM153 42h6v6h-6zM153 63h6v6h-6z" fill="#fff9e7"/>
  </g>`;
  if (pose === 'guarding') return `<g class="barrier" data-effect="magic-barrier">
    <path d="M144 36h18v9h9v12h6v33h-6v12h-9v9h-18v-6h-9V42h9z" fill="#55d7c3" opacity=".12"/>
    <path d="M144 36h18v3h-18zM162 39h3v9h-3zM165 48h6v9h-3v-6h-3zM171 57h3v33h-3zM165 90h6v9h-6v-3h3v-3h-3zM162 99h3v9h-3zM144 108h18v3h-18zM138 42h3v63h-3z" fill="#95e8df"/>
    <path d="M147 60h9v3h-9zM144 63h3v21h-3zM156 63h3v21h-3zM147 84h9v3h-9zM141 72h21v3h-21z" fill="#d4fff1" opacity=".8"/>
  </g>`;
  if (pose === 'charged') return `<g class="aura" data-effect="mana-charge">
    <path d="M12 105h9V63h6v42h-3v12h-9zM111 111h9V63h6v42h-3v12h-9z" fill="#55d7c3" opacity=".24"/>
    <path d="M12 120h15v-3h63v3h15v3H90v3H27v-3H12z" fill="#55d7c3" opacity=".65"/>
    <path d="M9 87h3v9H9zM114 45h3v9h-3zM105 27h9v3h-9zM21 48h3v9h-3zM30 42h6v3h-6z" fill="#c2f4e7"/>
  </g>`;
  if (pose === 'victorious') return `<g class="aura" data-effect="victory-sparkles" fill="#edc75c"><path d="M15 36h3v9h-3zM12 39h9v3h-9zM111 21h3v9h-3zM108 24h9v3h-9zM102 60h3v9h-3zM99 63h9v3h-9z"/></g>`;
  return '';
}

export function frierenArt(pose) {
  const fallen = pose === 'defeated';
  const eyes = fallen
    ? `<g data-eyes="closed">${closedEyes()}</g>`
    : `<g class="blink-half" data-eyes="half">${closedEyes(true)}</g><g class="blink" data-eyes="closed">${closedEyes()}</g>`;
  return `<g data-character="frieren" data-pose="${pose}">
    <defs>
      <image id="frieren-source" width="1254" height="1254" href="${FRIEREN_IMAGE}" image-rendering="pixelated"/>
      <clipPath id="frieren-bounds"><rect x="110" y="240" width="1100" height="840"/></clipPath>
      <clipPath id="frieren-left-hair"><path d="${LEFT_HAIR}"/></clipPath>
      <clipPath id="frieren-right-hair"><path d="${RIGHT_HAIR}"/></clipPath>
      <mask id="frieren-body" maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254" style="mask-type:luminance">
        <rect width="1254" height="1254" fill="white"/>
        <path d="${LEFT_HAIR}" fill="black"/><path d="${RIGHT_HAIR}" fill="black"/>
      </mask>
    </defs>
    ${fallen ? '' : `<g transform="translate(112 ${pose === 'attacking' ? 120 : 138})">${magic(pose)}</g>`}
    <g transform="translate(75 98)" opacity="${fallen ? '.55' : '1'}">
      <g class="${fallen ? 'frieren-fallen' : 'frieren-idle'}">
        <g transform="scale(.16)"><g clip-path="url(#frieren-bounds)">
          <g class="${fallen ? '' : 'hair-left'}"><g clip-path="url(#frieren-left-hair)"><use href="#frieren-source"/></g></g>
          <g class="${fallen ? '' : 'hair-right'}"><g clip-path="url(#frieren-right-hair)"><use href="#frieren-source"/></g></g>
          <use href="#frieren-source" mask="url(#frieren-body)"/>
          ${eyes}
        </g></g>
      </g>
    </g>
  </g>`;
}
