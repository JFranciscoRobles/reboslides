# Changing a deck

No function of the engine changes the deck it is given. Each returns a **new deck**, sharing what it did not touch. That is how the studio undoes: it keeps the deck before. And a slide that did not change is the same object, so you can tell what changed with `===`.

```ts
const next = addElements(deck, slideId, [star]);
next === deck; // false
next.slides[1] === deck.slides[1]; // true: only the first slide changed
```

## Slides

| Function | What it does |
| --- | --- |
| `setTitle(deck, title)` | Renames the deck. |
| `resizeDeck(deck, size, fit?)` | Makes every slide `size`. With `fit` (the default), what is on them is scaled as much as fits whole, and centred; without it, everything stays where it was. |
| `setUnit(deck, unit)` | The unit its lengths are shown in. Nothing else changes. |
| `addSlide(deck, index?, slide?)` | Puts a slide at `index`, at the end when not said; an empty one with the background of the slide before when none is given. |
| `duplicateSlide(deck, slideId)` | A copy right after it. |
| `deleteSlide(deck, slideId)` | Deletes it; the last slide is emptied instead. |
| `moveSlide(deck, from, to)` | Moves a slide. |
| `setBackground(deck, slideId, fill)` | Its background. |
| `setNotes(deck, slideId, notes)` | Its speaker notes. |

## Elements

| Function | What it does |
| --- | --- |
| `addElements(deck, slideId, elements)` | Puts them on top. |
| `updateElements(deck, slideId, ids, change)` | Each one named changed by `change(element)`. |
| `patchElements(deck, slideId, ids, patch)` | Each one named given the fields of `patch`. |
| `removeElements(deck, slideId, ids)` | Takes them away. |
| `duplicateElements(deck, slideId, ids, offset?)` | Copies 16 points down and right, on top; returns `{ deck, ids }`. |
| `reorderElements(deck, slideId, ids, order)` | `'front'`, `'forward'`, `'backward'` or `'back'`. A run of picked elements moves together. |
| `alignElements(deck, slideId, ids, how)` | `'left'`, `'center'`, `'right'`, `'top'`, `'middle'`, `'bottom'`: to the slide for one element, to the box around them for several. |
| `distributeElements(deck, slideId, ids, axis)` | The same space between three or more, across (`'x'`) or down (`'y'`). |
| `resizeGroup(deck, slideId, ids, from, to)` | Every element placed and sized as the box `from` becomes `to`. |

## Scaling a group

`resizeGroup` is what the studio does when a box of several is dragged by a handle. Each element keeps its place inside the box, and its own sides grow as much as the box does along them — a turned element grows along its turned sides. When the box grows the same both ways, text is set larger with it; otherwise only its box changes and the text is laid out again. A line keeps its weight.

```ts
import { boundsOf, resizeGroup, unionOf } from '@reboslides/core';

const picked = slide.elements.filter((e) => ids.includes(e.id));
const from = unionOf(picked.map(boundsOf));
const bigger = resizeGroup(deck, slide.id, ids, from, { ...from, width: from.width * 2, height: from.height * 2 });
```

## Geometry

| Function | What it gives |
| --- | --- |
| `boundsOf(element)` | The smallest level box that holds it, turned as it is. |
| `unionOf(rects)` | The box that holds them all. |
| `toSlide(element, x, y)` · `toElement(element, x, y)` | A point of the element's own box on the slide, and back. |
| `elementAt(slide, x, y, slack?)` | The topmost element under a point, not counting locked ones. |
