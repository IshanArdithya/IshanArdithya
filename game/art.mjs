import { frierenArt } from './frieren.mjs';
export { auraArt } from './aura.mjs';

export const xml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

export function heroArt(pose) {
  return frierenArt(pose);
}

export function background() {
  return `<rect width="640" height="360" rx="12" fill="#101723"/>
    <path d="M1 119h638v160H1z" fill="#172234"/>
    <g fill="#8294ab" opacity=".55"><path d="M66 144h3v3h-3zM220 132h3v3h-3zM574 158h3v3h-3zM364 139h3v3h-3zM98 189h3v3h-3zM287 164h3v3h-3z"/></g>
    <path d="M302 127h30v6h12v12h6v24h-6v12h-12v6h-30v-6h-12v-12h-6v-24h6v-12h12z" fill="#ecdfbc"/>
    <path d="M322 127h10v6h12v12h6v24h-6v12h-12v6h-10v-6h9v-12h6v-24h-6v-12h-9z" fill="#c6c5ae"/>
    <path d="M0 237h24v-18h24v-15h24v12h24v-9h24v24h24v-15h24v-15h24v15h24v18h24v-24h24v-12h24v24h24v12h24v-9h24v-15h24v-9h24v12h24v-9h24v18h24v-9h24v12h24v-21h24v-12h24v24h24v9h24v-18h24v15h40v66H0z" fill="#202e41"/>
    <g fill="#29374a"><path d="M272 204h96v7h-96zM278 197h84v7h-84zM287 190h66v7h-66zM297 183h46v7h-46zM306 176h28v7h-28z"/><path d="M287 213h66v46h-66z"/></g>
    <path d="M311 221h18v38h-18z" fill="#172234"/>
    <g fill="#604253"><path d="M245 198h9v69h-9zM386 198h9v69h-9zM230 187h180v9H230zM236 196h168v6H236zM243 209h154v7H243z"/></g>
    <path d="M227 183h186v5H227zM236 201h168v3H236z" fill="#9a6970"/>
    <g fill="#172234"><path d="M37 171h9v93h-9zM22 189h39v9H22zM28 180h27v9H28zM15 207h54v9H15zM568 185h9v84h-9zM554 202h39v9h-39zM560 193h27v9h-27zM548 220h51v9h-51z"/></g>
    <path d="M0 270h640v9H0z" fill="#425064"/><path d="M0 279h640v5H0z" fill="#263345"/>
    <g fill="#1e2939"><path d="M60 273h87v3H60zM247 273h56v3h-56zM325 277h34v3h-34zM486 273h65v3h-65z"/></g>
    <g fill="#0d1520" opacity=".6"><path d="M130 264h87v6h-87zM404 264h132v6H404z"/></g>
    <g fill="#a97551"><path d="M260 222h4v43h-4zM375 222h4v43h-4z"/></g>
    <g class="lantern" fill="#ebbb76"><path d="M256 218h12v15h-12zM371 218h12v15h-12z"/></g>
    <path d="M259 221h6v9h-6zM374 221h6v9h-6z" fill="#fff0c2"/>`;
}
