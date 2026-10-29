// The families the studio offers, and their loading: a canvas measures with a
// font only once the browser has it, so each is asked for before the text set
// in it is laid out, and the text laid out again when one arrives late.

import { THEME_FONTS } from '@reboslides/core';

export const FONTS = [
  ...new Set([
    ...THEME_FONTS,
    'Inter',
    'Poppins',
    'Montserrat',
    'Playfair Display',
    'Lora',
    'DM Serif Display',
    'Space Grotesk',
    'Bebas Neue',
    'Caveat',
    'Pacifico',
    'Roboto Mono',
    'Arial',
    'Georgia',
  ]),
];

/** The families on Google Fonts, as a stylesheet URL with the weights and styles text is set in. */
export function googleFontsUrl(families = FONTS.filter((f) => f !== 'Arial' && f !== 'Georgia')): string {
  const one = (f: string) => {
    const name = f.replace(/ /g, '+');
    // Families with a single weight and no italic are asked for as they are, or the whole request fails.
    return ['Bebas Neue', 'Pacifico', 'DM Serif Display', 'Caveat'].includes(f) ? `family=${name}` : `family=${name}:ital,wght@0,400;0,700;1,400;1,700`;
  };
  return `https://fonts.googleapis.com/css2?${families.map(one).join('&')}&display=swap`;
}

/**
 * The stylesheets of fonts in the page, once each has come. Before, the browser knows no face of their families:
 * WebKit answers a font asked for then with none, and a canvas never asks for it again.
 */
export function fontSheets(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href*="fonts.googleapis.com"]')];
  const pending = links.filter((link) => !link.sheet);
  return Promise.all(
    pending.map(
      (link) =>
        new Promise<void>((resolve) => {
          link.addEventListener('load', () => resolve(), { once: true });
          link.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  ).then(() => {});
}

/**
 * Every family, plain, bold and italic, asked for once the stylesheets that say where they are have come; `onChange` called, a few at
 * a time, as they come, for the text set in them to be measured again. Not
 * every browser says when a font has come by an event of `document.fonts`.
 */
export function loadFonts(onChange: () => void, families = FONTS): void {
  if (typeof document === 'undefined' || !document.fonts) return;
  let timer = 0;
  const changed = () => {
    clearTimeout(timer);
    timer = window.setTimeout(onChange, 120);
  };
  document.fonts.addEventListener?.('loadingdone', changed);
  void fontSheets().then(() => {
    for (const f of families)
      for (const style of ['', 'bold ', 'italic ', 'italic bold '])
        document.fonts.load(`${style}16px "${f}"`).then(
          (faces) => faces.length && changed(),
          () => {},
        );
  });
}

/** Families whose files are on Fontsource, where they are given as TrueType: what a PDF takes. Those of the machine are not. */
const FONTSOURCE = new Set(FONTS.filter((f) => f !== 'Arial' && f !== 'Georgia'));
const files = new Map<string, Promise<Uint8Array | undefined>>();

export const faceKey = (face: { family: string; bold: boolean; italic: boolean }) => `${face.family}|${face.bold}|${face.italic}`;

/** The TrueType file of a face, its latin letters, fetched once; undefined for a face there is none of. */
export function fontFileOf(face: { family: string; bold: boolean; italic: boolean }): Promise<Uint8Array | undefined> {
  const key = faceKey(face);
  let file = files.get(key);
  if (!file) {
    const id = face.family.toLowerCase().replace(/\s+/g, '-');
    const url = `https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/latin-${face.bold ? 700 : 400}-${face.italic ? 'italic' : 'normal'}.ttf`;
    file = FONTSOURCE.has(face.family)
      ? fetch(url)
          .then((r) => (r.ok ? r.arrayBuffer() : undefined))
          .then((b) => b && new Uint8Array(b))
          .catch(() => undefined)
      : Promise.resolve(undefined);
    files.set(key, file);
  }
  return file;
}
