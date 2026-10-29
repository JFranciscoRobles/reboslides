// The deck as a PDF with its text as text. What the browser does for it is
// fetch the font files, decode the pictures, and draw as a picture any box
// of text with letters no font file has, such as an emoji.

import { type Deck, type DeckPdfOptions, type TextElement, exportDeckPdf } from '@reboslides/core';
import type { Layout, PdfImage, TextMeasurer } from './engine';
import { faceKey, fontFileOf } from './fonts';
import { type ImageStore, drawElement } from './render';

/** The longest side, in pixels, a picture keeps in a PDF. */
const MAX_PIXELS = 2400;
/** Pixels to the point of a box of text drawn as a picture. */
const PICTURE_SCALE = 3;

function pixels(source: CanvasImageSource, width: number, height: number, draw?: (ctx: CanvasRenderingContext2D) => void): PdfImage | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  if (draw) draw(ctx);
  else ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rgb = new Uint8Array(canvas.width * canvas.height * 3);
  const alpha = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0, p = 0; i < alpha.length; i++, p += 4) {
    rgb[i * 3] = data[p];
    rgb[i * 3 + 1] = data[p + 1];
    rgb[i * 3 + 2] = data[p + 2];
    alpha[i] = data[p + 3];
  }
  return { width: canvas.width, height: canvas.height, rgb, alpha };
}

function dataBytes(src: string): Uint8Array {
  const binary = atob(src.slice(src.indexOf(',') + 1));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** `print` adds what a print shop asks for: bleed and crop marks. */
export async function deckPdf(
  deck: Deck,
  options: { measurer: TextMeasurer; images: ImageStore; layoutOf: (e: TextElement) => Layout; print?: Pick<DeckPdfOptions, 'bleed' | 'cropMarks'> },
): Promise<Uint8Array<ArrayBuffer>> {
  // Every face the text is set in, labels of lists too, and the regular face of each family, which stands in for one there is no file of.
  const faces = new Map<string, { family: string; bold: boolean; italic: boolean }>();
  for (const slide of deck.slides)
    for (const e of slide.elements) {
      if (e.type !== 'text') continue;
      for (const line of options.layoutOf(e).lines)
        for (const f of [...line.fragments, ...(line.label ? [line.label] : [])]) {
          const { family, bold, italic } = f.font;
          faces.set(faceKey(f.font), { family, bold, italic });
          faces.set(faceKey({ family, bold: false, italic: false }), { family, bold: false, italic: false });
        }
    }
  const fonts = new Map<string, Uint8Array | undefined>();
  await Promise.all([...faces].map(async ([key, face]) => fonts.set(key, await fontFileOf(face))));

  await options.images.ready(deck.slides);
  const pictures = new Map<string, PdfImage | undefined>();
  for (const slide of deck.slides)
    for (const e of slide.elements) {
      if (e.type !== 'image' || pictures.has(e.src)) continue;
      const image = options.images.get(e.src);
      if (!image) continue;
      const shrink = Math.min(1, MAX_PIXELS / Math.max(image.naturalWidth, image.naturalHeight));
      // A JPEG small enough goes in as it is; anything else as its pixels and their transparency.
      if (e.src.startsWith('data:image/jpeg') && shrink === 1) pictures.set(e.src, { width: image.naturalWidth, height: image.naturalHeight, jpeg: dataBytes(e.src) });
      else pictures.set(e.src, pixels(image, image.naturalWidth * shrink, image.naturalHeight * shrink));
    }

  return exportDeckPdf(deck, {
    measurer: options.measurer,
    layoutOf: options.layoutOf,
    font: (face) => fonts.get(faceKey(face)),
    image: (src) => pictures.get(src),
    picture: (e) =>
      pixels(new Image(), e.width * PICTURE_SCALE, e.height * PICTURE_SCALE, (ctx) => {
        ctx.scale(PICTURE_SCALE, PICTURE_SCALE);
        // Where it is, how it is turned and how transparent it is, the PDF says.
        drawElement(ctx, { ...e, x: 0, y: 0, rotation: 0, opacity: 1 }, { measurer: options.measurer, images: options.images, layoutOf: options.layoutOf });
      }),
    title: deck.title,
    ...options.print,
  });
}
