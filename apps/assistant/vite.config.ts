// One process for everything, as in apps/realtime: Vite serves the page, hands what is asked of
// the backend to `server/`, and starts the collaboration server beside them.

import { randomBytes } from 'node:crypto';
import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';
import type { CollabServer } from '@reboslides/collab/server';

const PORT = 5193;

function backend(): Plugin {
  return {
    name: 'reboslides-assistant-backend',
    configureServer(server) {
      try {
        process.loadEnvFile('.env');
      } catch {
        // No .env: the chat says the key is missing, and the rest works.
      }
      // What the collaboration server shows the backend, and what signs the tickets: made here when not given.
      process.env.COLLAB_BACKEND_KEY ||= randomBytes(24).toString('base64url');
      process.env.TICKET_SECRET ||= randomBytes(24).toString('base64url');
      // Loaded through Vite, which reads TypeScript and takes the packages from their source.
      const load = () => server.ssrLoadModule('/server/dev.ts') as Promise<typeof import('./server/dev')>;
      server.middlewares.use((request, response, next) => {
        load()
          .then(({ backend }) => backend(request, response))
          .then((answered) => answered || next(), next);
      });
      let rooms: CollabServer | undefined;
      server.httpServer?.once('listening', () => {
        load().then(({ startCollab }) => {
          rooms = startCollab(`http://localhost:${PORT}/backend/decks`);
          rooms.ready.then(
            () => server.config.logger.info(`  ➜  Salas:   http://localhost:${rooms?.port}/ (el servidor de colaboración)`),
            (error: Error) => server.config.logger.error(`El servidor de colaboración no arrancó: ${error.message}`),
          );
        });
      });
      server.httpServer?.once('close', () => rooms?.close());
    },
  };
}

export default defineConfig({ plugins: [react(), backend()], server: { port: PORT, strictPort: true } });
