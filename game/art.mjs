import { FOREST_SHAPES, FOREST_LEAVES } from './forest-source.mjs';
import { frierenArt } from './frieren.mjs';
export { frierenEffects } from './frieren.mjs';
export { auraArt, auraEffects } from './aura.mjs';

export const xml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

export function heroArt(pose, options) {
  return frierenArt(pose, options);
}

export function background() {
  return `<rect width="640" height="360" rx="12" fill="#101723"/>
    <defs>
      <clipPath id="forest-bounds"><path d="M0 0h640v360H0z"/></clipPath>
      <filter id="forest-tone" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values=".5"/></filter>
    </defs>
    <g clip-path="url(#forest-bounds)" data-background="forest-clearing">
      <g transform="scale(2)" filter="url(#forest-tone)">
        ${FOREST_SHAPES}
        <g class="forest-leaves">${FOREST_LEAVES}</g>
        <g class="forest-light" fill="#fff1b5" opacity=".08">
          <path d="M180 0h12l-36 140h-2v8h-3v10h-13v-10h2v-10h3zM234 0h6l-23 119h-2v9h-7v-8h2z"/>
        </g>
        <g class="forest-pollen" fill="#fff4ce" opacity=".65">
          <path d="M57 94h1v1h-1zM126 88h1v1h-1zM175 122h1v1h-1zM210 91h1v1h-1zM283 109h1v1h-1z"/>
        </g>
        <g class="forest-pollen forest-pollen-late" fill="#e4efba" opacity=".5">
          <path d="M37 120h1v1h-1zM144 104h1v1h-1zM192 73h1v1h-1zM257 125h1v1h-1z"/>
        </g>
      </g>
      <path d="M0 0h640v360H0z" fill="#101923" opacity=".38" data-effect="background-dimming"/>
    </g>
    <g fill="#122b31" opacity=".35" data-effect="ground-shadows">
      <path d="M133 303h10v-3h61v3h10v4h-10v3h-61v-3h-10zM445 301h12v-3h59v3h20v4h-20v3h-59v-3h-12z"/>
    </g>`;
}
