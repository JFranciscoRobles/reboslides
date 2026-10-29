// A deck's changes as small pieces of data: what tells two people's studios,
// a server and an assistant what was done, without sending the whole deck.
// Every change made by the engine gives a new deck and leaves the parts it did
// not touch as they were, so what changed is found by comparing the two:
// whatever is not the same object is new.
//
// Each change says what something is now, not how it got there: a slide's
// background, an element whole, an order. Two people changing the same
// element is settled by the one that got to the server last; two changing
// different elements of a slide keep both. A change to something that is no
// longer there is let go.

import type { Deck, Element, Fill, Slide, SlideSize } from './model';
import type { Unit } from './units';

export type Change =
  /** The title, the size and the unit of the deck. */
  | { op: 'deck'; title: string; size: SlideSize; unit?: Unit }
  /** A slide put in at `at`, with its elements. */
  | { op: 'add-slide'; slide: Slide; at: number }
  | { op: 'remove-slide'; slide: string }
  /** The order of the slides, by their ids. */
  | { op: 'slides'; order: string[] }
  /** What a slide is besides its elements. */
  | { op: 'slide'; slide: string; background: Fill; notes?: string }
  /** An element as it is now, put in at `at` (on top when not said) if it was not on the slide. */
  | { op: 'put'; slide: string; element: Element; at?: number }
  | { op: 'remove'; slide: string; element: string }
  /** The order of the elements of a slide, the last on top. */
  | { op: 'order'; slide: string; order: string[] };

const sameIds = (a: { id: string }[], b: string[]) => a.length === b.length && a.every((item, i) => item.id === b[i]);

/** The changes that make `before` into `after`. */
export function diffDecks(before: Deck, after: Deck): Change[] {
  if (before === after) return [];
  const changes: Change[] = [];
  if (before.title !== after.title || before.size.width !== after.size.width || before.size.height !== after.size.height || before.unit !== after.unit) {
    changes.push({ op: 'deck', title: after.title, size: after.size, ...(after.unit ? { unit: after.unit } : {}) });
  }
  const old = new Map(before.slides.map((slide) => [slide.id, slide]));
  const now = new Set(after.slides.map((slide) => slide.id));
  for (const slide of before.slides) if (!now.has(slide.id)) changes.push({ op: 'remove-slide', slide: slide.id });
  after.slides.forEach((slide, at) => {
    const was = old.get(slide.id);
    if (!was) changes.push({ op: 'add-slide', slide, at });
    else if (was !== slide) changes.push(...diffSlide(was, slide));
  });
  // The order of the slides both have, when it is not the one adding and taking away leaves.
  const kept = before.slides.filter((slide) => now.has(slide.id)).map((slide) => slide.id);
  const order = after.slides.filter((slide) => old.has(slide.id)).map((slide) => slide.id);
  if (kept.join() !== order.join()) changes.push({ op: 'slides', order: after.slides.map((slide) => slide.id) });
  return changes;
}

function diffSlide(before: Slide, after: Slide): Change[] {
  const changes: Change[] = [];
  if (before.background !== after.background || before.notes !== after.notes) {
    changes.push({ op: 'slide', slide: after.id, background: after.background, ...(after.notes !== undefined ? { notes: after.notes } : {}) });
  }
  const old = new Map(before.elements.map((element) => [element.id, element]));
  const now = new Set(after.elements.map((element) => element.id));
  for (const element of before.elements) if (!now.has(element.id)) changes.push({ op: 'remove', slide: after.id, element: element.id });
  after.elements.forEach((element, at) => {
    const was = old.get(element.id);
    if (!was) changes.push({ op: 'put', slide: after.id, element, at });
    else if (was !== element) changes.push({ op: 'put', slide: after.id, element });
  });
  const kept = before.elements.filter((element) => now.has(element.id)).map((element) => element.id);
  const order = after.elements.filter((element) => old.has(element.id)).map((element) => element.id);
  if (kept.join() !== order.join()) changes.push({ op: 'order', slide: after.id, order: after.elements.map((element) => element.id) });
  return changes;
}

/** `items` in the order of `ids`; those `ids` does not name keep their place after the ones before them. */
function reorder<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const by = new Map(items.map((item) => [item.id, item]));
  const named = ids.filter((id) => by.has(id));
  if (sameIds(items, named)) return items;
  const rest = items.filter((item) => !ids.includes(item.id));
  const out = named.map((id) => by.get(id)!);
  // What someone else added meanwhile stays near where it was put.
  for (const item of rest) out.splice(Math.min(items.indexOf(item), out.length), 0, item);
  return out;
}

function onSlide(deck: Deck, id: string, change: (slide: Slide) => Slide): Deck {
  const at = deck.slides.findIndex((slide) => slide.id === id);
  if (at < 0) return deck;
  const next = change(deck.slides[at]);
  if (next === deck.slides[at]) return deck;
  const slides = deck.slides.slice();
  slides[at] = next;
  return { ...deck, slides };
}

/** One change made to a deck; the deck as it was when it names what is no longer there. */
export function applyChange(deck: Deck, change: Change): Deck {
  switch (change.op) {
    case 'deck': {
      const { op: _op, ...meta } = change;
      const { unit: _unit, ...rest } = deck;
      return { ...rest, ...meta };
    }
    case 'add-slide': {
      if (deck.slides.some((slide) => slide.id === change.slide.id)) return deck;
      const slides = deck.slides.slice();
      slides.splice(Math.max(0, Math.min(change.at, slides.length)), 0, change.slide);
      return { ...deck, slides };
    }
    case 'remove-slide': {
      // A deck keeps one slide at least.
      if (deck.slides.length < 2) return deck;
      const slides = deck.slides.filter((slide) => slide.id !== change.slide);
      return slides.length === deck.slides.length ? deck : { ...deck, slides };
    }
    case 'slides': {
      const slides = reorder(deck.slides, change.order);
      return slides === deck.slides ? deck : { ...deck, slides };
    }
    case 'slide':
      return onSlide(deck, change.slide, (slide) => {
        const { notes: _notes, ...rest } = slide;
        return { ...rest, background: change.background, ...(change.notes !== undefined ? { notes: change.notes } : {}) };
      });
    case 'put':
      return onSlide(deck, change.slide, (slide) => {
        const at = slide.elements.findIndex((element) => element.id === change.element.id);
        const elements = slide.elements.slice();
        if (at >= 0) elements[at] = change.element;
        else elements.splice(change.at === undefined ? elements.length : Math.max(0, Math.min(change.at, elements.length)), 0, change.element);
        return { ...slide, elements };
      });
    case 'remove':
      return onSlide(deck, change.slide, (slide) => {
        const elements = slide.elements.filter((element) => element.id !== change.element);
        return elements.length === slide.elements.length ? slide : { ...slide, elements };
      });
    case 'order':
      return onSlide(deck, change.slide, (slide) => {
        const elements = reorder(slide.elements, change.order);
        return elements === slide.elements ? slide : { ...slide, elements };
      });
  }
}

/** Changes made to a deck in their order. */
export function applyChanges(deck: Deck, changes: readonly Change[]): Deck {
  return changes.reduce(applyChange, deck);
}
