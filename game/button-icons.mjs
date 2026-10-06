import { readFile } from 'node:fs/promises';

// Build-time inputs only. Published cards contain the vector paths themselves.
export async function loadButtonIcons() {
  const sources = { attack: 'blast', guard: 'defense', focus: 'focus', ultimate: 'prepare', 'ultimate-cast': 'cast' };
  return Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([action, name]) =>
    [action, await readFile(new URL(`./assets/arcane-${name}-pixel.svg`, import.meta.url), 'utf8')])));
}
