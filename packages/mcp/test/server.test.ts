import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Deck, createDeck, parseDeck } from '@reboslides/core';
import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { createCollabServer } from '@reboslides/collab/server';
import { createRoom, joinRoom } from '@reboslides/collab/browser';
import { memoryStorage } from '@reboslides/collab/storage';
import { createSlidesServer } from '../src/server';

const dir = mkdtempSync(join(tmpdir(), 'reboslides-mcp-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let id = 0;
async function call(server: ReturnType<typeof createSlidesServer>, name: string, args: Record<string, unknown> = {}) {
  const answer = (await server.handle({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name, arguments: args } })) as { result: { content: { text: string }[]; isError?: boolean } };
  return { text: answer.result.content[0].text, error: !!answer.result.isError };
}

describe('the MCP server', () => {
  const server = createSlidesServer({ roots: [dir] });

  it('says what it is and lists its tools', async () => {
    const init = (await server.handle({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-06-18' } })) as { result: { serverInfo: { name: string } } };
    expect(init.result.serverInfo.name).toBe('reboslides');
    const list = (await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' })) as { result: { tools: { name: string }[] } };
    const names = list.result.tools.map((t) => t.name);
    for (const n of ['open_deck', 'new_deck', 'save_deck', 'join_room', 'get_overview', 'read_slide', 'add_slide', 'add_text', 'set_text', 'update_element']) expect(names).toContain(n);
  });

  it('makes a deck from a theme, changes it, and saves it', async () => {
    const path = join(dir, 'charla.reboslides');
    const made = await call(server, 'new_deck', { path, title: 'Charla', theme: 'noche' });
    expect(made.text).toContain('8 slide(s)');
    const slide = await call(server, 'read_slide', { slide: 1 });
    const firstText = /(\S+) text /.exec(slide.text)![1];
    await call(server, 'set_text', { slide: 1, element: firstText, text: 'Resultados del trimestre' });
    const added = await call(server, 'add_shape', { slide: 1, shape: 'star', x: 700, y: 60, width: 120, height: 120, color: 'FDE047' });
    expect(added.text).toContain('shape star');
    await call(server, 'set_background', { every_slide: true, from: '0F172A', to: '1E3A8A', angle: 90 });
    expect((await call(server, 'find_text', { query: 'trimestre' })).text).toContain('slide 1');
    expect((await call(server, 'save_deck', {})).error).toBe(false);
    const saved = parseDeck(readFileSync(path, 'utf8'));
    expect(saved.slides).toHaveLength(8);
    expect(saved.slides[3].background).toEqual({ kind: 'gradient', from: '0F172A', to: '1E3A8A', angle: 90 });
    // Undo takes the background back.
    await call(server, 'undo', {});
    expect((await call(server, 'get_overview', {})).text).not.toContain('gradient');
  });

  it('says what is wrong instead of failing', async () => {
    const bad = await call(server, 'read_slide', { slide: 99 });
    expect(bad.error).toBe(true);
    expect(bad.text).toContain('no slide 99');
    expect((await call(server, 'open_deck', { path: '/etc/passwd' })).text).toContain('outside the folders');
  });

  it('edits a deck people have open, through a room', async () => {
    const collab = createCollabServer({ storage: memoryStorage(), port: 0, onEvent: () => {} });
    await collab.ready;
    const url = `http://127.0.0.1:${collab.port}`;
    const room = await createRoom(url, createDeck('En vivo'), 'En vivo');
    // Someone in the studio.
    let theirs: Deck = createDeck();
    const person = joinRoom(room, { deck: () => theirs, setDeck: (d) => (theirs = d), onChange: () => () => {} }, { url, name: 'Ana', batch: 5 });
    try {
      const joined = await call(server, 'join_room', { url, room });
      expect(joined.text).toContain('Joined the room "En vivo" as Claude, with Ana');
      await call(server, 'add_text', { deck: `room:${room}`, text: 'Hola desde Claude', x: 100, y: 100, width: 400 });
      for (let i = 0; i < 100 && !theirs.slides[0].elements.length; i++) await new Promise((r) => setTimeout(r, 20));
      expect(theirs.slides[0].elements).toHaveLength(1);
    } finally {
      person.leave();
      server.close();
      collab.close();
    }
  });
});
