// One process: Vite serves the page and hands what is asked of the backend to `server/`.

import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';

function backend(): Plugin {
  return {
    name: 'reboslides-storage-backend',
    configureServer(server) {
      try {
        process.loadEnvFile('.env');
      } catch {
        // No .env: the files go to a folder.
      }
      const load = () => server.ssrLoadModule('/server/dev.ts') as Promise<typeof import('./server/dev')>;
      server.middlewares.use((request, response, next) => {
        load()
          .then(({ backend }) => backend(request, response))
          .then((answered) => answered || next(), next);
      });
      server.httpServer?.once('listening', () => void load().then(({ where }) => server.config.logger.info(`  ➜  Archivos: ${where}`)));
    },
  };
}

export default defineConfig({ plugins: [react(), backend()], server: { port: 5195, strictPort: true } });
