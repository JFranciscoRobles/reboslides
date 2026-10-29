// What the browser asks of the backend. The files themselves do not pass
// through here: the browser is given an address signed for a few minutes and
// reads from, or writes to, the bucket itself.
//
//   GET  /api/files                    the files of the bucket, but the versions
//   POST /api/files { name }           a new one, written here, and its key
//   GET  /api/url?key=…                an address to read one from
//   POST /api/url?key=…                an address to write one to
//   GET  /api/versions?key=…           the versions kept of a file, the newest first
//   POST /api/versions?key=…&label=…   an address to write a new version to
//
// A version is a copy of the file beside it, under `versions/<key>/`: its key
// says when it was kept and with what name, so that listing them is one
// request. It is read as any other file, with `GET /api/url`.
//
// This is where an application of your own checks who is asking, before
// signing anything: here anyone who reaches the server may open and save.

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Bucket } from './bucket';

/** What kind of file this backend keeps: its extension, its type, and what a new one is. */
export interface FileKind {
  extension: string;
  type: string;
  blank(name: string): Uint8Array;
}

const VERSIONS = 'versions/';

class Refused extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createApi(bucket: () => Bucket, kind: FileKind): (request: IncomingMessage, response: ServerResponse) => Promise<boolean> {
  const ending = new RegExp(`\\${kind.extension}$`, 'i');
  /** The key asked for: a file name of this kind, with no way out of the bucket. */
  const keyOf = (url: URL, versions = false) => {
    const key = url.searchParams.get('key') ?? '';
    if (!key || key.length > 512 || key.startsWith('/') || key.split('/').includes('..') || !ending.test(key)) throw new Refused(400, 'That is not the name of a file.');
    if (!versions && key.startsWith(VERSIONS)) throw new Refused(400, 'That is a version, which stays as it was kept. Save it under another name.');
    return key;
  };
  const send = (response: ServerResponse, status: number, data: unknown) => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(data));
  };
  const body = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
    const parts: Buffer[] = [];
    for await (const part of request) parts.push(part as Buffer);
    try {
      return JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
    } catch {
      throw new Refused(400, 'The body is not JSON.');
    }
  };

  return async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://api');
    if (!url.pathname.startsWith('/api/')) return false;
    try {
      const b = bucket();
      if (url.pathname === '/api/files' && request.method === 'GET') {
        send(
          response,
          200,
          (await b.list()).filter((file) => !file.key.startsWith(VERSIONS) && ending.test(file.key)),
        );
      } else if (url.pathname === '/api/files' && request.method === 'POST') {
        const name =
          String((await body(request)).name ?? '')
            .trim()
            .replace(/[\\/]/g, '-')
            .slice(0, 80) || 'Sin título';
        let key = `${name}${kind.extension}`;
        for (let n = 2; await b.get(key); n++) key = `${name} ${n}${kind.extension}`;
        await b.put(key, kind.blank(name), kind.type);
        send(response, 200, { key });
      } else if (url.pathname === '/api/url' && request.method === 'GET') {
        send(response, 200, { url: await b.readUrl(keyOf(url, true)) });
      } else if (url.pathname === '/api/url' && request.method === 'POST') {
        send(response, 200, { url: await b.writeUrl(keyOf(url), kind.type), type: kind.type });
      } else if (url.pathname === '/api/versions' && request.method === 'GET') {
        const key = keyOf(url);
        const versions = (await b.list(`${VERSIONS}${key}/`)).map((file) => {
          const [when, ...label] = file.key.slice(`${VERSIONS}${key}/`.length).replace(ending, '').split('__');
          return { key: file.key, when: when.replace(/_/g, ':'), label: decodeURIComponent(label.join('__')), size: file.size };
        });
        send(
          response,
          200,
          versions.sort((x, y) => y.when.localeCompare(x.when)),
        );
      } else if (url.pathname === '/api/versions' && request.method === 'POST') {
        const key = keyOf(url);
        const label = encodeURIComponent((url.searchParams.get('label') ?? '').slice(0, 60));
        const version = `${VERSIONS}${key}/${new Date().toISOString().replace(/:/g, '_')}__${label}${kind.extension}`;
        send(response, 200, { url: await b.writeUrl(version, kind.type), type: kind.type, key: version });
      } else send(response, 404, { error: 'Nothing here.' });
    } catch (error) {
      send(response, error instanceof Refused ? error.status : 500, { error: (error as Error).message });
    }
    return true;
  };
}
