// The backend of an application of your own, as small as it can be: it keeps
// the decks in a folder, answers the page, and answers the collaboration
// server, which keeps nothing and asks here. So the decks stay behind one
// door, this one.
//
// For the page:
//   GET  /api/decks                  the decks, and who is in the room of each now
//   POST /api/decks   { title }      a new one, from a theme
//   POST /api/room    { room, name } where the room of a deck is, and a ticket into it
//
// For the collaboration server, which shows a key:
//   GET  /backend/decks/<room>          the deck, as its .reboslides file
//   PUT  /backend/decks/<room>          the deck as it is now, to keep
//   POST /backend/decks/<room>/access   { "ticket": "…" } → { "name": "…" }, or 403
//
// The ticket is where an application decides who may edit what: it knows who
// is signed in. Here anyone may, under the name they give.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { FILE_EXTENSION, THEMES, parseDeck, serializeDeck, themedDeck } from '@reboslides/core';

export interface Tickets {
  issue(room: string, name: string): string;
  /** The name the ticket was given for, when it is for this room, untouched and not too old. */
  check(room: string, ticket: string): string | undefined;
}

/** Tickets signed with a secret only the backend has: nothing is kept to check one. */
export function createTickets(secret: string, life = 8 * 60 * 60 * 1000): Tickets {
  const sign = (payload: string) => createHmac('sha256', secret).update(payload).digest('base64url');
  return {
    issue(room, name) {
      const payload = Buffer.from(JSON.stringify({ room, name, until: Date.now() + life })).toString('base64url');
      return `${payload}.${sign(payload)}`;
    },
    check(room, ticket) {
      const [payload, signature = ''] = ticket.split('.');
      const expected = Buffer.from(sign(payload));
      const given = Buffer.from(signature);
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;
      try {
        const said = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { room?: unknown; name?: unknown; until?: unknown };
        return said.room === room && typeof said.name === 'string' && typeof said.until === 'number' && said.until > Date.now() ? said.name : undefined;
      } catch {
        return undefined;
      }
    },
  };
}

export interface BackendOptions {
  /** The folder the decks are in, each `<room>.reboslides`. */
  dir: string;
  /** What the collaboration server shows, as `Authorization: Bearer …`. */
  key: string;
  tickets: Tickets;
  /** Where the collaboration server is, for a browser that reached this backend at `host`. */
  collabUrl: (host: string) => string;
  /** Who is in each room now, by the collaboration server. */
  inRoom?: (room: string) => string[];
}

const ROOM = /^[\w-]{1,80}$/;

async function body(request: IncomingMessage, most = 64 * 1024 * 1024): Promise<string> {
  const parts: Buffer[] = [];
  let size = 0;
  for await (const part of request) {
    size += (part as Buffer).length;
    if (size > most) throw new Error('Too much to read.');
    parts.push(part as Buffer);
  }
  return Buffer.concat(parts).toString('utf8');
}

const send = (response: ServerResponse, status: number, data: unknown, headers: Record<string, string> = {}) => {
  response.writeHead(status, { 'content-type': 'application/json', ...headers });
  response.end(typeof data === 'string' ? data : JSON.stringify(data));
};

/** A name for a file from a title: its letters, without accents, and a number when it is taken. */
function roomFor(dir: string, title: string): string {
  const base =
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'presentacion';
  let room = base;
  for (let n = 2; existsSync(join(dir, `${room}${FILE_EXTENSION}`)); n++) room = `${base}-${n}`;
  return room;
}

/** Answers the page and the collaboration server; false for any other request. */
export function createBackend(options: BackendOptions): (request: IncomingMessage, response: ServerResponse) => Promise<boolean> {
  const { dir, key, tickets } = options;
  mkdirSync(dir, { recursive: true });
  const fileOf = (room: string) => join(dir, `${room}${FILE_EXTENSION}`);
  // A first deck, so that there is something to open.
  if (!readdirSync(dir).some((name) => name.endsWith(FILE_EXTENSION))) writeFileSync(fileOf('bienvenida'), serializeDeck(themedDeck(THEMES[1], { width: 960, height: 540 }, 'Bienvenida')));

  return async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://backend');
    const path = url.pathname;
    try {
      if (path === '/api/decks' && request.method === 'GET') {
        const decks = readdirSync(dir)
          .filter((name) => name.endsWith(FILE_EXTENSION))
          .map((name) => {
            const room = name.slice(0, -FILE_EXTENSION.length);
            let title = room;
            try {
              title = parseDeck(readFileSync(fileOf(room), 'utf8')).title;
            } catch {
              // A file that is not a deck is listed by its name.
            }
            return { room, title, people: options.inRoom?.(room) ?? [] };
          });
        send(response, 200, decks);
        return true;
      }
      if (path === '/api/decks' && request.method === 'POST') {
        const { title } = JSON.parse((await body(request, 16384)) || '{}') as { title?: string };
        const name = (title ?? '').trim().slice(0, 80) || 'Presentación sin título';
        const room = roomFor(dir, name);
        writeFileSync(fileOf(room), serializeDeck(themedDeck(THEMES[Math.floor(Math.random() * THEMES.length)], { width: 960, height: 540 }, name)));
        send(response, 200, { room });
        return true;
      }
      if (path === '/api/room' && request.method === 'POST') {
        const { room, name } = JSON.parse((await body(request, 16384)) || '{}') as { room?: string; name?: string };
        if (!room || !ROOM.test(room) || !existsSync(fileOf(room))) return send(response, 404, { error: 'No such deck.' }), true;
        const who = (name ?? '').trim().slice(0, 40) || 'Anónimo';
        send(response, 200, { url: options.collabUrl((request.headers.host ?? 'localhost').replace(/:\d+$/, '')), room, ticket: tickets.issue(room, who) });
        return true;
      }

      const match = /^\/backend\/decks\/([\w-]+)(\/access)?$/.exec(path);
      if (!match) return false;
      if (request.headers.authorization !== `Bearer ${key}`) return send(response, 401, { error: 'Not the collaboration server.' }), true;
      const [, room, access] = match;
      if (access && request.method === 'POST') {
        const { ticket } = JSON.parse((await body(request, 16384)) || '{}') as { ticket?: string };
        const name = ticket ? tickets.check(room, ticket) : undefined;
        return name ? send(response, 200, { name }) : send(response, 403, { error: 'No.' }), true;
      }
      if (request.method === 'GET') {
        if (!existsSync(fileOf(room))) return send(response, 404, { error: 'No such deck.' }), true;
        const text = readFileSync(fileOf(room), 'utf8');
        send(response, 200, text, { 'x-reboslides-name': encodeURIComponent(parseDeck(text).title) });
        return true;
      }
      if (request.method === 'PUT') {
        const text = await body(request);
        parseDeck(text);
        writeFileSync(fileOf(room), text);
        send(response, 200, {});
        return true;
      }
      return false;
    } catch (error) {
      send(response, 400, { error: (error as Error).message });
      return true;
    }
  };
}
