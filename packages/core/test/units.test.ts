import { describe, expect, it } from 'vitest';
import {
  SIZE_PRESETS,
  type TextElement,
  addElements,
  createDeck,
  createShape,
  createText,
  formatLength,
  fromUnit,
  parseDeck,
  presetOf,
  presetSize,
  resizeDeck,
  serializeDeck,
  setUnit,
  toUnit,
} from '../src/index';

describe('units', () => {
  it('turn points into each unit and back', () => {
    expect(toUnit(72, 'in')).toBe(1);
    expect(toUnit(72, 'px')).toBe(96);
    expect(toUnit(72, 'cm')).toBeCloseTo(2.54);
    expect(fromUnit(1080, 'px')).toBe(810);
    for (const unit of ['px', 'pt', 'cm', 'in'] as const) expect(fromUnit(toUnit(123.4, unit), unit)).toBeCloseTo(123.4);
  });

  it('write a length as the unit is read', () => {
    expect(formatLength(810, 'px')).toBe('1080 px');
    expect(formatLength(fromUnit(21, 'cm'), 'cm')).toBe('21 cm');
    expect(formatLength(fromUnit(8.5, 'in'), 'in')).toBe('8,5 in');
  });

  it('know the presets by their size', () => {
    const story = SIZE_PRESETS.find((p) => p.id === 'story')!;
    expect(presetSize(story)).toEqual({ width: 810, height: 1440 });
    expect(presetOf({ width: 960, height: 540 })?.id).toBe('wide');
    expect(presetOf({ width: 100, height: 100 })).toBeUndefined();
  });

  it('are kept in the file, and nothing else changes with them', () => {
    const deck = setUnit(createDeck(), 'cm');
    expect(parseDeck(serializeDeck(deck)).unit).toBe('cm');
    expect(deck.size).toEqual(createDeck().size);
    expect(parseDeck(serializeDeck(createDeck())).unit).toBeUndefined();
  });
});

describe('a deck resized', () => {
  const shape = createShape('rect', { x: 0, y: 0, width: 960, height: 540 }, { strokeWidth: 4, stroke: '000000' });
  const text = createText('Hola', { x: 96, y: 54, width: 480 }, { run: { fontSize: 40 } });
  const base = createDeck();
  const deck = addElements(base, base.slides[0].id, [shape, text]);

  it('scales what is on it to fit the new size whole, centred', () => {
    // A square slide half as wide: everything at half its size, in the middle from top to bottom.
    const square = resizeDeck(deck, { width: 480, height: 480 });
    const [s, t] = square.slides[0].elements;
    expect(square.size).toEqual({ width: 480, height: 480 });
    expect([s.x, s.y, s.width, s.height]).toEqual([0, 105, 480, 270]);
    expect((s as typeof shape).strokeWidth).toBe(2);
    expect([t.x, t.y, t.width]).toEqual([48, 132, 240]);
    expect((t as TextElement).doc.paragraphs[0].runs[0].props.fontSize).toBe(20);
  });

  it('leaves everything where it was without fitting', () => {
    const tall = resizeDeck(deck, { width: 810, height: 1440 }, false);
    expect(tall.slides[0].elements).toBe(deck.slides[0].elements);
    expect(tall.size).toEqual({ width: 810, height: 1440 });
  });

  it('is the same deck at the same size', () => {
    expect(resizeDeck(deck, { width: 960, height: 540 })).toBe(deck);
  });
});
