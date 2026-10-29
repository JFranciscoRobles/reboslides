import type { FontSpec, Numbering, TextMeasurer } from '@rebodocs/core';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIZE,
  LAYOUTS,
  THEMES,
  addElements,
  addSlide,
  alignElements,
  boundsOf,
  createDeck,
  createShape,
  createText,
  deleteSlide,
  distributeElements,
  duplicateElements,
  elementAt,
  fitText,
  formatAllText,
  layoutSlide,
  leadingRun,
  moveSlide,
  parseDeck,
  reorderElements,
  resizeGroup,
  serializeDeck,
  shapePath,
  textLayout,
  textOffset,
  toElement,
  toSlide,
} from '../src/index';

/** Every letter half as wide as the font is big, and lines as tall as it: text laid out by arithmetic. */
const measurer: TextMeasurer = {
  width: (text: string, font: FontSpec) => text.length * font.size * 0.5,
  metrics: (font: FontSpec) => ({ ascent: font.size * 0.8, descent: font.size * 0.2 }),
};

describe('a deck', () => {
  it('starts with one empty slide, 16:9', () => {
    const deck = createDeck();
    expect(deck.slides).toHaveLength(1);
    expect(deck.size).toEqual(DEFAULT_SIZE);
  });

  it('adds, moves and deletes slides, and keeps the last one', () => {
    let deck = createDeck();
    const first = deck.slides[0].id;
    deck = addSlide(deck);
    deck = addSlide(deck, 0);
    expect(deck.slides).toHaveLength(3);
    expect(deck.slides[1].id).toBe(first);
    deck = moveSlide(deck, 1, 2);
    expect(deck.slides[2].id).toBe(first);
    deck = deleteSlide(deleteSlide(deck, deck.slides[0].id), deck.slides[1].id);
    expect(deck.slides.map((s) => s.id)).toEqual([first]);
    const shape = createShape('rect', { x: 0, y: 0, width: 10, height: 10 });
    deck = deleteSlide(addElements(deck, first, [shape]), first);
    expect(deck.slides).toHaveLength(1);
    expect(deck.slides[0].elements).toEqual([]);
  });

  it('leaves the slides it does not change as they were', () => {
    let deck = addSlide(createDeck());
    const [a, b] = deck.slides;
    deck = addElements(deck, b.id, [createShape('ellipse', { x: 0, y: 0, width: 10, height: 10 })]);
    expect(deck.slides[0]).toBe(a);
    expect(deck.slides[1]).not.toBe(b);
  });

  it('is read back from its file as it was written', () => {
    const deck = { ...createDeck('Mi charla'), slides: [layoutSlide(THEMES[1], 'cover', DEFAULT_SIZE)] };
    expect(parseDeck(serializeDeck(deck))).toEqual(deck);
    expect(() => parseDeck('{"format":"otra"}')).toThrow();
  });

  it('keeps the numbering of a list in its file, and reads one kept without it', () => {
    const box = createText('uno', { x: 0, y: 0, width: 200 });
    const numId = 1;
    const numbering: Numbering = { abstracts: new Map([[0, []]]), lists: new Map([[numId, { abstractId: 0, starts: new Map([[0, 3]]), levels: new Map() }]]) };
    const listed = { ...box, doc: { ...box.doc, numbering } };
    const deck = { ...createDeck(), slides: [{ ...createDeck().slides[0], elements: [listed] }] };
    const back = parseDeck(serializeDeck(deck)).slides[0].elements[0] as typeof listed;
    expect(back.doc.numbering?.lists).toBeInstanceOf(Map);
    expect(back.doc.numbering?.lists.get(numId)).toEqual(numbering.lists.get(numId));
    // Written before: the Maps as {}.
    const old = parseDeck(JSON.stringify({ format: 'reboslides', version: 1, deck })).slides[0].elements[0] as typeof listed;
    expect(old.doc.numbering?.lists).toBeInstanceOf(Map);
  });
});

