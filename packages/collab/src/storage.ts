// Where the decks of the rooms are kept, and who may come into them. The
// server asks a storage for a room's deck when someone opens it and nobody is
// in, gives it back a while after the changes stop, and asks it whether each
// person may come in. Three come with it: memory, a folder of .reboslides
// files, and the system the server works for, over HTTP.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Deck, FILE_EXTENSION, parseDeck, serializeDeck } from '@reboslides/core';

/** What the storage says of someone: what they are called, and whether they only watch. Nothing for no. */
export type Pass = { name?: string; readOnly?: boolean } | undefined;

export interface Kept {
  deck: Deck;
  /** The name it was shared under. */
  name: string;
}

export interface RoomStorage {
  /** The deck of a room; nothing when there is no such room. */
  load(room: string): Promise<Kept | undefined>;
  save(room: string, kept: Kept): Promise<void>;
  /** Whether rooms may be made here by the studios: false when the system makes them. */
  readonly creates: boolean;
  /** Who may come into a room with `ticket`; everybody, as editors, when left out. */
  access?(room: string, ticket: string | undefined): Promise<Pass>;
}

/** Rooms kept while the server runs, and gone with it. */
export function memoryStorage(): RoomStorage {
  const rooms = new Map<string, Kept>();
  return {
    creates: true,
    load: async (room) => rooms.get(room),
    save: async (room, kept) => {
      rooms.set(room, kept);
    },
  };
}

const safe = (room: string) => /^[\w-]{1,80}$/.test(room);

/** Each room a file `<room>.reboslides` in `dir`, its name the title of its deck. */
export function folderStorage(dir: string): RoomStorage {
  mkdirSync(dir, { recursive: true });
  return {
    creates: true,
    async load(room) {
      if (!safe(room)) return undefined;
      try {
        const deck = parseDeck(readFileSync(join(dir, `${room}${FILE_EXTENSION}`), 'utf8'));
        return { deck, name: deck.title };
      } catch {
        return undefined;
      }
    },
    async save(room, kept) {
      if (safe(room)) writeFileSync(join(dir, `${room}${FILE_EXTENSION}`), serializeDeck(kept.deck));
    },
  };
}

/** The rooms a folder has. */
export function storedRooms(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith(FILE_EXTENSION))
      .map((name) => name.slice(0, -FILE_EXTENSION.length));
  } catch {
    return [];
  }
}

export interface BackendOptions {
  /** Where the system's three routes are: GET and PUT `<url>/<room>`, POST `<url>/<room>/access`. */
  url: string;
  /** Sent as `Authorization: Bearer <key>`, so that the system knows it is this server asking. */
  key?: string;
  fetch?: typeof fetch;
}

/**
 * The decks kept by the system the server works for, which also says who may
 * come in: the server keeps nothing, and no credentials of the storage reach it.
 */
export function backendStorage(options: BackendOptions): RoomStorage {
  const base = options.url.replace(/\/+$/, '');
  const call = options.fetch ?? fetch;
  const headers = (more: Record<string, string> = {}) => ({ ...more, ...(options.key ? { authorization: `Bearer ${options.key}` } : {}) });
  return {
    creates: false,
    async load(room) {
      const response = await call(`${base}/${encodeURIComponent(room)}`, { headers: headers() });
      if (response.status === 404) return undefined;
      if (!response.ok) throw new Error(`The system said ${response.status} for the deck of ${room}.`);
      const deck = parseDeck(await response.text());
      return { deck, name: decodeURIComponent(response.headers.get('x-reboslides-name') ?? '') || deck.title };
    },
    async save(room, kept) {
      const response = await call(`${base}/${encodeURIComponent(room)}`, { method: 'PUT', headers: headers({ 'content-type': 'application/json' }), body: serializeDeck(kept.deck) });
      if (!response.ok) throw new Error(`The system said ${response.status} when ${room} was saved.`);
    },
    async access(room, ticket) {
      const response = await call(`${base}/${encodeURIComponent(room)}/access`, {
        method: 'POST',
        headers: headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ ticket }),
      });
      if (!response.ok) return undefined;
      return (await response.json()) as Pass;
    },
  };
}
