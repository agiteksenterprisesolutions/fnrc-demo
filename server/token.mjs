// fnrc/server/token.mjs
//
// Mints LiveKit access tokens for the FNRC assistant.
//
// This exists because the LiveKit API secret signs the token, and a secret in
// a Vite bundle is a secret published to every visitor. The browser posts here
// and gets back a short-lived JWT; the secret never leaves the machine.
//
// A LiveKit token is a plain HS256 JWT, so no SDK is needed — the whole thing
// is node:crypto.
//
// This module is transport-agnostic on purpose: `createTokenHandler` returns a
// plain (req, res) function, so the same code runs as Vite dev middleware and
// as the production server's route. There is no separate token service to
// start. In production, move this behind whatever access control the portal
// already uses.
//
//   LIVEKIT_URL=wss://…            required, echoed back to the client
//   LIVEKIT_API_KEY=…              required
//   LIVEKIT_API_SECRET=…           required
import { createHmac, randomUUID } from 'node:crypto';

const TTL_SECONDS = 10 * 60;

const base64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sign = (claims, secret) => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify(claims));
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.${signature}`;
};

/** Attributes are typed map<string,string>, so everything is coerced. */
const normaliseAttributes = (input = {}) => {
  const language = String(input.language ?? 'auto');
  const voice = String(input.voice_output ?? 'on').toLowerCase();
  return {
    language,
    // Anything falsy-sounding means silence; everything else means speech.
    voice_output: ['off', 'false', '0', 'no', 'none', 'text', 'chat', 'mute', 'silent'].includes(
      voice,
    )
      ? 'off'
      : 'on',
  };
};

const readBody = (request) =>
  new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 16_384) reject(new Error('Body too large'));
    });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });

/**
 * Reads the three LiveKit settings out of an env-like object and complains
 * loudly — once, at startup — if any is missing.
 */
export const readLiveKitConfig = (env = process.env) => {
  const config = {
    url: env.LIVEKIT_URL,
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
    corsOrigin: env.CORS_ORIGIN || '',
  };
  config.ready = Boolean(config.url && config.apiKey && config.apiSecret);
  return config;
};

export const mintToken = (config, body = {}) => {
  const identity = body.participant_identity || `caller-${randomUUID()}`;
  const room = body.room_name || `fnrc-${randomUUID()}`;
  const now = Math.floor(Date.now() / 1000);

  const token = sign(
    {
      iss: config.apiKey,
      sub: identity,
      jti: identity,
      nbf: now,
      exp: now + TTL_SECONDS,
      name: body.participant_name || 'Caller',
      // The whole contract with the agent: two strings.
      attributes: normaliseAttributes(body.participant_attributes),
      video: { room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true },
    },
    config.apiSecret,
  );

  return { server_url: config.url, participant_token: token };
};

/**
 * A bare (request, response) handler for POST /api/token. Mount it wherever —
 * Vite's dev middleware stack or the production server both call this.
 */
export const createTokenHandler = (env = process.env) => {
  const config = readLiveKitConfig(env);

  return async (request, response) => {
    // Same-origin by default: the site and this endpoint are one server, so
    // only an explicit CORS_ORIGIN opens it up to another origin.
    if (config.corsOrigin) {
      response.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }

    if (request.method !== 'POST') {
      response.writeHead(405, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    if (!config.ready) {
      console.error(
        'Missing LIVEKIT_URL, LIVEKIT_API_KEY or LIVEKIT_API_SECRET — copy .env.example to .env.',
      );
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Token service not configured' }));
      return;
    }

    try {
      const body = await readBody(request);

      // TODO: this endpoint mints room access — add your own auth check here.

      response.writeHead(201, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(mintToken(config, body)));
    } catch (error) {
      console.error('Token error:', error);
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Bad request' }));
    }
  };
};

/**
 * Vite plugin: serves POST /api/token from the dev server itself, so
 * `npm run dev` is the only process anyone has to start.
 */
export const tokenServerPlugin = (env = process.env) => ({
  name: 'fnrc-token-endpoint',
  configureServer(server) {
    const handler = createTokenHandler(env);
    server.middlewares.use('/api/token', handler);
  },
  configurePreviewServer(server) {
    const handler = createTokenHandler(env);
    server.middlewares.use('/api/token', handler);
  },
});
