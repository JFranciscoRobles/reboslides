// A Model Context Protocol server for decks: what an assistant talks to. It
// speaks JSON-RPC, a message a line, and offers the tools of `tools.ts` on the
// .reboslides files it is asked to open, kept in memory until they are saved,
// or on the deck of a room of the collaboration server, where every change
// is seen at once by the people in it. Node only; `main.ts` runs it.

import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { type Session, joinRoom } from '@reboslides/collab/browser';
import { type Deck, FILE_EXTENSION, THEMES, createDeck, parseDeck, serializeDeck, themedDeck } from '@reboslides/core';
import { version } from '../package.json';
import { TOOLS, ToolError, findTool } from './tools';

export interface ServerOptions {
  /** Folders files may be read from and written to; anywhere, when none is given. */
  roots?: string[];
  /** Where relative paths start. */
  cwd?: string;
}

interface Message {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface OpenDeck {
  /** The path of its file, or `room:<id>` for the deck of a room. */
  key: string;
  deck: Deck;
  unsaved: boolean;
  onDisk: boolean;
  /** The deck before each change of the tools, the last last: what undo goes back to. */
  history: Deck[];
  session?: Session;
  /** Told after each change of the tools: the session of a room sends it. */
  listeners: Set<() => void>;
}

const HISTORY = 30;
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCTIONS = `Tools to read and edit slide decks of ReboSlides. Open a .reboslides file with open_deck, start one with new_deck, or join a deck people have open in the studio with join_room (its changes are seen by them at once). Look at it with get_overview and read_slide, which gives the ids of the elements the other tools take. Slides go by number from 1 or by id; lengths are points from the top left corner of the slide (get_overview says its size); colours are hex as "2563EB". New slides can come from a layout of a theme (add_slide), their texts then replaced with set_text. Changes to a file stay in memory until save_deck; prefer saving a copy to writing over the original.`;

const DECK = { type: 'string', description: 'The path of a deck opened with open_deck, or "room:<id>" for one joined. Left out, the last one opened.' };

const OWN: { name: string; title: string; description: string; properties: Record<string, unknown>; required?: string[]; annotations: Record<string, boolean> }[] = [
  {
    name: 'open_deck',
    title: 'Open a deck',
    annotations: { readOnlyHint: true },
    description: 'Opens a ReboSlides deck (.reboslides) to read and change it. It is kept in memory: nothing is written until save_deck. Gives its overview.',
    properties: { path: { type: 'string', description: 'The path of the .reboslides file.' } },
    required: ['path'],
  },
  {
    name: 'new_deck',
    title: 'New deck',
    annotations: { readOnlyHint: true },
    description: `Starts a deck to fill and save: blank, or the eight slides of a theme (${THEMES.map((t) => t.id).join(', ')}) with their texts to replace.`,
    properties: {
      path: { type: 'string', description: 'Where it will be saved: a path ending in .reboslides.' },
      title: { type: 'string', description: 'Its title.' },
      theme: { type: 'string', enum: THEMES.map((t) => t.id), description: 'A theme to start from. Blank when left out.' },
    },
    required: ['path'],
  },
  {
    name: 'save_deck',
    title: 'Save a deck',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    description:
      'Writes a deck to a .reboslides file. It does not write over a file that is there unless "overwrite" is true. A deck joined in a room is kept by its server, and needs no saving; it can be saved as a copy.',
    properties: {
      deck: DECK,
      path: { type: 'string', description: 'Where to write. Left out, the file it was opened from.' },
      overwrite: { type: 'boolean', description: 'Write over a file that is already there. False when left out.' },
    },
  },
  {
    name: 'join_room',
    title: 'Join a room',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    description:
      'Works on a deck people have open in the ReboSlides studio, through the collaboration server: every change of the tools is seen by them at once, and theirs by the tools. The person shares the address of the server and the id of the room.',
    properties: {
      url: { type: 'string', description: 'Where the collaboration server is, as "http://127.0.0.1:7430".' },
      room: { type: 'string', description: 'The id of the room.' },
      name: { type: 'string', description: 'What the people in it see the assistant as. "Claude" when left out.' },
      ticket: { type: 'string', description: 'What the system the deck belongs to gave, when it asks for one.' },
    },
    required: ['url', 'room'],
  },
  {
    name: 'undo',
    title: 'Undo changes',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    description: `Undoes the last changes the tools made to a deck, one at a time or several, up to ${HISTORY}. In a room it takes back the deck as it was, and with it what others did meanwhile: use it right after the change.`,
    properties: { deck: DECK, steps: { type: 'integer', description: 'How many. 1 when left out.' } },
  },
  {
    name: 'list_decks',
    title: 'List the decks',
    annotations: { readOnlyHint: true },
    description: 'The decks that are open or joined, with whether each has changes not saved.',
    properties: {},
  },
  {
    name: 'close_deck',
    title: 'Close a deck',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    description: 'Forgets a deck that is open, with any changes that were not saved; leaves a room that was joined.',
    properties: { deck: DECK },
    required: ['deck'],
  },
];

export interface SlidesServer {
  handle(message: Message): Promise<object | undefined>;
  /** Leaves the rooms joined. */
  close(): void;
}

export function createSlidesServer(options: ServerOptions = {}): SlidesServer {
  const cwd = options.cwd ?? process.cwd();
  const roots = (options.roots ?? []).map((root) => resolve(cwd, root));
  const decks = new Map<string, OpenDeck>();
  let current: string | undefined;

  class Refused extends Error {}
  const refuse = (message: string): never => {
    throw new Refused(message);
  };

  const pathOf = (given: unknown): string => {
    if (typeof given !== 'string' || !given.trim()) refuse('"path" must be the path of a file.');
    const path = resolve(cwd, given as string);
    const inside = (root: string) => {
      const rel = relative(root, path);
      return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
    };
    if (roots.length && !roots.some(inside)) refuse(`"${given}" is outside the folders this server may use: ${roots.join(', ')}.`);
    if (extname(path).toLowerCase() !== FILE_EXTENSION) refuse(`The file has to be a ${FILE_EXTENSION}.`);
    return path;
  };

  const deckOf = (given: unknown): OpenDeck => {
    if (given === undefined || given === null || given === '') {
      if (!current) refuse('No deck is open: open one with open_deck, start one with new_deck, or join one with join_room.');
      return decks.get(current!)!;
    }
    const key = String(given).startsWith('room:') ? String(given) : pathOf(given);
    return decks.get(key) ?? refuse(`"${given}" is not open: open it with open_deck or join_room first.`);
  };

  const overview = (deck: Deck) => findTool('get_overview')!.run(deck, {}).text;
  const open = (key: string, deck: Deck, onDisk: boolean): OpenDeck => {
    const entry: OpenDeck = { key, deck, unsaved: !onDisk, onDisk, history: [], listeners: new Set() };
    decks.set(key, entry);
    current = key;
    return entry;
  };
  const changed = (entry: OpenDeck, deck: Deck) => {
    entry.history.push(entry.deck);
    if (entry.history.length > HISTORY) entry.history.shift();
    entry.deck = deck;
    entry.unsaved = !entry.session;
    for (const fn of entry.listeners) fn();
  };

  const until = async (ok: () => boolean, ms: number) => {
    for (let waited = 0; waited < ms && !ok(); waited += 25) await new Promise((r) => setTimeout(r, 25));
  };

  const own = async (name: string, args: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case 'open_deck': {
        const path = pathOf(args.path);
        if (!existsSync(path) || !statSync(path).isFile()) refuse(`There is no file at "${path}".`);
        let deck: Deck;
        try {
          deck = parseDeck(readFileSync(path, 'utf8'));
        } catch (e) {
          return refuse(`"${path}" could not be read: ${e instanceof Error ? e.message : String(e)}`);
        }
        open(path, deck, true);
        return `Opened ${path}.\n${overview(deck)}`;
      }
      case 'new_deck': {
        const path = pathOf(args.path);
        const title = typeof args.title === 'string' && args.title.trim() ? args.title.trim() : 'Presentación sin título';
        const theme = args.theme === undefined ? undefined : (THEMES.find((t) => t.id === args.theme) ?? refuse(`"theme" must be one of: ${THEMES.map((t) => t.id).join(', ')}.`));
        const deck = theme ? themedDeck(theme, createDeck().size, title) : createDeck(title);
        open(path, deck, false);
        return `Started a deck, to be saved at ${path}${existsSync(path) ? ' (a file is there: save_deck will need "overwrite", or another path)' : ''}.\n${overview(deck)}`;
      }
      case 'save_deck': {
        const entry = deckOf(args.deck);
        if (entry.session && args.path === undefined) return 'It is the deck of a room: its server keeps it. Give a "path" to save a copy.';
        const path = args.path === undefined ? entry.key : pathOf(args.path);
        if (existsSync(path) && !args.overwrite)
          refuse(
            path === entry.key && entry.onDisk
              ? `Saving to ${path} writes over the file it was opened from: give "overwrite": true, or a new "path".`
              : `There is a file at ${path} already. Save to another path, or give "overwrite": true to write over it.`,
          );
        writeFileSync(path, serializeDeck(entry.deck));
        if (path === entry.key) {
          entry.unsaved = false;
          entry.onDisk = true;
        }
        return `Saved "${entry.deck.title}" to ${path}.`;
      }
      case 'join_room': {
        if (typeof args.url !== 'string' || !/^https?:\/\//.test(args.url)) refuse('"url" must be the address of the collaboration server, as "http://127.0.0.1:7430".');
        if (typeof args.room !== 'string' || !args.room.trim()) refuse('"room" must be the id of the room.');
        const key = `room:${args.room}`;
        decks.get(key)?.session?.leave();
        const entry = open(key, createDeck(), true);
        let ready = false;
        entry.session = joinRoom(
          String(args.room),
          {
            deck: () => entry.deck,
            setDeck: (deck) => {
              entry.deck = deck;
              ready = true;
            },
            onChange: (fn) => {
              entry.listeners.add(fn);
              return () => entry.listeners.delete(fn);
            },
          },
          { url: String(args.url), name: typeof args.name === 'string' && args.name ? args.name : 'Claude', ticket: typeof args.ticket === 'string' ? args.ticket : undefined, batch: 0 },
        );
        await until(() => ready || entry.session?.state === 'closed', 8000);
        const session = entry.session;
        if (session.state === 'closed') {
          decks.delete(key);
          return refuse(`Could not join the room: ${session.reason}.`);
        }
        if (!ready) {
          decks.delete(key);
          session.leave();
          return refuse(`The server at ${args.url} did not answer.`);
        }
        const peers = session.peers.map((p) => p.name);
        return `Joined the room "${session.title || args.room}" as ${session.name}${peers.length ? `, with ${peers.join(', ')}` : ''}. Use deck "${key}".\n${overview(entry.deck)}`;
      }
      case 'undo': {
        const entry = deckOf(args.deck);
        const steps = args.steps === undefined ? 1 : Number(args.steps);
        if (!Number.isInteger(steps) || steps < 1) refuse('"steps" must be a whole number of 1 or more.');
        if (!entry.history.length) refuse('There is nothing to undo.');
        const n = Math.min(steps, entry.history.length);
        const before = entry.history.splice(entry.history.length - n)[0];
        entry.deck = before;
        entry.unsaved = !entry.session;
        for (const fn of entry.listeners) fn();
        return `Undid ${n} change(s).${entry.history.length ? ` ${entry.history.length} more can be undone.` : ''}`;
      }
      case 'list_decks':
        return decks.size
          ? [...decks.values()]
              .map((d) => `${d.key} "${d.deck.title}"${d.session ? ` (room, ${d.session.state})` : d.unsaved ? ' (changes not saved)' : ''}${d.key === current ? ' (current)' : ''}`)
              .join('\n')
          : 'No deck is open.';
      case 'close_deck': {
        const entry = deckOf(args.deck);
        entry.session?.leave();
        decks.delete(entry.key);
        if (current === entry.key) current = [...decks.keys()].pop();
        return `Closed ${entry.key}${entry.unsaved ? ', without saving its changes' : ''}.`;
      }
    }
    return refuse(`There is no tool "${name}".`);
  };

  const call = async (name: string, args: Record<string, unknown>): Promise<string> => {
    if (OWN.some((t) => t.name === name)) return own(name, args);
    const tool = findTool(name) ?? refuse(`There is no tool "${name}".`);
    const { deck: which, ...rest } = args;
    const entry = deckOf(which);
    if (entry.session?.readOnly) refuse('In this room the assistant may only look.');
    const { text, deck } = tool.run(entry.deck, rest);
    if (tool.writes && deck && deck !== entry.deck) changed(entry, deck);
    return text;
  };

  const schema = (properties: Record<string, unknown>, required?: string[]) => ({ type: 'object', properties, ...(required?.length && { required }) });
  const listed = [
    ...OWN.map((t) => ({ name: t.name, title: t.title, description: t.description, inputSchema: schema(t.properties, t.required), annotations: { title: t.title, ...t.annotations } })),
    ...TOOLS.map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: schema({ deck: DECK, ...t.properties }, t.required),
      annotations: { title: t.title, readOnlyHint: !t.writes, ...(t.writes && { destructiveHint: false, idempotentHint: false }) },
    })),
  ];

  return {
    close() {
      for (const entry of decks.values()) entry.session?.leave();
    },
    async handle(message) {
      const { id, method, params = {} } = message;
      const answer = (result: object) => (id === undefined || id === null ? undefined : { jsonrpc: '2.0', id, result });
      switch (method) {
        case 'initialize': {
          const asked = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
          return answer({
            protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
            capabilities: { tools: {} },
            serverInfo: { name: 'reboslides', title: 'ReboSlides', version },
            instructions: INSTRUCTIONS,
          });
        }
        case 'ping':
          return answer({});
        case 'tools/list':
          return answer({ tools: listed });
        case 'tools/call': {
          const name = String(params.name ?? '');
          const args = params.arguments && typeof params.arguments === 'object' ? (params.arguments as Record<string, unknown>) : {};
          try {
            return answer({ content: [{ type: 'text', text: await call(name, args) }] });
          } catch (error) {
            // What the assistant can put right is said to it as the result of the tool; anything else is a fault of the server.
            const known = error instanceof Refused || error instanceof ToolError;
            const text = error instanceof Error ? error.message : String(error);
            return answer({ content: [{ type: 'text', text: known ? text : `The tool failed: ${text}` }], isError: true });
          }
        }
        default:
          if (id === undefined || id === null) return undefined;
          return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
      }
    },
  };
}
