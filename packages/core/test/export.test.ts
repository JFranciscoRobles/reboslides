import { readFileSync } from 'node:fs';
import { FontMeasurer, readFont } from '@rebodocs/core';
import { describe, expect, it } from 'vitest';
import { addElements, createDeck, createShape, createText, encodeGif, exportDeckPdf, parsePages, slideSvg } from '../src/index';
import { lzw } from '../src/gif';

const courier = readFont(new Uint8Array(readFileSync(new URL('./fixtures/CourierPrime-Regular.ttf', import.meta.url))))!;
const measurer = new FontMeasurer([courier]);

describe('pages typed', () => {
  it('are read as a print dialog reads them', () => {
    expect(parsePages('1-3, 5', 6)).toEqual([0, 1, 2, 4]);
    expect(parsePages('4,2,2', 6)).toEqual([1, 3]);
    expect(parsePages(' 2 – 3 ', 6)).toEqual([1, 2]);
  });

  it('are refused when they name no slide, or one the deck has not', () => {
    for (const text of ['', '0', '7', '3-1', 'a', '1-', '1-9']) expect(parsePages(text, 6), text).toBeUndefined();
  });
});

/** The indices back from LZW, as a GIF reader takes them. */
function unlzw(data: Uint8Array, minCodeSize = 8): number[] {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let size = minCodeSize + 1;
  let table: number[][] = [];
  const reset = () => {
    table = Array.from({ length: end + 1 }, (_, i) => [i]);
    size = minCodeSize + 1;
  };
  reset();
  const out: number[] = [];
  let bit = 0;
  let previous: number[] | undefined;
  for (;;) {
    let code = 0;
    for (let i = 0; i < size; i++, bit++) code |= ((data[bit >> 3] >> (bit & 7)) & 1) << i;
    if (code === clear) {
      reset();
      previous = undefined;
      continue;
    }
    if (code === end) return out;
    const entry = code < table.length ? table[code] : [...previous!, previous![0]];
    out.push(...entry);
    if (previous && table.length < 4096) table.push([...previous, entry[0]]);
    previous = entry;
    if (table.length === 1 << size && size < 12) size++;
  }
}

describe('a GIF', () => {
  it('squeezes indices so that a reader gets them back, past a full table', () => {
    const indices = new Uint8Array(20000).map((_, i) => (i * 7 + (i >> 5)) % 251);
    expect(unlzw(lzw(indices))).toEqual([...indices]);
  });

  it('is a GIF89a that loops, a frame to each slide', () => {
    const frame = (r: number) => ({ width: 4, height: 2, delay: 1500, rgba: new Uint8Array(32).map((_, i) => (i % 4 === 0 ? r : i % 4 === 3 ? 255 : 0)) });
    const gif = encodeGif([frame(255), frame(0)]);
    const text = new TextDecoder('latin1').decode(gif);
    expect(text.startsWith('GIF89a')).toBe(true);
    expect(text).toContain('NETSCAPE2.0');
    expect(gif[6] | (gif[7] << 8)).toBe(4);
    expect(gif.at(-1)).toBe(0x3b);
    // Two frames, each shown 150 hundredths.
    const controls = [...gif.keys()].filter((i) => gif[i] === 0x21 && gif[i + 1] === 0xf9 && gif[i + 4] === 150 && gif[i + 5] === 0);
    expect(controls).toHaveLength(2);
  });
});

describe('the SVG of a slide', () => {
  it('has its shapes as paths, its gradients, and its text as text', () => {
    const deck = createDeck();
    const slideId = deck.slides[0].id;
    const withThings = addElements(deck, slideId, [
      { ...createShape('star', { x: 10, y: 10, width: 100, height: 100 }), rotation: 30, fill: { kind: 'gradient', from: 'FF0000', to: '0000FF', angle: 0 } },
      createText('Hola & <adiós>', { x: 100, y: 200, width: 400 }, { run: { fontFamily: 'Courier Prime', fontSize: 30 } }),
    ]);
    const svg = slideSvg(withThings.slides[0], deck.size, { measurer, fontsUrl: 'https://fonts.example/css?a=1&b=2' });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 960 540">')).toBe(true);
    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('rotate(30 50 50)');
    expect(svg).toContain('>Hola &amp; &lt;adiós&gt;</text>');
    expect(svg).toContain('font-family="Courier Prime"');
    expect(svg).toContain('a=1&amp;b=2');
  });
});

describe('a PDF for printing', () => {
  it('has its bleed and its crop marks round each slide, and says where it is cut', () => {
    const raw = new TextDecoder('latin1').decode(exportDeckPdf(createDeck(), { measurer, bleed: 9, cropMarks: true }));
    // 9 points of bleed and 18 of room for the marks on each side.
    expect(raw).toContain('/MediaBox [0 0 1014 594]');
    expect(raw).toContain('/TrimBox [27 27 987 567]');
    expect(raw).toContain('/BleedBox [18 18 996 576]');
    const plain = new TextDecoder('latin1').decode(exportDeckPdf(createDeck(), { measurer }));
    expect(plain).toContain('/MediaBox [0 0 960 540]');
    expect(plain).not.toContain('/TrimBox');
  });
});
