# Put it in your app

`Studio` is the whole editor: the bar, the tools, the panels, the slide, the properties and the pages. It has no framework and draws itself in the element you give it.

```ts
import { Studio } from '@reboslides/editor';

const studio = new Studio(parent, options);
```

## Options

| Option | Type | What it does |
| --- | --- | --- |
| `deck` | `Deck` | The deck to open. Without it, the one kept under `storageKey`, or a new one. |
| `storageKey` | `string \| null` | Where in `localStorage` the deck is kept between visits. `'reboslides:deck'` when not given; `null` keeps it nowhere. |
| `embedded` | `boolean` | The studio fills its parent instead of the window. The parent has to be positioned and have a height. It takes keys, copying and pasting only while the focus is inside it. |
| `theme` | `'light' \| 'dark'` | The light or the dark theme. Without it, the one the person chose last, or the system's. |
| `onChange` | `(deck: Deck) => void` | Called with the deck once changes have stopped for a moment. This is where your app saves it. |
| `chrome` | `boolean` | `false` for the slide alone, without the bar, the panels, the properties and the pages: for an interface of your own (see [Headless](/docs/headless/#vanilla)). |
| `locale` | `'en' \| 'es'` | The language of the studio, and of the text of the layouts and themes. The browser's when not given. |
| `onLocale` | `(locale) => void` | Given, the menu (☰) has **Language**, and this is called with the one chosen: mount the studio again in it with the same deck. |

## Languages {#languages}

The studio speaks English and Spanish: its bar, panels, properties, download dialog and messages, and the names of themes, shapes, sizes and units. The layouts it adds are written in the language too ("The title of your talk", "Thank you!"). A deck already made keeps its own text.

```ts
let studio: Studio;
function mount(locale: string, deck?: Deck) {
  studio = new Studio(parent, {
    deck,
    locale,
    onLocale: (next) => {
      const now = studio.deck;
      studio.destroy();
      mount(next, now);
    },
  });
}
mount('en');
```

`studio.language` says which it is in, and `studio.t` what it says.

## Inside a page

With `embedded`, the studio is a box among the rest of your page:

```html
<div id="studio" style="position: relative; height: 640px"></div>
```

```ts
const studio = new Studio(document.getElementById('studio')!, { embedded: true, storageKey: null });
```

Keys like Delete, arrows and ⌘Z only act on the slide while the studio has the focus, so the rest of the page scrolls and types as usual.

## In React

`@reboslides/react` gives the studio as a component, and headless hooks for an interface of your own: see [React component](/docs/react/) and [Headless](/docs/headless/).

```tsx
<SlideStudio deck={deck} onChange={save} />
```

## Fonts

The themes are set in families from Google Fonts. `googleFontsUrl()` is the stylesheet for all of them; the studio measures text with a font once the browser has it, and lays the text out again when a font arrives late.

```ts
import { FONTS, googleFontsUrl } from '@reboslides/editor';
```

For its own interface the studio uses the system's font: nothing to load.

## Working with it from code

The studio's deck is `studio.deck`. Change it through the engine and hand it back with `commit`, which keeps the step for undoing:

```ts
import { setBackground, solid } from '@reboslides/core';

studio.commit(setBackground(studio.deck, studio.slide.id, solid('0F172A')));
```

Other things you can call:

| Member | What it does |
| --- | --- |
| `deck`, `slide`, `picked` | The deck, the slide on show, the elements picked. |
| `goTo(index)` | Shows another slide. |
| `select(ids)` | Picks elements of the slide on show. |
| `undo()`, `redo()` | A step back or forward. |
| `present(from?)` | Presents full screen. |
| `exportPdf()`, `exportPng()`, `saveFile()` | Downloads the PDF, the slide as PNG, or the `.reboslides` file. |
| `openFile(file)` | Opens a `.reboslides` file. |
| `setTheme(theme)` | Light or dark. |
| `canUndo`, `canRedo` | Whether there is a step to undo or redo. |
| `on('change' \| 'state', fn)` | Tells after each change of the deck, or of what is shown; returns what stops it. |
| `applyRemote(deck)` | Shows a deck changed by someone else, with no step of this person's history. |
| `setPeers(peers)` | Draws what the others have picked, in their colours. [Collaboration](/docs/collaboration/) does both. |
| `destroy()` | Takes the studio out of the page. |

## Its look

The studio looks as the rest of the Rebo suite does, islands on a warm canvas as in Rebodocs, in CSS it puts in the page once, under the classes `rsl-` and `sp-`. Its colours are custom properties on `.rsl-app`; override them to make it yours:

```css
.rsl-app,
.rsl-app[data-theme='dark'] {
  --accent: #0b57d0;
  --accent-hover: #08398a;
  --accent-subtle: #e8f0fd;
}
```

The dark theme sets its own values under `.rsl-app[data-theme='dark']`, so an override meant for both names both.
