// The server people's studios meet at to work on a deck together. Each room
// is a deck; a studio listens to its room on a stream of events and posts
// what its person changes. Everything is under /collab, so that it can share
// an address with the application it works for.
//
//   POST /collab/rooms                      { name, deck } → { room }  (starts sharing a deck)
//   GET  /collab/rooms/<id>/events?name=…&ticket=…&protocol=1   the stream: hello, op, presence, leave
//   POST /collab/rooms/<id>/changes         { client, key, seq, changes }
//   POST /collab/rooms/<id>/presence        { client, key, sel, name? }
//   POST /collab/rooms/<id>/leave           { client, key }

import { randomBytes } from 'node:crypto';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import { type ChangesPost, type CreatePost, type LeavePost, PREFIX, PROTOCOL, type PresencePost, decode, encode } from './protocol';
import { type CollabEvent, Room } from './room';
import type { RoomStorage } from './storage';

export { storedRooms } from './storage';
export type { CollabEvent } from './room';

export interface CollabServerOptions {
  storage: RoomStorage;
  port?: number;
  host?: string;
  /** Asked of whoever starts sharing a deck (`?token=`), when given: without it anyone who reaches the server can. */
  token?: string;
  /** Milliseconds after the changes stop that a deck is given to the storage; 5 s. */
  saveAfter?: number;
  /** And at least this often while they go on; 30 s. */
  saveEvery?: number;
  /** Told what happens in the rooms; written to stderr when left out. */
  onEvent?: (event: CollabEvent) => void;
}

export interface CollabServer {
  /** Answers a request under /collab, inside a server of the application's: Express, Nest, Node's own. */
  handle(request: IncomingMessage, response: ServerResponse): void;
  /** Once it listens on `port`, when it was given one. */
  readonly ready: Promise<void>;
  readonly port: number;
  /** The rooms open now, and who is in each. */
  rooms(): { id: string; name: string; people: string[] }[];
  /** The decks of the rooms given to the storage now. */
  flush(): Promise<void>;
  close(): void;
}

/** Most a request may carry: a deck with its pictures in it. */
const LIMIT = 64 * 1024 * 1024;

function body(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > LIMIT) {
        reject(new Error('too big'));
        request.destroy();
      } else chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

export function createCollabServer(options: CollabServerOptions): CollabServer {
  const rooms = new Map<string, Room>();
  /** Rooms being loaded, so that two people opening one at once get the same. */
  const loading = new Map<string, Promise<Room | undefined>>();
  const emit = options.onEvent ?? ((event: CollabEvent) => event.type === 'error' && console.error(`[collab] ${event.room}: ${event.what}: ${event.error.message}`));
  const roomOptions = {
    storage: options.storage,
    saveAfter: options.saveAfter ?? 5000,
    saveEvery: options.saveEvery ?? 30000,
    emit,
    forget: (room: Room) => rooms.get(room.id) === room && rooms.delete(room.id),
  };

  const open = (id: string): Promise<Room | undefined> => {
    const there = rooms.get(id);
    if (there) return Promise.resolve(there);
    let pending = loading.get(id);
    if (!pending) {
      pending = options.storage
        .load(id)
        .then((kept) => {
          if (!kept) return undefined;
          const room = rooms.get(id) ?? new Room(id, kept, roomOptions);
          rooms.set(id, room);
          return room;
        })
        .finally(() => loading.delete(id));
      loading.set(id, pending);
    }
    return pending;
  };

  const reply = (response: ServerResponse, status: number, data: unknown) => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(encode(data));
  };

  async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://collab');
    const path = url.pathname.startsWith(PREFIX) ? url.pathname.slice(PREFIX.length) : url.pathname;
    response.setHeader('access-control-allow-origin', '*');
    response.setHeader('access-control-allow-headers', 'content-type');
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }

    if (path === '/rooms' && request.method === 'POST') {
      if (!options.storage.creates) return reply(response, 403, { error: 'Rooms are made by the system this server works for.' });
      if (options.token && url.searchParams.get('token') !== options.token) return reply(response, 403, { error: 'A token is needed to share a deck here.' });
      const post = decode<CreatePost>(await body(request));
      if (!post?.deck || !Array.isArray(post.deck.slides)) return reply(response, 400, { error: 'No deck.' });
      const id = randomBytes(9).toString('base64url');
      const kept = { deck: post.deck, name: String(post.name ?? post.deck.title).slice(0, 120) };
      await options.storage.save(id, kept);
      rooms.set(id, new Room(id, kept, roomOptions));
      return reply(response, 200, { room: id });
    }

    const match = /^\/rooms\/([\w-]+)\/(events|changes|presence|leave)$/.exec(path);
    if (!match) return reply(response, 404, { error: 'Nothing here.' });
    const [, id, what] = match;

    if (what === 'events' && request.method === 'GET') {
      if (Number(url.searchParams.get('protocol') ?? 1) !== PROTOCOL) return reply(response, 426, { error: 'outdated' });
      const ticket = url.searchParams.get('ticket') ?? undefined;
      const room = await open(id);
      if (!room) return reply(response, 404, { error: 'not-found' });
      const pass = options.storage.access ? await options.storage.access(id, ticket) : {};
      if (!pass) return reply(response, 403, { error: 'denied' });
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      // A line now and then, so that nothing between closes a stream that is quiet.
      const beat = setInterval(() => response.write(': beat\n\n'), 25000);
      const client = room.join({ write: (text) => response.write(text), end: () => response.end() }, pass, url.searchParams.get('name') ?? undefined);
      request.on('close', () => {
        clearInterval(beat);
        room.leave(client.id);
      });
      return;
    }

    if (request.method !== 'POST') return reply(response, 405, { error: 'POST' });
    const room = rooms.get(id);
    if (!room) return reply(response, 404, { error: 'not-found' });
    if (what === 'changes') {
      const post = decode<ChangesPost>(await body(request));
      return room.changes(post) ? reply(response, 200, { rev: room.rev }) : reply(response, 403, { error: 'denied' });
    }
    if (what === 'presence') {
      const post = decode<PresencePost>(await body(request));
      return room.presence(post.client, post.key, post.sel, post.name) ? reply(response, 200, {}) : reply(response, 403, { error: 'denied' });
    }
    const post = decode<LeavePost>(await body(request));
    room.leave(post.client, post.key);
    return reply(response, 200, {});
  }

  const handle = (request: IncomingMessage, response: ServerResponse) => {
    route(request, response).catch((error: Error) => {
      emit({ type: 'error', room: '-', what: 'request', error });
      if (!response.headersSent) reply(response, 500, { error: 'The server could not do it.' });
      else response.end();
    });
  };

  let server: Server | undefined;
  let port = 0;
  const ready =
    options.port === undefined
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) => {
          server = createServer(handle);
          server.once('error', reject);
          server.listen(options.port, options.host ?? '127.0.0.1', () => {
            const address = server?.address();
            port = typeof address === 'object' && address ? address.port : (options.port ?? 0);
            resolve();
          });
        });

  return {
    handle,
    ready,
    get port() {
      return port;
    },
    rooms: () => [...rooms.values()].map((room) => ({ id: room.id, name: room.name, people: room.people })),
    flush: async () => {
      await Promise.all([...rooms.values()].map((room) => room.save()));
    },
    close() {
      for (const room of rooms.values()) room.close();
      rooms.clear();
      server?.closeAllConnections?.();
      server?.close();
    },
  };
}
