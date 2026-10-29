// The studio's side of working on a deck with other people: it tells the
// server what its person changes, makes the changes of the others as they
// come, and shows where each of them is. What its person does is seen at
// once, without waiting for the server: the deck shown is the room's, as the
// server has ordered its changes, with this person's not yet taken on top.
//
// Undoing is the studio's: a step undone is made as changes on the deck as it
// is, so it takes back what this person did and nothing of the others'.

import { type Change, type Deck, applyChanges, diffDecks } from '@reboslides/core';
import { type ChangesPost, type CreatePost, type Hello, type LeavePost, PREFIX, PROTOCOL, type Presence, type PresencePost, type ServerEvent, decode, encode, readEvent } from './protocol';

export { DEFAULT_COLLAB_PORT, PROTOCOL, type Presence } from './protocol';

/** What a session works on: the deck shown, and where its person is. */
export interface CollabHost {
  deck(): Deck;
  /** The deck made this by the others' changes: shown, with no step of the person's history. */
  setDeck(deck: Deck): void;
  /** Called after each change of the deck made here; what it returns stops it. */
  onChange(fn: () => void): () => void;
  /** Where the person is, and a way to hear when that changes. */
  presence?(): Presence;
  onPresence?(fn: () => void): () => void;
  /** The others, with where they are, to draw. */
  setPeers?(peers: PeerPresence[]): void;
}

export interface Peer {
  client: string;
  name: string;
  color: string;
}

export interface PeerPresence extends Peer {
  slide?: string;
  selection: string[];
}

export type CollabState = 'connecting' | 'on' | 'offline' | 'closed';

/**
 * Why a session is closed: left from here; the room is not on the server;
 * this person may not come in; they were sent away; or the studio and the
 * server speak different versions.
 */
export type ClosedReason = 'left' | 'not-found' | 'denied' | 'removed' | 'outdated';

export interface CollabOptions {
  /** Where the server is. */
  url: string;
  /** What the others see this person as. */
  name?: string;
  /** What the system the deck belongs to gave this person to show they may edit it. */
  ticket?: string;
  /** Called when the state or the people in the room change. */
  onChange?: () => void;
  /** How long changes are gathered before they are sent; 60 ms. */
  batch?: number;
}

export interface Session {
  readonly room: string;
  readonly state: CollabState;
  readonly reason: ClosedReason | undefined;
  /** The name the deck was shared under. */
  readonly title: string;
  readonly peers: Peer[];
  readonly color: string;
  readonly name: string;
  readonly readOnly: boolean;
  /** Sendings the server has not taken yet. */
  readonly pending: number;
  rename(name: string): void;
  /** Stops working with the others. The deck stays as it is. */
  leave(): void;
}

const clean = (url: string) => url.replace(/\/+$/, '');

/** Starts sharing a deck: gives the server the deck, and says the name of the room it made for it. */
export async function createRoom(url: string, deck: Deck, name: string, token?: string): Promise<string> {
  const post: CreatePost = { name, deck };
  const response = await fetch(`${clean(url)}${PREFIX}/rooms${token ? `?token=${encodeURIComponent(token)}` : ''}`, { method: 'POST', body: encode(post) });
  const answer = decode<{ room?: string; error?: string }>(await response.text());
  if (!response.ok || !answer.room) throw new Error(answer.error ?? `${response.status}`);
  return answer.room;
}

/** The events of a stream, read as they come. */
async function* events(body: ReadableStream<Uint8Array>): AsyncGenerator<ServerEvent> {
  const reader = body.getReader();
  const text = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += text.decode(value, { stream: true });
    let end = buffer.indexOf('\n\n');
    while (end >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let name = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) name = line.slice(7);
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      const event = data ? readEvent(name, data) : undefined;
      if (event) yield event;
      end = buffer.indexOf('\n\n');
    }
  }
}

