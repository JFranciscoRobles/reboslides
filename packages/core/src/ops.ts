// The changes made to a deck. None changes the deck it is given: each returns
// a new one, sharing what it did not touch, so that the one before is kept for
// undoing and a slide not changed is known by being the same object.

import { type Deck, type Element, type Fill, type Slide, copyElement, copySlide, createSlide } from './model';
import { scaleText } from './text';
import type { Unit } from './units';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function withSlide(deck: Deck, slideId: string, change: (slide: Slide) => Slide): Deck {
  const index = deck.slides.findIndex((s) => s.id === slideId);
  if (index < 0) return deck;
  const changed = change(deck.slides[index]);
  if (changed === deck.slides[index]) return deck;
  const slides = deck.slides.slice();
  slides[index] = changed;
  return { ...deck, slides };
}

export function setTitle(deck: Deck, title: string): Deck {
  return { ...deck, title };
}

/** The unit the deck is shown in. Nothing of it changes: its lengths are kept in points. */
export function setUnit(deck: Deck, unit: Unit): Deck {
  return deck.unit === unit ? deck : { ...deck, unit };
}

/** An element `k` times as big about the top left corner of the slide, then moved by (dx, dy): its text, outline and corners with it. */
function scaled(e: Element, k: number, dx: number, dy: number): Element {
  const placed = { ...e, x: e.x * k + dx, y: e.y * k + dy, width: e.width * k, height: e.height * k };
  if (e.type === 'text') return { ...placed, doc: scaleText(e.doc, k) } as Element;
  if (e.type === 'shape') return { ...placed, strokeWidth: e.strokeWidth * k } as Element;
  return { ...placed, radius: e.radius * k } as Element;
}

/**
 * The slides made `size`. With `fit`, what is on them is scaled as much as
 * fits the new size whole and centred in it, as a picture is when its frame
 * changes; without it, everything stays where it was, measured from the top
 * left corner.
 */
export function resizeDeck(deck: Deck, size: { width: number; height: number }, fit = true): Deck {
  const width = Math.max(1, size.width);
  const height = Math.max(1, size.height);
  if (Math.abs(width - deck.size.width) < 0.001 && Math.abs(height - deck.size.height) < 0.001) return deck;
  if (!fit) return { ...deck, size: { width, height } };
  const k = Math.min(width / deck.size.width, height / deck.size.height);
  const dx = (width - deck.size.width * k) / 2;
  const dy = (height - deck.size.height * k) / 2;
  return { ...deck, size: { width, height }, slides: deck.slides.map((s) => ({ ...s, elements: s.elements.map((e) => scaled(e, k, dx, dy)) })) };
}

/** A slide put at `index`, after the last one when not said: a new empty one with the background of the one before it, when none is given. */
export function addSlide(deck: Deck, index = deck.slides.length, slide?: Slide): Deck {
  const at = Math.max(0, Math.min(index, deck.slides.length));
  const added = slide ?? createSlide(deck.slides[at - 1]?.background);
  const slides = deck.slides.slice();
  slides.splice(at, 0, added);
  return { ...deck, slides };
}

export function duplicateSlide(deck: Deck, slideId: string): Deck {
  const index = deck.slides.findIndex((s) => s.id === slideId);
  return index < 0 ? deck : addSlide(deck, index + 1, copySlide(deck.slides[index]));
}

/** The deck without the slide; the last slide is not deleted, but left empty. */
export function deleteSlide(deck: Deck, slideId: string): Deck {
  if (deck.slides.length === 1) return withSlide(deck, slideId, (s) => ({ ...s, elements: [] }));
  return { ...deck, slides: deck.slides.filter((s) => s.id !== slideId) };
}

export function moveSlide(deck: Deck, from: number, to: number): Deck {
  if (from === to || from < 0 || from >= deck.slides.length) return deck;
  const slides = deck.slides.slice();
  const [moved] = slides.splice(from, 1);
  slides.splice(Math.max(0, Math.min(to, slides.length)), 0, moved);
  return { ...deck, slides };
}

export function setBackground(deck: Deck, slideId: string, background: Fill): Deck {
  return withSlide(deck, slideId, (s) => ({ ...s, background }));
}

export function setNotes(deck: Deck, slideId: string, notes: string): Deck {
  return withSlide(deck, slideId, (s) => ({ ...s, notes }));
}

/** The elements put on top of the others on the slide. */
export function addElements(deck: Deck, slideId: string, elements: Element[]): Deck {
  return withSlide(deck, slideId, (s) => ({ ...s, elements: [...s.elements, ...elements] }));
}

