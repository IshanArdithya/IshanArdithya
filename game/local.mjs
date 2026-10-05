import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const files = new Map([
  ['/', ['local.html', 'text/html']],
  ['/local-client.mjs', ['local-client.mjs', 'text/javascript']],
  ['/engine.mjs', ['engine.mjs', 'text/javascript']],
  ['/playback.mjs', ['playback.mjs', 'text/javascript']],
  ['/lettering.mjs', ['lettering.mjs', 'text/javascript']],
  ['/font-source.mjs', ['font-source.mjs', 'text/javascript']],
  ['/hud.mjs', ['hud.mjs', 'text/javascript']],
  ['/hud-source.mjs', ['hud-source.mjs', 'text/javascript']],
  ['/render.mjs', ['render.mjs', 'text/javascript']],
  ['/art.mjs', ['art.mjs', 'text/javascript']],
  ['/forest-source.mjs', ['forest-source.mjs', 'text/javascript']],
  ['/frieren.mjs', ['frieren.mjs', 'text/javascript']],
  ['/frieren-source.mjs', ['frieren-source.mjs', 'text/javascript']],
  ['/army.mjs', ['army.mjs', 'text/javascript']],
  ['/sword-knight-source.mjs', ['sword-knight-source.mjs', 'text/javascript']],
  ['/aura.mjs', ['aura.mjs', 'text/javascript']],
  ['/aura-source.mjs', ['aura-source.mjs', 'text/javascript']],
  ['/knight-source.mjs', ['knight-source.mjs', 'text/javascript']],
  ['/shield-knight-source.mjs', ['shield-knight-source.mjs', 'text/javascript']],
]);

// A read-only server. Battles live only in each browser tab, never in repository files.
export function createLocalServer() {
  return createServer(async (request, response) => {
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    const file = files.get(path);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end('Method not allowed'); return;
    }
    if (!file) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const body = await readFile(fileURLToPath(new URL(file[0], import.meta.url)));
      response.writeHead(200, {
        'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(500); response.end('Could not load the local demo');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  const server = createLocalServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Try PORT=4174 node game/local.mjs` : error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log(`Play README Raid locally: http://127.0.0.1:${port}\nEach tab has its own battle. Refresh to reset. No GitHub access or file writes.`));
}
