// What the server and the studios say to each other, both ways: the events of
// the stream a studio listens to, and what it posts. Both sides build and read
// them with these types, so that one cannot send what the other does not
// expect without the compiler saying so.

import { type Change, type Deck, fromJson, toJson } from '@reboslides/core';

export const DEFAULT_COLLAB_PORT = 7430;
/**
 * The version of what is said here. A studio says the one it speaks when it
 * comes in, and a server that speaks another sends it away saying so.
 */
export const PROTOCOL = 1;
/** Where everything of the server is, under its address. */
export const PREFIX = '/collab';

/** Where someone is: the slide they are on and what they have picked on it. */
export interface Presence {
  slide?: string;
  selection: string[];
}

/** One sending of changes, in its place in the room. */
export interface Entry {
  /** Who made the changes, and which of their sendings it was. */
  by: string;
  seq: number;
  changes: Change[];
}

/** Someone in the room, as the others see them. */
export interface PeerInfo {
  client: string;
  name: string;
  color: string;
  sel?: Presence;
}

/** What a studio is told first, once it is in. */
export interface Hello {
  protocol: number;
  client: string;
  /** What only this studio is given: everything it sends carries it. */
  key: string;
  color: string;
  /** What it is called, by the system the deck belongs to when it says. */
  as: string;
  readOnly: boolean;
  /** How many sendings the room has taken, and the deck after them. */
  rev: number;
  deck: Deck;
  /** The name the deck was shared under. */
  name: string;
  peers: PeerInfo[];
}

/** The events of the stream, and what each carries. */
export interface Events {
  hello: Hello;
  /** One more sending, at `rev` of the room. */
  op: Entry & { rev: number };
  presence: PeerInfo;
  leave: { client: string };
  /** The system no longer lets this studio in. */
  removed: Record<string, never>;
}

export type EventName = keyof Events;
export type ServerEvent = { [K in EventName]: { event: K; data: Events[K] } }[EventName];

const NAMES = new Set<string>(['hello', 'op', 'presence', 'leave', 'removed'] satisfies EventName[]);

/** JSON that keeps the Maps of the text of the boxes. */
export const encode = (value: unknown): string => toJson(value);
export const decode = <T = unknown>(text: string): T => fromJson<T>(text);

/** An event as the stream carries it: one line of data, since JSON has none of its own. */
export function eventText<K extends EventName>(event: K, data: Events[K]): string {
  return `event: ${event}\ndata: ${encode(data)}\n\n`;
}

/** An event read from the stream; nothing for one this side does not know. */
export function readEvent(event: string, data: string): ServerEvent | undefined {
  return NAMES.has(event) ? ({ event, data: decode(data) } as ServerEvent) : undefined;
}

/** What a studio posts: who it is, and the key that shows it. */
interface Signed {
  client: string;
  key: string;
}

/** Changes, `seq` going up with each sending. */
export interface ChangesPost extends Signed {
  seq: number;
  changes: Change[];
}

export interface PresencePost extends Signed {
  sel: Presence | null;
  /** What it is called now, when the system the deck belongs to does not say. */
  name?: string;
}

export type LeavePost = Signed;

/** What starts sharing a deck. */
export interface CreatePost {
  name: string;
  deck: Deck;
}
