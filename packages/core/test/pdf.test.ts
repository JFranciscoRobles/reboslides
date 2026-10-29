import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FontMeasurer, readFont } from '@rebodocs/core';
import { describe, expect, it } from 'vitest';
import { addElements, createDeck, createShape, createText, exportDeckPdf, fitText } from '../src/index';

const courier = readFont(new Uint8Array(readFileSync(new URL('./fixtures/CourierPrime-Regular.ttf', import.meta.url))))!;
const measurer = new FontMeasurer([courier]);

function deckWith(...elements: Parameters<typeof addElements>[2]) {
  const deck = createDeck('Prueba de PDF');
  return addElements(deck, deck.slides[0].id, elements);
}

const text = (content: string) => fitText(createText(content, { x: 60, y: 60, width: 600 }, { run: { fontFamily: 'Courier Prime', fontSize: 32 } }), measurer);

/** The text a reader takes out of the PDF, when there is pdftotext on the machine to ask. */
function extracted(pdf: Uint8Array): string | undefined {
  const file = join(tmpdir(), `reboslides-${process.pid}.pdf`);
  writeFileSync(file, pdf);
  try {
    return execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
  } catch {
    return undefined;
  }
}

describe('the PDF of a deck', () => {
  it('has a page to each slide, of their size', () => {
    let deck = deckWith();
    deck = { ...deck, slides: [...deck.slides, { ...deck.slides[0], id: 'b' }] };
    const pdf = new TextDecoder('latin1').decode(exportDeckPdf(deck, { measurer }));
    expect(pdf.startsWith('%PDF-1.7')).toBe(true);
    expect(pdf.match(/\/Type \/Page /g)).toHaveLength(2);
    expect(pdf).toContain('/MediaBox [0 0 960 540]');
  });

  it('carries its fonts, cut down, with what each letter stands for: its text can be copied', () => {
    const pdf = exportDeckPdf(deckWith(text('Hola, señora Muñoz')), { measurer, font: (f) => (f.family === 'Courier Prime' ? courier.bytes : undefined) });
    const raw = new TextDecoder('latin1').decode(pdf);
    expect(raw).toContain('/CIDFontType2');
    expect(raw).toContain('/ToUnicode');
    // Cut down to the letters used, it is far smaller than the font.
    expect(pdf.length).toBeLessThan(courier.bytes.length / 2);
    const out = extracted(pdf);
    if (out !== undefined) expect(out).toContain('Hola, señora Muñoz');
  });

  it('sets text in the nearest standard font when it is given no file', () => {
    const raw = new TextDecoder('latin1').decode(exportDeckPdf(deckWith(text('Sin archivo')), { measurer }));
    expect(raw).toContain('/BaseFont /Courier /Encoding /WinAnsiEncoding');
  });

  it('draws as a picture a box of letters no font has', () => {
    let asked = 0;
    const raw = new TextDecoder('latin1').decode(
      exportDeckPdf(deckWith(text('Hola 🚀')), {
        measurer,
        font: () => courier.bytes,
        picture: () => (asked++, { width: 1, height: 1, rgb: new Uint8Array(3), alpha: new Uint8Array([255]) }),
      }),
    );
    expect(asked).toBe(1);
    expect(raw).toContain('/Subtype /Image');
    expect(raw).not.toContain('/FontFile2');
  });

  it('draws gradients, transparency and turned shapes', () => {
    const shape = { ...createShape('star', { x: 100, y: 100, width: 100, height: 100 }), rotation: 30, opacity: 0.5, fill: { kind: 'gradient' as const, from: 'FF0000', to: '0000FF', angle: 45 } };
    const raw = new TextDecoder('latin1').decode(exportDeckPdf(deckWith(shape), { measurer }));
    expect(raw).toContain('/ShadingType 2');
    expect(raw).toContain('/ca 0.5');
  });
});
