# Decks and elements

A deck is plain data: you can keep it as JSON, send it over the network and build it in code. Every length is in **points** (1/72 of an inch), measured from the top left corner of the slide. Colours are hex RGB without `#`.

## The deck

```ts
interface Deck {
  title: string;
  size: SlideSize; // { width, height }
  slides: Slide[];
}

interface Slide {
  id: string;
  background: Fill;
  elements: Element[]; // the last one is on top
  notes?: string;
}
```

`DEFAULT_SIZE` is 16:9 at the size PowerPoint gives it: 960 × 540 points.

## Size and units

A deck keeps every length in points, but it says which unit it is **shown** in: `deck.unit`, one of `'px'`, `'pt'`, `'cm'` or `'in'` (`'px'` when not said). A pixel is a 96th of an inch, as in CSS. The studio shows and takes every position and size in that unit; font sizes and outline weights stay in points.

```ts
import { formatLength, fromUnit, toUnit, SIZE_PRESETS, presetSize, resizeDeck, setUnit } from '@reboslides/core';

toUnit(810, 'px'); // 1080
fromUnit(21, 'cm'); // 595.3 points
formatLength(810, 'px'); // "1080 px"

const story = SIZE_PRESETS.find((p) => p.id === 'story')!; // 1080 × 1920 px
deck = setUnit(resizeDeck(deck, presetSize(story)), story.unit);
```

`SIZE_PRESETS` are the sizes the studio offers: presentations 16:9 and 4:3, Full HD, A4 and Letter either way, square, 4:5 and 9:16 posts, a banner and a business card, each in the unit it is known by. `presetOf(size)` tells which one a size is.

## Elements

Every element is a box, turned about its centre:

| Field | What it is |
| --- | --- |
| `id` | Its name, unique in the deck. |
| `x`, `y`, `width`, `height` | Its box before it is turned. |
| `rotation` | Degrees, clockwise. |
| `opacity` | From 0 to 1. |
| `locked` | Not picked from the slide; changed from the list of layers. |

And then one of three kinds:

```ts
interface TextElement {
  type: 'text';
  doc: Doc; // a document of @rebodocs/core
  verticalAlign: 'top' | 'middle' | 'bottom';
  autoHeight: boolean; // the box follows its text
}

interface ShapeElement {
  type: 'shape';
  shape: ShapeKind; // 'rect', 'roundRect', 'ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'arrow', 'heart', 'line'
  fill?: Fill;
  stroke?: string;
  strokeWidth: number;
}

interface ImageElement {
  type: 'image';
  src: string; // a data: URL, so the deck is whole in its file
  naturalWidth: number;
  naturalHeight: number;
  radius: number; // rounded corners, in points
}
```

A picture **covers** its box: when the proportions differ, what does not fit is cut off at the sides, as on Canva or Keynote.

## Fills

```ts
type Fill =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number }; // 0 is left to right, 90 top to bottom
```

`solid('FFFFFF')` makes the first.

## Making them

| Function | What it makes |
| --- | --- |
| `createDeck(title?, size?)` | A deck with one empty white slide. |
| `createSlide(background?, elements?)` | A slide. |
| `createText(text, box, options?)` | A box of text, one paragraph to each line, as tall as its text once laid out. `options.run` and `options.paragraph` are the formatting of rebodocs; Inter 24 in dark gray when not said. |
| `createShape(kind, box, look?)` | A shape; violet when no fill is given, a dark line for a `'line'`. |
| `createImage(src, naturalWidth, naturalHeight, size, box?)` | A picture, centred on a slide of `size` and as large as half of it when no box is given. |
| `copyElement(element, dx?, dy?)` · `copySlide(slide)` | Copies with new names. |
| `newId(prefix?)` | A new name. |

```ts
import { createShape, createText, createSlide, solid } from '@reboslides/core';

const slide = createSlide(solid('0F172A'), [
  createShape('ellipse', { x: 680, y: -80, width: 360, height: 360 }, { fill: solid('1E293B') }),
  createText('Hello', { x: 72, y: 200, width: 600 }, { run: { fontSize: 72, bold: true, color: 'F8FAFC' } }),
]);
```
