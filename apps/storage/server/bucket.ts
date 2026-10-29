// The bucket, through the S3 API: the one thing here that has the keys.
// Anything that speaks S3 takes the same calls, so Cloudflare R2, AWS S3 and
// MinIO differ only in what the environment says. Without a bucket in the
// environment, a folder of this machine takes its place, with the same
// calls, so that the demo runs as it is.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, join, relative } from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutBucketCorsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** How long an address handed to the browser is good for, in seconds. */
const URL_LIFE = 300;

export interface BucketFile {
  key: string;
  size: number;
  /** When it was last written, as an ISO date. */
  modified: string;
}

export interface Bucket {
  /** The files whose key starts with `prefix`, the newest first. */
  list(prefix?: string): Promise<BucketFile[]>;
  get(key: string): Promise<Uint8Array | undefined>;
  put(key: string, body: Uint8Array, type: string): Promise<void>;
  remove(key: string): Promise<void>;
  /** An address the browser can read the file from, with no keys, for a few minutes. */
  readUrl(key: string): Promise<string>;
  /** An address the browser can write the file to, sending this `Content-Type`. */
  writeUrl(key: string, type: string): Promise<string>;
  /** Lets pages of these origins read from and write to those addresses. */
  allowOrigins(origins: string[]): Promise<void>;
}

export interface BucketEnv {
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_FORCE_PATH_STYLE?: string;
}

export function openBucket(env: BucketEnv = process.env): Bucket {
  const missing = (['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const).filter((name) => !env[name]);
  if (missing.length) throw new Error(`Missing in the environment: ${missing.join(', ')}. Copy .env.example to .env and fill it in.`);
  const Bucket = env.S3_BUCKET!;
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT || undefined,
    region: env.S3_REGION || 'auto',
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
    forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
    // Checksums only where the service asks for them: those the SDK adds by itself would be headers a browser does not send.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return {
    async list(prefix) {
      const files: BucketFile[] = [];
      let ContinuationToken: string | undefined;
      do {
        const page = await client.send(new ListObjectsV2Command({ Bucket, ContinuationToken, Prefix: prefix || undefined }));
        for (const item of page.Contents ?? []) if (item.Key) files.push({ key: item.Key, size: item.Size ?? 0, modified: (item.LastModified ?? new Date(0)).toISOString() });
        ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (ContinuationToken);
      return files.sort((a, b) => b.modified.localeCompare(a.modified));
    },
    async get(key) {
      try {
        return await (await client.send(new GetObjectCommand({ Bucket, Key: key }))).Body?.transformToByteArray();
      } catch (error) {
        if ((error as { name?: string }).name === 'NoSuchKey') return undefined;
        throw error;
      }
    },
    async put(key, body, type) {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: type }));
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
    readUrl: (key) => getSignedUrl(client, new GetObjectCommand({ Bucket, Key: key }), { expiresIn: URL_LIFE }),
    // The type is signed too: the address takes a file of that type and no other.
    writeUrl: (key, type) => getSignedUrl(client, new PutObjectCommand({ Bucket, Key: key, ContentType: type }), { expiresIn: URL_LIFE, signableHeaders: new Set(['content-type']) }),
    async allowOrigins(origins) {
      await client.send(
        new PutBucketCorsCommand({
          Bucket,
          CORSConfiguration: { CORSRules: [{ AllowedOrigins: origins, AllowedMethods: ['GET', 'PUT'], AllowedHeaders: ['content-type'], MaxAgeSeconds: 3600 }] },
        }),
      );
    },
  };
}

/** Where the folder's files are served, under the address of the page. */
export const LOCAL = '/local-bucket/';

/**
 * A folder in place of a bucket: the same calls, its addresses signed with a
 * secret of the process and answered by `serveLocal`, as S3 answers its own.
 */
export function folderBucket(dir: string, secret: string): Bucket & { serve(request: IncomingMessage, response: ServerResponse): Promise<boolean> } {
  mkdirSync(dir, { recursive: true });
  const sign = (method: string, key: string, until: number) => createHmac('sha256', secret).update(`${method} ${key} ${until}`).digest('base64url');
  const address = (method: string, key: string) => {
    const until = Date.now() + URL_LIFE * 1000;
    return `${LOCAL}${key.split('/').map(encodeURIComponent).join('/')}?until=${until}&sig=${sign(method, key, until)}`;
  };
  const pathOf = (key: string) => {
    const path = join(dir, key);
    if (relative(dir, path).startsWith('..')) throw new Error('Outside the folder.');
    return path;
  };
  const walk = (folder: string): string[] =>
    readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(join(folder, entry.name)) : [relative(dir, join(folder, entry.name)).split('\\').join('/')]));
  return {
    async list(prefix = '') {
      return walk(dir)
        .filter((key) => key.startsWith(prefix))
        .map((key) => {
          const stat = statSync(pathOf(key));
          return { key, size: stat.size, modified: stat.mtime.toISOString() };
        })
        .sort((a, b) => b.modified.localeCompare(a.modified));
    },
    async get(key) {
      try {
        return new Uint8Array(readFileSync(pathOf(key)));
      } catch {
        return undefined;
      }
    },
    async put(key, body) {
      mkdirSync(dirname(pathOf(key)), { recursive: true });
      writeFileSync(pathOf(key), body);
    },
    async remove(key) {
      rmSync(pathOf(key), { force: true });
    },
    readUrl: async (key) => address('GET', key),
    writeUrl: async (key) => address('PUT', key),
    async allowOrigins() {
      // The page and the folder are at the same address.
    },
    async serve(request, response) {
      const url = new URL(request.url ?? '/', 'http://local');
      if (!url.pathname.startsWith(LOCAL)) return false;
      const key = url.pathname.slice(LOCAL.length).split('/').map(decodeURIComponent).join('/');
      const until = Number(url.searchParams.get('until'));
      const given = Buffer.from(url.searchParams.get('sig') ?? '');
      const expected = Buffer.from(sign(request.method ?? 'GET', key, until));
      if (!(until > Date.now()) || given.length !== expected.length || !timingSafeEqual(given, expected)) {
        response.writeHead(403).end('The address is not signed, or no longer good.');
        return true;
      }
      if (request.method === 'GET') {
        const body = await this.get(key);
        if (!body) response.writeHead(404).end();
        else response.writeHead(200).end(body);
      } else if (request.method === 'PUT') {
        const parts: Buffer[] = [];
        for await (const part of request) parts.push(part as Buffer);
        await this.put(key, new Uint8Array(Buffer.concat(parts)), request.headers['content-type'] ?? '');
        response.writeHead(200).end();
      } else response.writeHead(405).end();
      return true;
    },
  };
}
