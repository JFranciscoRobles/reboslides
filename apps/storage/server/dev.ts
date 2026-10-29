// The backend as this demo runs it: the bucket of the environment, or a
// folder when there is none, and the routes the page asks.

import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { THEMES, serializeDeck, themedDeck } from '@reboslides/core';
import { createApi } from './api';
import { type Bucket, folderBucket, openBucket } from './bucket';

const folder = process.env.S3_BUCKET ? undefined : folderBucket(resolve('files'), randomBytes(24).toString('base64url'));
const bucket: Bucket = folder ?? openBucket();
const kind = {
  extension: '.reboslides',
  type: 'application/json',
  blank: (name: string) => new TextEncoder().encode(serializeDeck(themedDeck(THEMES[Math.floor(Math.random() * THEMES.length)], { width: 960, height: 540 }, name))),
};

// A first deck in the folder, so that there is something to open.
const seeded = folder
  ? folder.list().then(async (files) => {
      if (!files.length) await folder.put('Bienvenida.reboslides', kind.blank('Bienvenida'), kind.type);
    })
  : Promise.resolve();

const api = createApi(() => bucket, kind);

export async function backend(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  await seeded;
  return (await api(request, response)) || ((await folder?.serve(request, response)) ?? false);
}

export const where = folder ? `una carpeta: ${resolve('files')} (sin S3_BUCKET en .env)` : `el bucket ${process.env.S3_BUCKET}`;
