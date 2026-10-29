import { mkdtempSync, rmSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createApi } from '../server/api';
import { folderBucket } from '../server/bucket';

const dir = mkdtempSync(join(tmpdir(), 'reboslides-storage-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('the backend of the storage demo', () => {
  it('lists, creates, signs addresses, and keeps versions', async () => {
    const bucket = folderBucket(dir, 'secret');
    const api = createApi(() => bucket, { extension: '.reboslides', type: 'application/json', blank: (name) => new TextEncoder().encode(JSON.stringify({ name })) });
    const server = createServer((request: IncomingMessage, response: ServerResponse) => {
      void (async () => (await api(request, response)) || (await bucket.serve(request, response)) || response.writeHead(404).end())();
    });
    await new Promise<void>((ready) => server.listen(0, ready));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const json = async (path: string, init?: RequestInit) => (await fetch(base + path, init)).json();
    try {
      const { key } = await json('/api/files', { method: 'POST', body: JSON.stringify({ name: 'Charla' }) });
      expect(key).toBe('Charla.reboslides');
      expect((await json('/api/files')).map((f: { key: string }) => f.key)).toEqual(['Charla.reboslides']);
      // Written and read through the signed addresses, as the page does.
      const write = await json(`/api/url?key=${key}`, { method: 'POST' });
      expect((await fetch(base + write.url, { method: 'PUT', headers: { 'content-type': write.type }, body: '{"v":2}' })).ok).toBe(true);
      const read = await json(`/api/url?key=${key}`);
      expect(await (await fetch(base + read.url)).text()).toBe('{"v":2}');
      // A version beside it, listed by its name and not among the files.
      const version = await json(`/api/versions?key=${key}&label=Primera`, { method: 'POST' });
      await fetch(base + version.url, { method: 'PUT', body: '{"v":2}' });
      const versions = await json(`/api/versions?key=${key}`);
      expect(versions[0].label).toBe('Primera');
      expect((await json('/api/files')).length).toBe(1);
      // An address not signed, or a name that leaves the bucket, is refused.
      expect((await fetch(`${base}/local-bucket/Charla.reboslides`)).status).toBe(403);
      expect((await fetch(`${base}/api/url?key=../../etc/passwd.reboslides`)).status).toBe(400);
    } finally {
      server.close();
    }
  });
});
