# Viewer and thumbnails

`@reboslides/viewer` shows a deck only to look at: its slides one under another or as a grid, with a bar to present full screen and print, a slide to a page. And a slide as a picture, for a thumbnail. For a file manager, a preview, a page that shows a deck: anywhere a deck is seen and not made.

## Without a framework {#vanilla}

```ts
import { createViewer } from '@reboslides/viewer';

const viewer = createViewer(element, deck, { layout: 'slides', locale: 'en' }); // a deck, or a .reboslides as text or bytes
viewer.setLayout('grid');
viewer.present(0);
viewer.print();
viewer.destroy();
```

`bar: false` leaves out its bar, when presenting and printing are your application's.

## In React {#react}

```tsx
import { SlidesViewer } from '@reboslides/viewer/react';

<SlidesViewer deck={deck} layout="grid" locale="en" style={{ height: 520 }} />
```

## Thumbnails {#thumbnails}

```ts
import { slideCanvas, slidePicture } from '@reboslides/viewer';

const url = await slidePicture(deck, 0, 320);   // the first slide, a PNG data URL 320 px wide
const canvas = await slideCanvas(deck, 2, 640); // the third, on a canvas
```

They wait for the slide's pictures and for its fonts, so a thumbnail is drawn in the deck's own families. ReboFiles draws its thumbnails of decks with it.
