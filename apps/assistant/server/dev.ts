// The realtime demo's backend and collaboration server, with the assistant
// beside them: one more route, and Claude as one more person in each room.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { type CollabServer, createCollabServer } from '@reboslides/collab/server';
import { backendStorage } from '@reboslides/collab/storage';
import { createBackend, createTickets } from '../../realtime/server/backend';
import { createAssistant } from './assistant';

const collabPort = Number(process.env.COLLAB_PORT ?? 7434);
const tickets = createTickets(process.env.TICKET_SECRET!);
let rooms: CollabServer | undefined;

const decks = createBackend({
  dir: resolve(process.env.DECKS_DIR ?? 'decks'),
  key: process.env.COLLAB_BACKEND_KEY!,
  tickets,
  collabUrl: (host) => `http://${host}:${collabPort}`,
  inRoom: (room) => rooms?.rooms().find((open) => open.id === room)?.people ?? [],
});
const assistant = createAssistant({ collabUrl: `http://127.0.0.1:${collabPort}`, ticket: (room, name) => tickets.issue(room, name) });

export async function backend(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  return (await assistant(request, response)) || (await decks(request, response));
}

export function startCollab(backendUrl: string): CollabServer {
  rooms = createCollabServer({
    port: collabPort,
    host: process.env.COLLAB_HOST,
    storage: backendStorage({ url: backendUrl, key: process.env.COLLAB_BACKEND_KEY }),
    saveAfter: 2000,
    onEvent: (event) => {
      if (event.type === 'join') console.log(`[collab] ${event.name} entró a ${event.room}`);
      else if (event.type === 'error') console.error(`[collab] ${event.room}: ${event.what}: ${event.error.message}`);
    },
  });
  return rooms;
}
