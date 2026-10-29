# Getting started

The packages are not published on npm yet, so you run ReboSlides from its repository. It needs Node 22.12 or newer, and the repository of [Rebodocs](https://rebodocs.com) beside it, in a folder named `docs`: the engine is taken from there.

## Run the studio

```bash
git clone https://github.com/JFranciscoRobles/rebodocs docs
(cd docs && npm install)
git clone https://github.com/JFranciscoRobles/reboslides slides
cd slides
npm install
npm run dev
```

`npm run dev` starts the playground, the studio on a page of its own, at `http://localhost:5173`. It keeps your deck in the browser between visits.

## The other commands

| Command | What it does |
| --- | --- |
| `npm test` | The tests of the engine. |
| `npm run typecheck` | TypeScript over every package. |
| `npm run lint` | Biome over the packages and apps. |
| `npm run build` | The playground as static files. |
| `npm run site` | This site, at `http://localhost:5198`. |

And an application for each way of using it:

| Command | What it shows |
| --- | --- |
| `npm run demo` | The React component, and an interface of one's own on the headless hooks. |
| `npm run realtime` | Several people on one deck: a backend keeping the decks and signing tickets, and the room server. |
| `npm run assistant` | The same, with Claude in a chat changing the shared deck through the MCP tools. |
| `npm run viewer` | A shelf of decks with their thumbnails, and one opened to look at, present or print. |
| `npm run storage` | Decks kept in S3 (or a folder that plays the bucket), with their versions. |
| `npm run desktop` | ReboSlides as a desktop application with Tauri: `.reboslides` from the Finder or the Explorer. |

Each speaks English or Spanish: the switch in its bar, or `?lang=en`.

## Put it in your page

The studio is one class. Give it an element with a height and it fills it:

```ts
import { Studio, googleFontsUrl } from '@reboslides/editor';

const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = googleFontsUrl();
document.head.append(fonts);

const studio = new Studio(document.getElementById('studio')!, {
  embedded: true,
  storageKey: null,
  onChange: (deck) => save(deck),
});
```

[Put it in your app](/docs/studio/) goes through every option.

## Make a deck in code

The engine is plain functions over plain data:

```ts
import { addElements, createText, themedDeck, THEMES, DEFAULT_SIZE } from '@reboslides/core';

let deck = themedDeck(THEMES[0], DEFAULT_SIZE, 'Weekly report');
const note = createText('Generated on Monday', { x: 72, y: 470, width: 400 }, { run: { fontSize: 14 } });
deck = addElements(deck, deck.slides[0].id, [note]);
```

Open it in the studio with `new Studio(element, { deck })`.
