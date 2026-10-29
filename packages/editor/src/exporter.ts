// The deck downloaded in the kind of file asked for: pictures of its slides
// (PNG, JPG), a PDF for a screen or for a printer, SVG, an animated GIF, a
// video, or the deck itself. Several pictures come in a ZIP. What has no DOM
// in it is the engine's; what needs a canvas or a recorder is done here.

import { type Deck, encodeGif, serializeDeck, slideSvg, toUnit, FILE_EXTENSION } from '@reboslides/core';
import { zipSync } from 'fflate';
import { download, fileName } from './dom';
import type { Layout, TextMeasurer } from './engine';
import { googleFontsUrl } from './fonts';
import { ES, type Strings } from './i18n';
import { deckPdf } from './pdfexport';
import { type DrawContext, type ImageStore, slideCanvas } from './render';

export const EXPORT_KINDS = ['png', 'jpg', 'pdf', 'pdf-print', 'svg', 'gif', 'video', 'reboslides'] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

/** The name of each kind of file and what it is for, in the studio's language. */
export const exportNames = (t: Strings): Record<ExportKind, { name: string; note: string }> => ({
  png: { name: 'PNG', note: t.formatPng },
  jpg: { name: 'JPG', note: t.formatJpg },
  pdf: { name: t.formatPdfName, note: t.formatPdf },
  'pdf-print': { name: t.formatPrintName, note: t.formatPrint },
  svg: { name: 'SVG', note: t.formatSvg },
  gif: { name: 'GIF', note: t.formatGif },
  video: { name: t.formatVideoName, note: t.formatVideo },
  reboslides: { name: 'ReboSlides', note: t.formatFile },
});

export interface ExportSettings {
  kind: ExportKind;
  /** How many times the size of the slide in pixels a picture is. */
  scale: number;
  transparent: boolean;
  /** Of a JPG, from 0.1 to 1. */
  quality: number;
  bleed: boolean;
  cropMarks: boolean;
  /** How long each slide is shown in a GIF or a video. */
  seconds: number;
  fade: boolean;
}

export const DEFAULT_SETTINGS: ExportSettings = { kind: 'png', scale: 1, transparent: false, quality: 0.9, bleed: true, cropMarks: true, seconds: 3, fade: true };

/** Three millimetres, the bleed print shops ask for. */
const BLEED = (3 / 25.4) * 72;
/** How long a fade between slides lasts. */
const FADE_MS = 500;
const FADE_FRAMES = 6;

export interface ExportContext {
  deck: Deck;
  /** The slides to export, by index. */
  pages: number[];
  measurer: TextMeasurer;
  images: ImageStore;
  layoutOf: (e: Parameters<NonNullable<DrawContext['layoutOf']>>[0]) => Layout;
  /** How far along it is, from 0 to 1. */
  progress: (fraction: number) => void;
  /** What it says when it cannot; Spanish when not given. */
  t?: Strings;
}

/** The type of video this browser records, and its extension: MP4 where it can, WebM otherwise. */
export function videoFormat(): { mime: string; extension: string } | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const [mime, extension] of [
    ['video/mp4;codecs=avc1', '.mp4'],
    ['video/mp4', '.mp4'],
    ['video/webm;codecs=vp9', '.webm'],
    ['video/webm', '.webm'],
  ])
    if (MediaRecorder.isTypeSupported(mime)) return { mime, extension };
  return undefined;
}

const blobOf = (canvas: HTMLCanvasElement, type: string, quality?: number, t: Strings = ES) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(t.noImage))), type, quality));

/** The width in pixels of a picture of a slide at `scale`, whole. */
export const pixelWidth = (deck: Deck, scale: number) => Math.max(1, Math.round(toUnit(deck.size.width, 'px') * scale));
export const pixelHeight = (deck: Deck, scale: number) => Math.max(1, Math.round(toUnit(deck.size.height, 'px') * scale));

/** One file, or several in a ZIP named after the deck. */
async function deliver(deck: Deck, files: { name: string; data: Blob | Uint8Array | string }[], type: string): Promise<void> {
  if (files.length === 1) {
    const [only] = files;
    download(only.data instanceof Blob ? only.data : new Blob([only.data as BlobPart], { type }), only.name);
    return;
  }
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) entries[f.name] = f.data instanceof Blob ? new Uint8Array(await f.data.arrayBuffer()) : typeof f.data === 'string' ? new TextEncoder().encode(f.data) : f.data;
  download(new Blob([zipSync(entries, { level: 0 }) as BlobPart], { type: 'application/zip' }), fileName(deck.title, '.zip'));
}

