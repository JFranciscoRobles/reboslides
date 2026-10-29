import { describe, expect, it } from 'vitest';
import {
  addElements,
  addSlide,
  applyChanges,
  createDeck,
  createShape,
  createSlide,
  deleteSlide,
  diffDecks,
  moveSlide,
  parseDeck,
  removeElements,
  reorderElements,
  serializeDeck,
  setBackground,
  setTitle,
  solid,
  updateElements,
} from '../src';

const box = (x: number) => createShape('rect', { x, y: 0, width: 10, height: 10 });
/** The deck with each change of `steps` made in turn, the changes between each two made again on the first. */
function roundTrip(start: ReturnType<typeof createDeck>, end: ReturnType<typeof createDeck>) {
  const changes = diffDecks(start, end);
  // Through JSON, as the server and the assistants carry them.
  const carried = JSON.parse(JSON.stringify(changes));
  expect(applyChanges(start, carried)).toEqual(end);
  return changes;
}

describe('the changes of a deck', () => {
  it('are none between a deck and itself', () => {
    const deck = createDeck();
    expect(diffDecks(deck, deck)).toEqual([]);
  });

  it('make the one deck into the other, whatever was done', () => {
    let deck = createDeck('Uno');
    const slide = deck.slides[0];
    const a = box(0);
    const b = box(20);
    deck = addElements(deck, slide.id, [a, b]);
    const start = deck;
    let end = setTitle(deck, 'Dos');
    end = addSlide(end, 1, createSlide(solid('000000')));
    end = updateElements(end, slide.id, [a.id], (e) => ({ ...e, x: 99 }));
    end = removeElements(end, slide.id, [b.id]);
    end = addElements(end, slide.id, [box(40)]);
    end = setBackground(end, slide.id, solid('FF0000'));
    end = moveSlide(end, 0, 1);
    const changes = roundTrip(start, end);
    expect(changes.map((change) => change.op).sort()).toEqual(['add-slide', 'deck', 'put', 'put', 'remove', 'slide'].sort());
  });

  it('say only what changed: an element moved is that element', () => {
    let deck = addElements(createDeck(), createDeck().slides[0].id, []);
    const slide = deck.slides[0];
    const a = box(0);
    deck = addElements(deck, slide.id, [a, box(20), box(40)]);
    const moved = updateElements(deck, slide.id, [a.id], (e) => ({ ...e, y: 5 }));
    expect(diffDecks(deck, moved)).toEqual([{ op: 'put', slide: slide.id, element: moved.slides[0].elements[0] }]);
  });

  it('keep the order of layers and of slides', () => {
    let deck = createDeck();
    const slide = deck.slides[0];
    const a = box(0);
    deck = addElements(deck, slide.id, [a, box(1), box(2)]);
    roundTrip(deck, reorderElements(deck, slide.id, [a.id], 'front'));
    const three = addSlide(addSlide(deck, 1), 2);
    roundTrip(three, deleteSlide(moveSlide(three, 2, 0), three.slides[1].id));
  });

  it('of two people on different elements keep both', () => {
    let deck = createDeck();
    const slide = deck.slides[0];
    const a = box(0);
    const b = box(20);
    deck = addElements(deck, slide.id, [a, b]);
    const mine = diffDecks(
      deck,
      updateElements(deck, slide.id, [a.id], (e) => ({ ...e, x: 1 })),
    );
    const theirs = diffDecks(
      deck,
      updateElements(deck, slide.id, [b.id], (e) => ({ ...e, x: 2 })),
    );
    const both = applyChanges(deck, [...theirs, ...mine]);
    expect(both.slides[0].elements.map((e) => e.x)).toEqual([1, 2]);
  });

  it('let go of what names something no longer there', () => {
    let deck = createDeck();
    const slide = deck.slides[0];
    const a = box(0);
    deck = addElements(deck, slide.id, [a]);
    const moved = diffDecks(
      deck,
      updateElements(deck, slide.id, [a.id], (e) => ({ ...e, x: 7 })),
    );
    const gone = removeElements(deck, slide.id, [a.id]);
    // The element moved is put back: whoever moved it last decides.
    expect(applyChanges(gone, moved).slides[0].elements).toHaveLength(1);
    expect(applyChanges(gone, [{ op: 'remove', slide: slide.id, element: 'nada' }])).toBe(gone);
    expect(applyChanges(gone, [{ op: 'remove-slide', slide: slide.id }])).toBe(gone);
  });

  it('leave the parts they do not touch as the same objects', () => {
    let deck = addSlide(createDeck(), 1);
    const [first, second] = deck.slides;
    deck = addElements(deck, first.id, [box(0)]);
    const next = applyChanges(deck, diffDecks(deck, addElements(deck, second.id, [box(5)])));
    expect(next.slides[0]).toBe(deck.slides[0]);
  });

  it('are carried in a file as well', () => {
    const deck = createDeck();
    expect(parseDeck(serializeDeck(deck))).toEqual(deck);
  });
});