/** Joins the room `room` of the server, and keeps the deck of `host` in step with it until `leave`. */
export function joinRoom(room: string, host: CollabHost, options: CollabOptions): Session {
  const base = `${clean(options.url)}${PREFIX}/rooms/${encodeURIComponent(room)}`;
  const batch = options.batch ?? 60;
  let state: CollabState = 'connecting';
  let reason: ClosedReason | undefined;
  let me: Hello | undefined;
  let name = options.name ?? '';
  let peers: (Peer & { sel?: Presence })[] = [];
  /** The room's deck, as the server has made the changes it has told of. */
  let server: Deck | undefined;
  /** This person's sendings the server has not told of yet, in order. */
  let sent: { seq: number; changes: Change[] }[] = [];
  /** The room's deck with those on top: what the changes made here since are counted from. */
  let shadow: Deck | undefined;
  let seq = 0;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let presenceTimer: ReturnType<typeof setTimeout> | undefined;
  let retry = 500;
  let abort: AbortController | undefined;
  /** Set while the deck shown is being made the room's, so that it is not taken for a change of this person's. */
  let applying = false;

  const changed = () => options.onChange?.();
  const showPeers = () => host.setPeers?.(peers.map((peer) => ({ client: peer.client, name: peer.name, color: peer.color, slide: peer.sel?.slide, selection: peer.sel?.selection ?? [] })));
  const post = (what: string, data: unknown) => fetch(`${base}/${what}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: encode(data) });

  /** What was changed here since the last sending, sent. */
  const flush = () => {
    flushTimer = undefined;
    if (!me || state !== 'on' || !shadow || me.readOnly) return;
    const now = host.deck();
    const changes = diffDecks(shadow, now);
    if (!changes.length) return;
    shadow = now;
    const sending = { seq: ++seq, changes };
    sent.push(sending);
    changed();
    const data: ChangesPost = { client: me.client, key: me.key, ...sending };
    post('changes', data).catch(() => offline());
  };

  const local = () => {
    if (applying || state === 'closed') return;
    if (!flushTimer) flushTimer = setTimeout(flush, batch);
  };

  /** The deck shown made the room's, with what this person has not had taken on top. */
  const rebase = () => {
    if (!server || !shadow) return;
    const unsent = diffDecks(shadow, host.deck());
    shadow = sent.reduce((deck, sending) => applyChanges(deck, sending.changes), server);
    const next = applyChanges(shadow, unsent);
    if (next !== host.deck()) {
      applying = true;
      try {
        host.setDeck(next);
      } finally {
        applying = false;
      }
    }
  };

  const sendPresence = () => {
    presenceTimer = undefined;
    if (!me || state !== 'on' || !host.presence) return;
    const data: PresencePost = { client: me.client, key: me.key, sel: host.presence(), name };
    post('presence', data).catch(() => {});
  };
  const presenceChanged = () => {
    if (!presenceTimer) presenceTimer = setTimeout(sendPresence, 120);
  };

  const receive = (event: ServerEvent) => {
    switch (event.event) {
      case 'hello': {
        const hello = event.data;
        // Back after being away: what was sent and not told of, and what was changed meanwhile, made again on the room's deck.
        const mine = shadow ? [...sent.flatMap((sending) => sending.changes), ...diffDecks(shadow, host.deck())] : [];
        me = hello;
        name = hello.as;
        server = hello.deck;
        sent = [];
        shadow = server;
        peers = hello.peers;
        state = 'on';
        retry = 500;
        applying = true;
        try {
          host.setDeck(applyChanges(server, mine));
        } finally {
          applying = false;
        }
        showPeers();
        changed();
        if (mine.length) flush();
        presenceChanged();
        return;
      }
      case 'op': {
        const entry = event.data;
        if (!server) return;
        server = applyChanges(server, entry.changes);
        if (entry.by === me?.client) {
          sent = sent.filter((sending) => sending.seq !== entry.seq);
          changed();
        } else rebase();
        return;
      }
      case 'presence': {
        const peer = event.data;
        peers = [...peers.filter((one) => one.client !== peer.client), peer];
        showPeers();
        changed();
        return;
      }
      case 'leave':
        peers = peers.filter((one) => one.client !== event.data.client);
        showPeers();
        changed();
        return;
      case 'removed':
        close('removed');
        return;
    }
  };

  const offline = () => {
    if (state === 'closed') return;
    state = 'offline';
    changed();
    abort?.abort();
    setTimeout(connect, retry);
    retry = Math.min(retry * 2, 15000);
  };

  async function connect(): Promise<void> {
    if (state === 'closed') return;
    abort = new AbortController();
    const query = new URLSearchParams({ protocol: String(PROTOCOL), ...(name ? { name } : {}), ...(options.ticket ? { ticket: options.ticket } : {}) });
    try {
      const response = await fetch(`${base}/events?${query}`, { signal: abort.signal, headers: { accept: 'text/event-stream' } });
      if (response.status === 404) return close('not-found');
      if (response.status === 403) return close('denied');
      if (response.status === 426) return close('outdated');
      if (!response.ok || !response.body) return offline();
      for await (const event of events(response.body)) receive(event);
      offline();
    } catch {
      offline();
    }
  }

  const close = (why: ClosedReason) => {
    if (state === 'closed') return;
    state = 'closed';
    reason = why;
    clearTimeout(flushTimer);
    clearTimeout(presenceTimer);
    stopChange();
    stopPresence?.();
    abort?.abort();
    peers = [];
    showPeers();
    changed();
  };

  const stopChange = host.onChange(local);
  const stopPresence = host.onPresence?.(presenceChanged);
  void connect();

  return {
    room,
    get state() {
      return state;
    },
    get reason() {
      return reason;
    },
    get title() {
      return me?.name ?? '';
    },
    get peers() {
      return peers.map(({ client, name: who, color }) => ({ client, name: who, color }));
    },
    get color() {
      return me?.color ?? '';
    },
    get name() {
      return name;
    },
    get readOnly() {
      return me?.readOnly ?? false;
    },
    get pending() {
      return sent.length;
    },
    rename(next: string) {
      name = next;
      sendPresence();
    },
    leave() {
      if (me && state === 'on') {
        flush();
        const data: LeavePost = { client: me.client, key: me.key };
        post('leave', data).catch(() => {});
      }
      close('left');
    },
  };
}

/** What a session needs of a ReboSlides Studio: its deck, the changes made to it, where its person is, and the others drawn. */
export interface StudioLike {
  deck: Deck;
  selection: string[];
  readonly slide: { id: string };
  applyRemote(deck: Deck): void;
  on(event: 'change' | 'state', fn: (deck: Deck, remote: boolean) => void): () => void;
  setPeers(peers: PeerPresence[]): void;
}

/** A Studio as what a session works on. */
export function studioHost(studio: StudioLike): CollabHost {
  return {
    deck: () => studio.deck,
    setDeck: (deck) => studio.applyRemote(deck),
    onChange: (fn) => studio.on('change', (_deck, remote) => !remote && fn()),
    presence: () => ({ slide: studio.slide.id, selection: studio.selection }),
    onPresence: (fn) => {
      let last = '';
      return studio.on('state', () => {
        const now = `${studio.slide.id}|${studio.selection.join()}`;
        if (now !== last) {
          last = now;
          fn();
        }
      });
    },
    setPeers: (peers) => studio.setPeers(peers),
  };
}