describe('elements', () => {
  const slideWith = (...elements: ReturnType<typeof createShape>[]) => {
    const deck = createDeck();
    return addElements(deck, deck.slides[0].id, elements);
  };

  it('move up and down among the others', () => {
    const [a, b, c] = ['a', 'b', 'c'].map((id) => ({ ...createShape('rect', { x: 0, y: 0, width: 1, height: 1 }), id }));
    const deck = slideWith(a, b, c);
    const id = deck.slides[0].id;
    const order = (d: typeof deck) => d.slides[0].elements.map((e) => e.id).join('');
    expect(order(reorderElements(deck, id, ['a'], 'front'))).toBe('bca');
    expect(order(reorderElements(deck, id, ['c'], 'back'))).toBe('cab');
    expect(order(reorderElements(deck, id, ['a'], 'forward'))).toBe('bac');
    expect(order(reorderElements(deck, id, ['a', 'b'], 'forward'))).toBe('cab');
    expect(reorderElements(deck, id, ['c'], 'front')).toBe(deck);
  });

  it('are duplicated beside themselves, with new names', () => {
    const shape = createShape('star', { x: 100, y: 100, width: 50, height: 50 });
    const deck = slideWith(shape);
    const { deck: next, ids } = duplicateElements(deck, deck.slides[0].id, [shape.id]);
    const copy = next.slides[0].elements[1];
    expect(ids).toEqual([copy.id]);
    expect(copy.id).not.toBe(shape.id);
    expect([copy.x, copy.y]).toEqual([116, 116]);
  });

  it('line up with the slide when alone, and with each other when several', () => {
    const a = createShape('rect', { x: 10, y: 10, width: 100, height: 50 });
    const b = createShape('rect', { x: 300, y: 200, width: 40, height: 40 });
    const deck = slideWith(a, b);
    const id = deck.slides[0].id;
    expect(alignElements(deck, id, [a.id], 'center').slides[0].elements[0].x).toBe(430);
    const left = alignElements(deck, id, [a.id, b.id], 'left').slides[0].elements;
    expect(left.map((e) => e.x)).toEqual([10, 10]);
    const middle = alignElements(deck, id, [a.id, b.id], 'middle').slides[0].elements;
    expect(middle.map((e) => e.y + e.height / 2)).toEqual([125, 125]);
  });

  it('are spread with the same space between them', () => {
    const shapes = [0, 100, 500].map((x) => createShape('rect', { x, y: 0, width: 20, height: 20 }));
    const deck = slideWith(...shapes);
    const spread = distributeElements(
      deck,
      deck.slides[0].id,
      shapes.map((s) => s.id),
      'x',
    ).slides[0].elements;
    expect(spread.map((e) => e.x)).toEqual([0, 250, 500]);
  });

  it('are found under a point, turned as they are', () => {
    const shape = { ...createShape('rect', { x: 100, y: 100, width: 200, height: 20 }), rotation: 90 };
    const deck = slideWith(shape);
    // Turned a quarter, it stands up across its centre (200, 110).
    expect(elementAt(deck.slides[0], 200, 30)?.id).toBe(shape.id);
    expect(elementAt(deck.slides[0], 120, 110)).toBeUndefined();
    const b = boundsOf(shape);
    expect(b.width).toBeCloseTo(20);
    expect(b.height).toBeCloseTo(200);
    const there = toSlide(shape, 30, 5);
    const back = toElement(shape, there.x, there.y);
    expect(back.x).toBeCloseTo(30);
    expect(back.y).toBeCloseTo(5);
  });
});

