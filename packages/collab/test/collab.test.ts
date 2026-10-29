import { type Deck, addElements, createDeck, createShape, updateElements } from '@reboslides/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createCollabServer } from '../src/server';
import { type CollabHost, type PeerPresence, type Session, createRoom, joinRoom } from '../src/session';
import { memoryStorage } from '../src/storage';

/** A studio without a screen: a deck, the changes made to it, and the others it was told of. */
function fakeHost(start: Deck) {
  let deck = start;
  const listeners = new Set<() => void>();
  let peers: PeerPresence[] = [];
  const host: CollabHost = {
    deck: () => deck,
    setDeck: (next) => {
      deck = next;
    },
    onChange: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    presence: () => ({ slide: deck.slides[0].id, selection: [] }),
    setPeers: (next) => {
      peers = next;
    },
  };
  return {
    host,
    get deck() {
      return deck;
    },
    get peers() {
      return peers;
    },
    change(next: Deck) {
      deck = next;
      for (const fn of listeners) fn();
    },
  };
}

const until = async (ok: () => boolean, what: string) => {
  for (let i = 0; i < 200 && !ok(); i++) await new Promise((r) => setTimeout(r, 15));
  if (!ok()) throw new Error(`Never: ${what}`);
};

const closing: (() => void)[] = [];
afterEach(() => {
  for (const close of closing.splice(0)) close();
});

describe('a room', () => {
  it('keeps two people on one deck, each seeing the other', async () => {
    const storage = memoryStorage();
    const server = createCollabServer({ storage, port: 0, saveAfter: 20, saveEvery: 50, onEvent: () => {} });
    await server.ready;
    closing.push(() => server.close());
    const url = `http://127.0.0.1:${server.port}`;

    let deck = createDeck('Juntos');
    const slide = deck.slides[0];
    const a = createShape('rect', { x: 0, y: 0, width: 10, height: 10 });
    const b = createShape('ellipse', { x: 50, y: 0, width: 10, height: 10 });
    deck = addElements(deck, slide.id, [a, b]);
    const room = await createRoom(url, deck, 'Juntos');

    const ana = fakeHost(createDeck());
    const luis = fakeHost(createDeck());
    const sessions: Session[] = [joinRoom(room, ana.host, { url, name: 'Ana', batch: 5 }), joinRoom(room, luis.host, { url, name: 'Luis', batch: 5 })];
    closing.push(() => sessions.forEach((s) => s.leave()));
    await until(() => sessions.every((s) => s.state === 'on') && ana.deck.title === 'Juntos' && luis.deck.title === 'Juntos', 'both in');
    await until(() => ana.peers.length === 1 && luis.peers.length === 1, 'each sees the other');
    expect(ana.peers[0].name).toBe('Luis');

    // Each moves a different element at once: both moves stay.
    ana.change(updateElements(ana.deck, slide.id, [a.id], (e) => ({ ...e, x: 100 })));
    luis.change(updateElements(luis.deck, slide.id, [b.id], (e) => ({ ...e, x: 200 })));
    const xs = (d: Deck) => d.slides[0].elements.map((e) => e.x).join();
    await until(() => xs(ana.deck) === '100,200' && xs(luis.deck) === '100,200', 'both moves everywhere');
    await until(() => sessions.every((s) => s.pending === 0), 'everything taken');

    // The same element by both: the one the server took last decides, the same for everybody.
    ana.change(updateElements(ana.deck, slide.id, [a.id], (e) => ({ ...e, y: 1 })));
    luis.change(updateElements(luis.deck, slide.id, [a.id], (e) => ({ ...e, y: 2 })));
    await until(() => sessions.every((s) => s.pending === 0), 'everything taken again');
    await until(() => ana.deck.slides[0].elements[0].y === luis.deck.slides[0].elements[0].y, 'the same in both');

    // And the storage is given the deck.
    await until(() => true, '');
    await server.flush();
    expect(xs((await storage.load(room))!.deck)).toBe('100,200');
  });

  it('sends away whoever the storage does not let in', async () => {
    const storage = { ...memoryStorage(), access: async () => undefined };
    const server = createCollabServer({ storage, port: 0, onEvent: () => {} });
    await server.ready;
    closing.push(() => server.close());
    const url = `http://127.0.0.1:${server.port}`;
    const room = await createRoom(url, createDeck(), 'x');
    const session = joinRoom(room, fakeHost(createDeck()).host, { url });
    await until(() => session.state === 'closed', 'closed');
    expect(session.reason).toBe('denied');
  });
});