/** Each element named by `ids` changed by `change`; the rest as they were. */
export function updateElements(deck: Deck, slideId: string, ids: readonly string[], change: (element: Element) => Element): Deck {
  const picked = new Set(ids);
  return withSlide(deck, slideId, (s) => {
    let changed = false;
    const elements = s.elements.map((e) => {
      if (!picked.has(e.id)) return e;
      const made = change(e);
      changed ||= made !== e;
      return made;
    });
    return changed ? { ...s, elements } : s;
  });
}

/** Each element named by `ids` with the fields of `patch`. */
export function patchElements(deck: Deck, slideId: string, ids: readonly string[], patch: Partial<Element>): Deck {
  return updateElements(deck, slideId, ids, (e) => ({ ...e, ...patch }) as Element);
}

export function removeElements(deck: Deck, slideId: string, ids: readonly string[]): Deck {
  const picked = new Set(ids);
  return withSlide(deck, slideId, (s) => (s.elements.some((e) => picked.has(e.id)) ? { ...s, elements: s.elements.filter((e) => !picked.has(e.id)) } : s));
}

/** Copies of the elements, a little down and to the right of them, on top; and their names, to pick them. */
export function duplicateElements(deck: Deck, slideId: string, ids: readonly string[], offset = 16): { deck: Deck; ids: string[] } {
  const slide = deck.slides.find((s) => s.id === slideId);
  if (!slide) return { deck, ids: [] };
  const copies = slide.elements.filter((e) => ids.includes(e.id)).map((e) => copyElement(e, offset, offset));
  return { deck: addElements(deck, slideId, copies), ids: copies.map((e) => e.id) };
}

export type Order = 'front' | 'forward' | 'backward' | 'back';

/** The elements moved up or down among the others: one step, or to the top or the bottom of all. */
export function reorderElements(deck: Deck, slideId: string, ids: readonly string[], order: Order): Deck {
  const picked = new Set(ids);
  return withSlide(deck, slideId, (s) => {
    const moving = s.elements.filter((e) => picked.has(e.id));
    if (!moving.length) return s;
    const rest = s.elements.filter((e) => !picked.has(e.id));
    let elements: Element[];
    if (order === 'front') elements = [...rest, ...moving];
    else if (order === 'back') elements = [...moving, ...rest];
    else {
      elements = s.elements.slice();
      // Each picked one swaps with its neighbour, from the end it goes towards, so that a run of them moves together.
      const up = order === 'forward';
      const indices = elements.map((e, i) => (picked.has(e.id) ? i : -1)).filter((i) => i >= 0);
      for (const i of up ? indices.reverse() : indices) {
        const j = up ? i + 1 : i - 1;
        if (j < 0 || j >= elements.length || picked.has(elements[j].id)) continue;
        [elements[i], elements[j]] = [elements[j], elements[i]];
      }
    }
    return elements.every((e, i) => e === s.elements[i]) ? s : { ...s, elements };
  });
}

