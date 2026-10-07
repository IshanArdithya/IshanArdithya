import { FONT } from './font-source.mjs';

const xml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const number = value => Number(value.toFixed(3));
const glyphId = char => `letter-${char.codePointAt(0).toString(16)}`;
const digitWidth = Math.max(...'0123456789'.split('').map(char => FONT.glyphs[char].advance));

export function createLettering() {
  const used = new Set();
  function text(x, y, value, size = 24, color = '#f3e6cb', extra = '', maxWidth = Infinity) {
    const label = String(value);
    const chars = [...label];
    const scale = size * .76 / FONT.capHeight;
    const spacing = Number(extra.match(/letter-spacing="([\d.]+)"/)?.[1] ?? .45);
    const anchor = extra.match(/text-anchor="(start|middle|end)"/)?.[1] ?? 'start';
    const attributes = extra.replace(/(?:text-anchor|letter-spacing)="[^"]*"/g, '').trim();
    let cursor = 0;
    const positions = chars.map((char, index) => {
      const glyph = FONT.glyphs[char];
      if (!glyph) throw new Error(`Unsupported lettering character: ${char}`);
      const digit = /[0-9]/.test(char);
      if (index && !digit && !/[0-9]/.test(chars[index-1])) cursor += (FONT.kerning[chars[index-1]+char] || 0) * scale;
      const at = cursor + (digit ? (digitWidth-glyph.advance)*scale/2 : 0);
      cursor += (digit ? digitWidth : glyph.advance)*scale + (index < chars.length-1 ? spacing : 0);
      used.add(char);
      return {char, at};
    });
    const fit = Math.min(1, maxWidth / (cursor || 1));
    const width = cursor * fit;
    const start = x - (anchor === 'end' ? width : anchor === 'middle' ? width/2 : 0);
    const paths = positions.map(({char,at}) => `<use href="#${glyphId(char)}" transform="translate(${number(at)} 0) scale(${Number(scale.toFixed(6))} ${Number((-scale).toFixed(6))})"/>`).join('');
    return `<g role="img" aria-label="${xml(label)}" data-lettering="${xml(label)}" fill="${color}" shape-rendering="geometricPrecision" ${attributes}><title>${xml(label)}</title><g aria-hidden="true" transform="translate(${number(start)} ${y}) scale(${number(fit)} 1)">${paths}</g></g>`;
  }
  function definitions() {
    return `<defs data-font="${FONT.name}">${[...used].sort().map(char => `<path id="${glyphId(char)}" d="${FONT.glyphs[char].path}" vector-effect="non-scaling-stroke"/>`).join('')}</defs>`;
  }
  return { text, definitions };
}
