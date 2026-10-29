// Runs the server people's studios meet at to work on a deck together.
//
//   reboslides-collab [--port 7430] [--host 0.0.0.0] [--token word]
//                     [--data folder | --memory | --backend https://… --backend-key key]
//                     [--save-after 5] [--save-every 30]
//
// The decks are kept in a folder (--data, `rooms` when nothing is said),
// nowhere (--memory), or by the system the server works for (--backend),
// which is then also the one to say who may edit each of them.

import { networkInterfaces } from 'node:os';
import { DEFAULT_COLLAB_PORT } from './protocol';
import { createCollabServer } from './server';
import { backendStorage, folderStorage, memoryStorage, storedRooms } from './storage';

const args = process.argv.slice(2);
const value = (name: string): string | undefined => {
  const at = args.indexOf(name);
  return at < 0 ? undefined : args.splice(at, 2)[1];
};
const has = (name: string) => {
  const at = args.indexOf(name);
  if (at >= 0) args.splice(at, 1);
  return at >= 0;
};

const port = Number(value('--port') ?? process.env.REBOSLIDES_COLLAB_PORT ?? DEFAULT_COLLAB_PORT);
const host = value('--host');
const memory = has('--memory');
const backend = value('--backend') ?? process.env.REBOSLIDES_COLLAB_BACKEND;
const backendKey = value('--backend-key') ?? process.env.REBOSLIDES_COLLAB_BACKEND_KEY;
const saveAfter = Number(value('--save-after') ?? 5);
const saveEvery = Number(value('--save-every') ?? 30);
const dataDir = value('--data') ?? (memory || backend ? undefined : 'rooms');
const token = value('--token') ?? process.env.REBOSLIDES_COLLAB_TOKEN;
if (args.length || !Number.isInteger(port) || port < 0 || port > 65535 || !(saveAfter >= 1) || !(saveEvery >= 1) || [memory, !!backend, !!dataDir].filter(Boolean).length !== 1) {
  console.error('Uso: reboslides-collab [--port 7430] [--host 0.0.0.0] [--token palabra] [--data carpeta | --memory | --backend https://… --backend-key clave] [--save-after 5] [--save-every 30]');
  process.exit(2);
}

const storage = backend ? backendStorage({ url: backend, key: backendKey }) : dataDir ? folderStorage(dataDir) : memoryStorage();
const where = backend ? `presentaciones en ${backend}, nada guardado aquí` : dataDir ? `salas guardadas en ${dataDir}: ${storedRooms(dataDir).length}` : 'salas solo en memoria';
const server = createCollabServer({ port, host, storage, token, saveAfter: saveAfter * 1000, saveEvery: saveEvery * 1000 });
server.ready.then(
  () => {
    console.error(`[collab] Escuchando en http://${host ?? '127.0.0.1'}:${server.port} · ${where}`);
    if (host && !/^(127\.|localhost$|::1$)/.test(host)) {
      for (const a of Object.values(networkInterfaces()).flatMap((list) => list ?? [])) {
        if (a.family === 'IPv4' && !a.internal) console.error(`[collab] En la red: http://${a.address}:${server.port}`);
      }
      if (!token && !backend) console.error('[collab] Sin --token, cualquiera que llegue a esta dirección puede compartir presentaciones aquí.');
    } else console.error('[collab] Solo esta máquina puede conectarse. Para que otros puedan: --host 0.0.0.0');
  },
  (error: Error) => {
    console.error(`[collab] No se pudo escuchar en el puerto ${port}: ${error.message}`);
    process.exit(1);
  },
);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    // Lo que el almacenamiento aún no tiene de las presentaciones va a él antes de salir.
    void server.flush().finally(() => {
      server.close();
      process.exit(0);
    });
  });
}