export async function runExport(settings: ExportSettings, ctx: ExportContext): Promise<void> {
  const { deck, pages } = ctx;
  const slides = pages.map((i) => deck.slides[i]);
  const drawContext: DrawContext = { measurer: ctx.measurer, images: ctx.images, layoutOf: ctx.layoutOf };
  const nameOf = (i: number, extension: string) => (pages.length === 1 && deck.slides.length === 1 ? fileName(deck.title, extension) : fileName(`${deck.title} ${pages[i] + 1}`, extension));
  await ctx.images.ready(slides);

  switch (settings.kind) {
    case 'png':
    case 'jpg': {
      const jpg = settings.kind === 'jpg';
      const files = [];
      for (const [i, slide] of slides.entries()) {
        const canvas = slideCanvas(slide, deck.size, pixelWidth(deck, settings.scale), { ...drawContext, transparent: !jpg && settings.transparent });
        files.push({ name: nameOf(i, jpg ? '.jpg' : '.png'), data: await blobOf(canvas, jpg ? 'image/jpeg' : 'image/png', jpg ? settings.quality : undefined, ctx.t) });
        ctx.progress((i + 1) / slides.length);
      }
      return deliver(deck, files, jpg ? 'image/jpeg' : 'image/png');
    }
    case 'pdf':
    case 'pdf-print': {
      const print = settings.kind === 'pdf-print' ? { bleed: settings.bleed ? BLEED : 0, cropMarks: settings.cropMarks } : undefined;
      const pdf = await deckPdf({ ...deck, slides }, { measurer: ctx.measurer, images: ctx.images, layoutOf: ctx.layoutOf, print });
      ctx.progress(1);
      return deliver(deck, [{ name: fileName(deck.title, '.pdf'), data: pdf }], 'application/pdf');
    }
    case 'svg': {
      const files = slides.map((slide, i) => ({ name: nameOf(i, '.svg'), data: slideSvg(slide, deck.size, { measurer: ctx.measurer, layoutOf: ctx.layoutOf, fontsUrl: googleFontsUrl() }) }));
      ctx.progress(1);
      return deliver(deck, files, 'image/svg+xml');
    }
    case 'gif': {
      const width = pixelWidth(deck, settings.scale);
      const pictures = slides.map((slide) => slideCanvas(slide, deck.size, width, drawContext));
      const pixels = (canvas: HTMLCanvasElement) => canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      const frames: Parameters<typeof encodeGif>[0] = [];
      const blend = document.createElement('canvas');
      blend.width = pictures[0].width;
      blend.height = pictures[0].height;
      const b = blend.getContext('2d', { willReadFrequently: true })!;
      for (const [i, picture] of pictures.entries()) {
        frames.push({ width: picture.width, height: picture.height, rgba: pixels(picture), delay: settings.seconds * 1000 });
        const next = pictures[i + 1] ?? (pictures.length > 1 ? pictures[0] : undefined);
        // A fade to the next slide, in a few frames between them; the last fades back to the first, as the GIF loops.
        if (settings.fade && next)
          for (let f = 1; f <= FADE_FRAMES; f++) {
            b.globalAlpha = 1;
            b.drawImage(picture, 0, 0);
            b.globalAlpha = f / (FADE_FRAMES + 1);
            b.drawImage(next, 0, 0);
            frames.push({ width: blend.width, height: blend.height, rgba: new Uint8Array(b.getImageData(0, 0, blend.width, blend.height).data), delay: FADE_MS / FADE_FRAMES });
          }
        ctx.progress(((i + 1) / pictures.length) * 0.5);
      }
      // Encoding takes a moment: let the progress show before it.
      await new Promise((resolve) => setTimeout(resolve, 30));
      const gif = encodeGif(frames);
      ctx.progress(1);
      return deliver(deck, [{ name: fileName(deck.title, '.gif'), data: gif }], 'image/gif');
    }
    case 'video':
      return recordVideo(settings, ctx, slides, drawContext);
    case 'reboslides':
      ctx.progress(1);
      return deliver(deck, [{ name: fileName(deck.title, FILE_EXTENSION), data: serializeDeck(deck) }], 'application/json');
  }
}

/** The slides played on a canvas, one after another, as the browser records them: it takes as long as the video lasts. */
async function recordVideo(settings: ExportSettings, ctx: ExportContext, slides: Deck['slides'], drawContext: DrawContext): Promise<void> {
  const format = videoFormat();
  if (!format) throw new Error((ctx.t ?? ES).noVideo);
  const { deck } = ctx;
  // Codecs want even sides.
  const width = pixelWidth(deck, settings.scale) & ~1;
  const height = pixelHeight(deck, settings.scale) & ~1;
  const pictures = slides.map((slide) => slideCanvas(slide, deck.size, width, drawContext));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d')!;
  c.drawImage(pictures[0], 0, 0, width, height);
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
  const each = settings.seconds * 1000;
  const total = each * pictures.length;
  recorder.start(250);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const frame = () => {
      const t = performance.now() - start;
      if (t >= total) return resolve();
      const i = Math.min(pictures.length - 1, Math.floor(t / each));
      const into = t - i * each;
      c.globalAlpha = 1;
      c.drawImage(pictures[i], 0, 0, width, height);
      // The last half second of a slide fades into the next.
      if (settings.fade && i + 1 < pictures.length && into > each - FADE_MS) {
        c.globalAlpha = (into - (each - FADE_MS)) / FADE_MS;
        c.drawImage(pictures[i + 1], 0, 0, width, height);
      }
      ctx.progress(t / total);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  recorder.stop();
  await stopped;
  for (const track of stream.getTracks()) track.stop();
  ctx.progress(1);
  return deliver(deck, [{ name: fileName(deck.title, format.extension), data: new Blob(chunks, { type: format.mime.split(';')[0] }) }], format.mime);
}
