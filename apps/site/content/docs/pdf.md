# PDF

The PDF of a deck is drawn the way the canvas draws it, but in vectors:

- backgrounds and gradients as fills and shadings;
- every shape as its outline;
- pictures cut to their rounded corners;
- every element turned and as transparent as it is;
- **text as text**, in the fonts it is set in, so it can be selected, searched and copied.

The fonts go inside the file, cut down to the letters the deck uses, with what each letter stands for. They are read and cut by the TrueType reader of rebodocs (`parseTrueType`, `subsetTrueType`).

## From the studio

**Download → PDF** makes it in the browser. The studio fetches the TrueType files of the fonts the deck uses from [Fontsource](https://fontsource.org) and decodes the pictures. A box of text with letters none of those fonts has — an emoji — goes in as a picture of itself, so it looks as it did on screen.

From code: `studio.exportPdf()` downloads it; `deckPdf(deck, { measurer, images, layoutOf })` from `@reboslides/editor` returns its bytes.

## From Node

`exportDeckPdf` in `@reboslides/core` has no DOM. Give it a measurer and the font files:

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { FontMeasurer, readFont } from '@rebodocs/core';
import { exportDeckPdf } from '@reboslides/core';

const faces = await Promise.all(['Inter-Regular.ttf', 'Inter-Bold.ttf'].map(async (f) => readFont(await readFile(f))!));
const measurer = new FontMeasurer(faces);

const pdf = exportDeckPdf(deck, {
  measurer,
  font: ({ family, bold }) => faces.find((f) => f.family === family && f.bold === bold)?.bytes,
  title: deck.title,
});
await writeFile('deck.pdf', pdf);
```

## Options

| Option | What it is |
| --- | --- |
| `measurer` | The measurer the text was laid out with: every word goes where it says. |
| `font(face)` | The TrueType file of `{ family, bold, italic }`. Without one, the regular face is made bold or slanted by hand; without any, the text is set in the nearest standard font every reader has (Helvetica, Times, Courier). |
| `image(src)` | A picture of the deck, decoded: `{ width, height, jpeg }` or `{ width, height, rgb, alpha }`. |
| `picture(box)` | A box of text as a picture, for letters no font given has. |
| `layoutOf(box)` | Layouts already made, so as not to make them again. |
| `title` | The title readers show; the deck's when not given. |
| `bleed` | Points the background runs past each edge, to be cut off; 3 mm is 8.5 points. |
| `cropMarks` | Lines in a margin round each slide where it is to be cut. |

With `bleed` or `cropMarks`, each page is made larger to hold them and says where it is cut (`TrimBox`) and where its bleed ends (`BleedBox`), as print shops read it.

A page is the size of a slide, one page to each slide.
