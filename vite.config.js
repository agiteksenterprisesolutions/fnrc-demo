import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tokenServerPlugin } from './server/token.mjs';

// A standalone project: it shares nothing with the Xposer app — no packages, no
// build, no styles. `npm install` here installs only what this site needs.
export default defineConfig(({ mode }) => {
  // Prefix '' so the un-prefixed LIVEKIT_* secrets are readable here. They are
  // handed to the token plugin, which runs in Node — Vite still refuses to
  // inline anything without a VITE_ prefix into the browser bundle.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };

  return {
    base: '/',
    // The token endpoint lives inside the dev/preview server itself, so there
    // is no second service to start and nothing to proxy to.
    plugins: [react(), tailwindcss(), tokenServerPlugin(env)],
    server: { port: 5273 },
    preview: { port: 5273 },
    build: { outDir: 'dist' },
  };
});
