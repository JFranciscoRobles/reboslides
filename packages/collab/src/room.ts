// A room: one deck being shared, the people in it, and every change made to
// it, in the one order everybody follows. It takes a sending of changes,
// makes it on its deck, tells everybody, gives the deck to the storage a
// while after the changes stop, and lets go of itself when the last one
// leaves. It knows nothing of HTTP: the server hands it each person's stream
// as something to write events to.

import { randomBytes } from 'node:crypto';
import { type Deck, applyChanges } from '@reboslides/core';
import { type ChangesPost, type EventName, type Events, PROTOCOL, type PeerInfo, type Presence, eventText } from './protocol';
import type { Pass, RoomStorage } from './storage';

/** The colours people are told apart by, in the order they are given out. */
export const PEER_COLORS = ['E8710A', '1A73E8', '0F9D58', 'D93025', '9334E6', '00897B', 'C2185B', '6D4C41'];

/** Where events go to someone: an open stream. */
export interface Listener {
  write(text: string): void;
  end(): void;
}

/** What happens in the rooms, for a system to log or count. */
export type CollabEvent =
  | { type: 'join'; room: string; client: string; name: string; readOnly: boolean }
  | { type: 'leave'; room: string; client: string; name: string }
  | { type: 'save'; room: string }
  | { type: 'error'; room: string; what: string; error: Error };

interface Client {
  id: string;
  key: string;
  name: string;
  color: string;
  readOnly: boolean;
  /** Whether the system the deck belongs to said the name: the person cannot change it then. */
  named: boolean;
  sel?: Presence;
  listener: Listener;
}

export interface RoomOptions {
  storage: RoomStorage;
  /** How long after the changes stop the deck is given to the storage, and how often at least while they go on. */
  saveAfter: number;
  saveEvery: number;
  emit(event: CollabEvent): void;
  /** Called when the room is empty and kept: the server lets go of it. */
  forget(room: Room): void;
}

export class Room {
  deck: Deck;
  name: string;
  rev = 0;
  private clients = new Map<string, Client>();
  private saveTimer?: ReturnType<typeof setTimeout>;
  private lastSave = Date.now();
  private unsaved = false;

  constructor(
    readonly id: string,
    kept: { deck: Deck; name: string },
    private readonly options: RoomOptions,
  ) {
    this.deck = kept.deck;
    this.name = kept.name;
  }

  get size(): number {
    return this.clients.size;
  }

  /** The names of the people in the room now. */
  get people(): string[] {
    return [...this.clients.values()].map((client) => client.name);
  }

  /** Someone in, with the stream their events go to; told the deck as it is now, and the others. */
  join(listener: Listener, pass: NonNullable<Pass>, wanted: string | undefined): Client {
    const used = new Set([...this.clients.values()].map((c) => c.color));
    const color = PEER_COLORS.find((c) => !used.has(c)) ?? PEER_COLORS[this.clients.size % PEER_COLORS.length];
    const client: Client = {
      id: randomBytes(6).toString('hex'),
      key: randomBytes(16).toString('hex'),
      name: pass.name ?? (wanted?.trim().slice(0, 60) || 'Anónimo'),
      color,
      readOnly: !!pass.readOnly,
      named: !!pass.name,
      listener,
    };
    const peers = [...this.clients.values()].map(this.info);
    this.clients.set(client.id, client);
    this.send(client, 'hello', {
      protocol: PROTOCOL,
      client: client.id,
      key: client.key,
      color,
      as: client.name,
      readOnly: client.readOnly,
      rev: this.rev,
      deck: this.deck,
      name: this.name,
      peers,
    });
    this.broadcast('presence', this.info(client), client.id);
    this.options.emit({ type: 'join', room: this.id, client: client.id, name: client.name, readOnly: client.readOnly });
    return client;
  }

  private info = (client: Client): PeerInfo => ({ client: client.id, name: client.name, color: client.color, ...(client.sel ? { sel: client.sel } : {}) });

  /** The one who showed this key, if they are in. */
  private signed(id: string, key: string): Client | undefined {
    const client = this.clients.get(id);
    return client && client.key === key ? client : undefined;
  }

  /** A sending of changes: made on the deck, and told to everybody, who sent it included. False when it is not taken. */
  changes(post: ChangesPost): boolean {
    const client = this.signed(post.client, post.key);
    if (!client || client.readOnly || !Array.isArray(post.changes)) return false;
    this.deck = applyChanges(this.deck, post.changes);
    this.rev++;
    this.broadcast('op', { by: client.id, seq: post.seq, changes: post.changes, rev: this.rev });
    this.unsaved = true;
    this.scheduleSave();
    return true;
  }

  presence(id: string, key: string, sel: Presence | null, name?: string): boolean {
    const client = this.signed(id, key);
    if (!client) return false;
    client.sel = sel ?? undefined;
    if (name && !client.named) client.name = name.trim().slice(0, 60) || client.name;
    this.broadcast('presence', this.info(client), client.id);
    return true;
  }

  leave(id: string, key?: string): void {
    const client = key === undefined ? this.clients.get(id) : this.signed(id, key);
    if (!client) return;
    this.clients.delete(client.id);
    client.listener.end();
    this.broadcast('leave', { client: client.id });
    this.options.emit({ type: 'leave', room: this.id, client: client.id, name: client.name });
    if (!this.clients.size) void this.save().then(() => !this.clients.size && this.options.forget(this));
  }

  /** Sends everybody away: the server is closing. */
  close(): void {
    clearTimeout(this.saveTimer);
    for (const client of this.clients.values()) client.listener.end();
    this.clients.clear();
  }

  private scheduleSave(): void {
    clearTimeout(this.saveTimer);
    const overdue = Date.now() - this.lastSave >= this.options.saveEvery;
    this.saveTimer = setTimeout(() => void this.save(), overdue ? 0 : this.options.saveAfter);
  }

  /** The deck given to the storage, when it has changes the storage does not have. */
  async save(): Promise<void> {
    clearTimeout(this.saveTimer);
    if (!this.unsaved) return;
    this.unsaved = false;
    this.lastSave = Date.now();
    try {
      await this.options.storage.save(this.id, { deck: this.deck, name: this.name });
      this.options.emit({ type: 'save', room: this.id });
    } catch (error) {
      this.unsaved = true;
      this.options.emit({ type: 'error', room: this.id, what: 'save', error: error as Error });
    }
  }

  private send<K extends EventName>(client: Client, event: K, data: Events[K]): void {
    client.listener.write(eventText(event, data));
  }

  private broadcast<K extends EventName>(event: K, data: Events[K], except?: string): void {
    for (const client of this.clients.values()) if (client.id !== except) this.send(client, event, data);
  }
}