/** The smallest box level with the slide that holds the element, turned as it is. */
export function boundsOf(element: Rect & { rotation: number }): Rect {
  const turn = (element.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(turn));
  const sin = Math.abs(Math.sin(turn));
  const width = element.width * cos + element.height * sin;
  const height = element.width * sin + element.height * cos;
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

/** The box that holds all of them. */
export function unionOf(rects: Rect[]): Rect {
  if (!rects.length) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * The elements moved and sized as the box `from` that holds them is made the
 * box `to`: each keeps its place in it, and its own sides grow as much as the
 * box does along them, turned as they are. Text set larger with the box when
 * the box grows the same both ways; otherwise its box only, the text laid out
 * again in it. A line keeps its thickness.
 */
export function resizeGroup(deck: Deck, slideId: string, ids: readonly string[], from: Rect, to: Rect): Deck {
  const sx = to.width / Math.max(from.width, 1e-6);
  const sy = to.height / Math.max(from.height, 1e-6);
  const uniform = Math.abs(sx - sy) < 1e-6;
  return updateElements(deck, slideId, ids, (e) => {
    if (e.locked) return e;
    const turn = (e.rotation * Math.PI) / 180;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const width = e.width * Math.hypot(sx * cos, sy * sin);
    const line = e.type === 'shape' && e.shape === 'line';
    const height = line ? e.height : e.height * Math.hypot(sx * sin, sy * cos);
    const cx = to.x + (e.x + e.width / 2 - from.x) * sx;
    const cy = to.y + (e.y + e.height / 2 - from.y) * sy;
    const placed = { ...e, width, height, x: cx - width / 2, y: cy - height / 2 };
    if (e.type === 'text' && uniform) return { ...placed, doc: scaleText(e.doc, sx) } as Element;
    if (e.type === 'image') return { ...placed, radius: e.radius * Math.min(sx, sy) } as Element;
    return placed as Element;
  });
}

export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

/**
 * The elements lined up by an edge or a centre: of the box that holds them
 * all, when there are several, or of the slide, for one alone.
 */
export function alignElements(deck: Deck, slideId: string, ids: readonly string[], how: Alignment): Deck {
  const slide = deck.slides.find((s) => s.id === slideId);
  const picked = slide?.elements.filter((e) => ids.includes(e.id)) ?? [];
  if (!picked.length) return deck;
  const frame = picked.length === 1 ? { x: 0, y: 0, ...deck.size } : unionOf(picked.map(boundsOf));
  return updateElements(deck, slideId, ids, (e) => {
    const b = boundsOf(e);
    let dx = 0;
    let dy = 0;
    if (how === 'left') dx = frame.x - b.x;
    if (how === 'center') dx = frame.x + frame.width / 2 - (b.x + b.width / 2);
    if (how === 'right') dx = frame.x + frame.width - (b.x + b.width);
    if (how === 'top') dy = frame.y - b.y;
    if (how === 'middle') dy = frame.y + frame.height / 2 - (b.y + b.height / 2);
    if (how === 'bottom') dy = frame.y + frame.height - (b.y + b.height);
    return dx || dy ? { ...e, x: e.x + dx, y: e.y + dy } : e;
  });
}

/** The same space between each element and the next, across or down, the first and the last left where they are. */
export function distributeElements(deck: Deck, slideId: string, ids: readonly string[], axis: 'x' | 'y'): Deck {
  const slide = deck.slides.find((s) => s.id === slideId);
  const picked = (slide?.elements.filter((e) => ids.includes(e.id)) ?? []).map((e) => ({ e, b: boundsOf(e) }));
  if (picked.length < 3) return deck;
  const size = axis === 'x' ? 'width' : 'height';
  picked.sort((a, b) => a.b[axis] - b.b[axis]);
  const first = picked[0].b;
  const last = picked[picked.length - 1].b;
  const taken = picked.reduce((sum, p) => sum + p.b[size], 0);
  const gap = (last[axis] + last[size] - first[axis] - taken) / (picked.length - 1);
  const moves = new Map<string, number>();
  let at = first[axis];
  for (const p of picked) {
    moves.set(p.e.id, at - p.b[axis]);
    at += p.b[size] + gap;
  }
  return updateElements(deck, slideId, ids, (e) => {
    const d = moves.get(e.id) ?? 0;
    return d ? { ...e, [axis]: e[axis] + d } : e;
  });
}

/** The point of the slide under (x, y) of the element's own box, turned as it is. */
export function toSlide(element: Rect & { rotation: number }, x: number, y: number): { x: number; y: number } {
  const turn = (element.rotation * Math.PI) / 180;
  const cx = element.width / 2;
  const cy = element.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  return { x: element.x + cx + dx * Math.cos(turn) - dy * Math.sin(turn), y: element.y + cy + dx * Math.sin(turn) + dy * Math.cos(turn) };
}

/** The point of the element's own box, turned back, that is at (x, y) of the slide. */
export function toElement(element: Rect & { rotation: number }, x: number, y: number): { x: number; y: number } {
  const turn = (-element.rotation * Math.PI) / 180;
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  return { x: element.width / 2 + dx * Math.cos(turn) - dy * Math.sin(turn), y: element.height / 2 + dx * Math.sin(turn) + dy * Math.cos(turn) };
}

/** The topmost element under a point of the slide, not counting locked ones. */
export function elementAt(slide: Slide, x: number, y: number, slack = 0): Element | undefined {
  for (let i = slide.elements.length - 1; i >= 0; i--) {
    const e = slide.elements[i];
    if (e.locked) continue;
    const p = toElement(e, x, y);
    // A line is as thin as its stroke: it is picked a little either side of it.
    const pad = e.type === 'shape' && e.shape === 'line' ? Math.max(slack, 8) : slack;
    if (p.x >= -slack && p.x <= e.width + slack && p.y >= -pad && p.y <= e.height + pad) return e;
  }
  return undefined;
}
