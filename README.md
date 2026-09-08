# FNRC single-page site

A standalone project for Fujairah Natural Resources Corporation with its own
voice assistant widget. It shares nothing with the Xposer app — not a package,
not a stylesheet, not a build — so neither can break the other.

## Install

```bash
npm install
```

## Configure

```bash
cp .env.example .env
```

Fill in `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`. These are
read by the token server only. Never give them a `VITE_` prefix — that would
publish the API secret in the browser bundle. `.env` is gitignored.

## Run it

One process, always — the token endpoint lives inside the server that serves
the site, so the LiveKit API secret stays in Node and there is nothing else to
start.

```bash
npm run dev            # http://localhost:5273 — site + /api/token
```

```bash
npm run build          # → dist/
npm start              # http://127.0.0.1:8787 — serves dist/ + /api/token
```

`npm run preview` also serves the token endpoint, if you want Vite's own
preview instead.

`server/token.mjs` holds the minting logic and is mounted three ways: as Vite
dev middleware, as Vite preview middleware, and as a route in
`server/index.mjs`. Move it behind the portal's own auth before shipping, since
the endpoint mints room access to whoever calls it. Set `PORT` to change the
production port, and `CORS_ORIGIN` only if the site is served from a different
origin than the endpoint (by default it is same-origin and sends no CORS
headers). To point the widget at a token endpoint elsewhere entirely, set
`VITE_FNRC_TOKEN_ENDPOINT`.

## The agent contract

Two participant attributes on the LiveKit token, both strings:

| Attribute      | Values                                            | Default |
| -------------- | ------------------------------------------------- | ------- |
| `language`     | `en ar ur hi es fr de pt tr ru zh` or `auto`      | `auto`  |
| `voice_output` | `on` / `off`                                      | `on`    |

Room names are opaque: `fnrc-<uuid>`. Nothing parses them.

`language` is read once, at join — it builds the recogniser, picks the spoken
welcome and locks the reply language. Changing it mid-call does nothing, which
is why the widget asks before connecting and reconnects to switch.

## Data channel

| Direction     | Topic          | Carries          |
| ------------- | -------------- | ---------------- |
| client→agent  | `fnrc-control` | `{ enabled }`    |
| agent→client  | `fnrc-events`  | `voice.state`    |

`report.submitted` and `report.closing` are gone, along with the auto-close and
redirect they drove. The call ends when the caller presses **End call**.

## Not present, by design

Report numbers and passwords, access-token plumbing, the credential read-out,
"track your report" routing, file uploads, the organisation selector, and the
room-name decoder. There is no report and the caller is anonymous, so none of
it has anything to authenticate against.
