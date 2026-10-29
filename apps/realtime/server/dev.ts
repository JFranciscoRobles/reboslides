// The backend as this demo runs it, and the collaboration server beside it, in
// one process. Apart, they would be the pages, your backend, and
// `reboslides-collab --backend http://…/backend/decks --backend-key …`.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { type CollabServer, createCollabServer } from '@reboslides/collab/server';
import { backendStorage } from '@reboslides/collab/storage';
import { createBackend, createTickets } from './backend';

const collabPort = Number(process.env.COLLAB_PORT ?? 7433);
let rooms: CollabServer | undefined;

export const backend: (request: IncomingMessage, response: ServerResponse) => Promise<boolean> = createBackend({
  dir: resolve(process.env.DECKS_DIR ?? 'decks'),
  key: process.env.COLLAB_BACKEND_KEY!,
  tickets: createTickets(process.env.TICKET_SECRET!),
  collabUrl: (host) => `http://${host}:${collabPort}`,
  inRoom: (room) => rooms?.rooms().find((open) => open.id === room)?.people ?? [],
});

/** The collaboration server, asking the backend at `backendUrl` for the decks and for who may come in. */
export function startCollab(backendUrl: string): CollabServer {
  rooms = createCollabServer({
    port: collabPort,
    host: process.env.COLLAB_HOST,
    storage: backendStorage({ url: backendUrl, key: process.env.COLLAB_BACKEND_KEY }),
    saveAfter: 2000,
    onEvent: (event) => {
      if (event.type === 'join') console.log(`[collab] ${event.name} entró a ${event.room}${event.readOnly ? ', a mirar' : ''}`);
      else if (event.type === 'leave') console.log(`[collab] ${event.name} salió de ${event.room}`);
      else if (event.type === 'error') console.error(`[collab] ${event.room}: ${event.what}: ${event.error.message}`);
    },
  });
  return rooms;
}
