// A deck as a file: JSON, with its pictures in it as data: URLs, so that one
// file is the whole of it. `.reboslides` is its extension.

import { type Deck, DEFAULT_SIZE } from './model';
import { UNITS } from './units';

export const FILE_FORMAT = 'reboslides';
export const FILE_VERSION = 1;
export const FILE_EXTENSION = '.reboslides';

/**
 * JSON that keeps the Maps of a text's document (its list numbering): each
 * written `{ "$map": [[key, value], …] }`, and made a Map again when read.
 */
export function toJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (v instanceof Map ? { $map: [...v] } : v));
}

/** What `toJson` wrote. A numbering kept before its Maps were written, as `{}`, comes back as empty Maps. */
export function fromJson<T = unknown>(text: string): T {
  return JSON.parse(text, (key, v) => {
    if (v && typeof v === 'object' && Array.isArray(v.$map)) return new Map(v.$map);
    if (key === 'numbering' && v && typeof v === 'object') {
      const asMap = (m: unknown) => (m instanceof Map ? m : new Map());
      return { ...v, abstracts: asMap(v.abstracts), lists: asMap(v.lists) };
    }
    return v;
  });
}

export function serializeDeck(deck: Deck): string {
  return toJson({ format: FILE_FORMAT, version: FILE_VERSION, deck });
}

/** The deck in a file, or an error that says why it is not one. */
export function parseDeck(text: string): Deck {
  let data: unknown;
  try {
    data = fromJson(text);
  } catch {
    throw new Error('El archivo no es una presentación de ReboSlides.');
  }
  const file = data as { format?: unknown; version?: unknown; deck?: Partial<Deck> };
  if (file?.format !== FILE_FORMAT || !file.deck || !Array.isArray(file.deck.slides)) throw new Error('El archivo no es una presentación de ReboSlides.');
  if (typeof file.version !== 'number' || file.version > FILE_VERSION) throw new Error('La presentación es de una versión más nueva de ReboSlides.');
  const { deck } = file;
  return {
    title: typeof deck.title === 'string' ? deck.title : 'Presentación sin título',
    size: deck.size && deck.size.width > 0 && deck.size.height > 0 ? deck.size : DEFAULT_SIZE,
    slides: deck.slides!.length ? deck.slides! : [{ id: 's0', background: { kind: 'solid', color: 'FFFFFF' }, elements: [] }],
    ...(deck.unit && UNITS.includes(deck.unit) ? { unit: deck.unit } : {}),
  };
}
