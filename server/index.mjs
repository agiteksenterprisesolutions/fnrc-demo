// fnrc/server/index.mjs
//
// The production process: one server that serves the built site out of dist/
// and mints LiveKit tokens at POST /api/token. Same origin, one port, nothing
// else to start.
//
//   node --env-file=.env server/index.mjs      (after `npm run build`)
//
//   PORT=8080                      optional
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTokenHandler, readLiveKitConfig } from './token.mjs';

const PORT = Number(process.env.PORT || 8787);
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const handleToken = createTokenHandler(process.env);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/** Resolves a URL path to a file inside dist/, or null if it escapes or misses. */
const resolveAsset = (pathname) => {
  // normalize() collapses any ../ before it can climb out of dist/.
  const candidate = join(DIST, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!candidate.startsWith(DIST)) return null;
  if (!existsSync(candidate) || !statSync(candidate).isFile()) return null;
  return candidate;
};

const server = createServer((request, response) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (pathname === '/api/token') {
    handleToken(request, response);
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Hashed build assets are immutable; index.html must never be cached, or a
  // deploy leaves browsers pointing at asset names that no longer exist.
  const file = resolveAsset(pathname) ?? resolveAsset('/index.html');
  if (!file) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found — run `npm run build` first.');
    return;
  }

  response.writeHead(200, {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': file.startsWith(join(DIST, 'assets'))
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
});

if (!readLiveKitConfig().ready) {
  console.warn(
    'Warning: LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET are not set — ' +
      'the site will serve, but /api/token will fail.',
  );
}

server.listen(PORT, () => {
  console.log(`FNRC portal on http://127.0.0.1:${PORT}  (token at /api/token)`);
});