describe('the text of a box', () => {
  it('is laid out by the engine of rebodocs across the width of its box', () => {
    // 20 letters of 10 points are 200 points: in a box 120 wide they take two lines.
    const box = createText('aaaaaaaaa bbbbbbbbbb', { x: 0, y: 0, width: 120 }, { run: { fontSize: 20 }, paragraph: { lineHeight: 1 } });
    const layout = textLayout(box, measurer);
    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[1].fragments[0].text).toBe('bbbbbbbbbb');
    expect(fitText(box, measurer).height).toBeCloseTo(40);
    expect(fitText({ ...box, autoHeight: false }, measurer).height).toBe(box.height);
  });

  it('sits where it is aligned in a taller box', () => {
    expect(textOffset('top', 40, 100)).toBe(0);
    expect(textOffset('middle', 40, 100)).toBe(30);
    expect(textOffset('bottom', 40, 100)).toBe(60);
    expect(textOffset('bottom', 140, 100)).toBe(0);
  });

  it('takes formatting all at once, empty paragraphs too', () => {
    const box = createText('uno\n\ntres', { x: 0, y: 0, width: 300 });
    const bold = formatAllText(box, { bold: true, color: 'FF0000' }, { align: 'center' });
    expect(bold.doc.paragraphs.every((p) => p.props.align === 'center' && p.runs.every((r) => r.props.bold))).toBe(true);
    expect(leadingRun(bold).color).toBe('FF0000');
  });
});

describe('templates', () => {
  it('make every layout in every theme, inside the slide', () => {
    for (const theme of THEMES)
      for (const layout of LAYOUTS) {
        const slide = layoutSlide(theme, layout, DEFAULT_SIZE);
        expect(slide.elements.length).toBeGreaterThan(0);
        for (const e of slide.elements) expect(e.x).toBeLessThan(DEFAULT_SIZE.width);
      }
  });

  it('draw shapes that close, but for a line', () => {
    expect(shapePath('star', 10, 10).at(-1)).toEqual({ op: 'Z' });
    expect(shapePath('line', 10, 4)).toEqual([
      { op: 'M', x: 0, y: 2 },
      { op: 'L', x: 10, y: 2 },
    ]);
  });
});

describe('a group of elements resized', () => {
  const a = createShape('rect', { x: 100, y: 100, width: 100, height: 50 });
  const b = createShape('ellipse', { x: 300, y: 200, width: 100, height: 100 });
  const line = createShape('line', { x: 100, y: 300, width: 200, height: 4 }, { strokeWidth: 4 });
  const text = createText('Hola', { x: 100, y: 350, width: 200 }, { run: { fontSize: 20 } });
  const deck = addElements(createDeck(), '', []);
  const slideId = deck.slides[0].id;
  const all = addElements(deck, slideId, [a, b, line, text]);
  const ids = [a.id, b.id, line.id, text.id];
  const from = { x: 100, y: 100, width: 300, height: 300 };

  it('keeps each where it was in the box, and scales it with it', () => {
    const [ra, rb, rl, rt] = resizeGroup(all, slideId, ids, from, { x: 100, y: 100, width: 600, height: 600 }).slides[0].elements;
    expect([ra.x, ra.y, ra.width, ra.height]).toEqual([100, 100, 200, 100]);
    expect([rb.x, rb.y, rb.width, rb.height]).toEqual([500, 300, 200, 200]);
    // A line keeps its thickness; text grows with the box, the same both ways.
    expect([rl.width, rl.height]).toEqual([400, 4]);
    expect((rt as typeof text).doc.paragraphs[0].runs[0].props.fontSize).toBe(40);
  });

  it('stretches, and leaves the size of text when stretched one way', () => {
    const [ra, , , rt] = resizeGroup(all, slideId, ids, from, { x: 100, y: 100, width: 600, height: 300 }).slides[0].elements;
    expect([ra.width, ra.height]).toEqual([200, 50]);
    expect(rt.width).toBe(400);
    expect((rt as typeof text).doc.paragraphs[0].runs[0].props.fontSize).toBe(20);
  });

  it('stretches a turned element along its own sides', () => {
    const turned = { ...createShape('rect', { x: 0, y: 0, width: 100, height: 20 }), rotation: 90 };
    const d = addElements(deck, slideId, [turned]);
    const b = boundsOf(turned);
    const [r] = resizeGroup(d, slideId, [turned.id], b, { ...b, height: b.height * 2 }).slides[0].elements;
    // Standing up, its length is what grows.
    expect(r.width).toBeCloseTo(200);
    expect(r.height).toBeCloseTo(20);
  });
});
