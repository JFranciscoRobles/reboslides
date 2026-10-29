# Packages

ReboSlides is six packages, in one repository with a playground and this site. None is on npm yet; they are used from the repository (see [Getting started](/docs/getting-started/)).

## @reboslides/core

The engine. No DOM: it runs in the browser and in Node.

| Part | What it exports |
| --- | --- |
| The deck | `Deck`, `Slide`, `Element`, `TextElement`, `ShapeElement`, `ImageElement`, `Fill`, `DEFAULT_SIZE`, `SHAPE_KINDS`, `createDeck`, `createSlide`, `createText`, `createShape`, `createImage`, `copyElement`, `copySlide`, `newId`, `solid` |
| Units | `UNITS`, `Unit`, `DEFAULT_UNIT`, `UNIT_NAMES`, `toUnit`, `fromUnit`, `formatLength`, `SIZE_PRESETS`, `presetSize`, `presetOf` |
| Changes | `setTitle`, `setUnit`, `resizeDeck`, `addSlide`, `duplicateSlide`, `deleteSlide`, `moveSlide`, `setBackground`, `setNotes`, `addElements`, `updateElements`, `patchElements`, `removeElements`, `duplicateElements`, `reorderElements`, `alignElements`, `distributeElements`, `resizeGroup`; and as small pieces of data, `diffDecks`, `applyChanges`, `Change` |
| Geometry | `boundsOf`, `unionOf`, `toSlide`, `toElement`, `elementAt` |
| Text | `textLayout`, `textHeight`, `textOffset`, `fitText`, `formatAllText`, `leadingRun`, `plainTextOf`, `scaleText`, `wholeText` |
| Shapes | `shapePath`, `roundedRect`, `svgPath`, `SHAPE_NAMES` |
| Templates | `THEMES`, `LAYOUTS`, `LAYOUT_NAMES`, `THEME_FONTS`, `layoutSlide`, `themedDeck`, `untitledDeck` (each taking a `locale`) |
| Output | `exportDeckPdf`, `slideSvg`, `encodeGif`, `parsePages`, `serializeDeck`, `parseDeck`, `FILE_FORMAT`, `FILE_VERSION`, `FILE_EXTENSION` |

It depends on `@rebodocs/core` and `fflate`.

## @reboslides/editor

The studio for the browser. No framework.

| Export | What it is |
| --- | --- |
| `Studio`, `StudioOptions` | The studio. See [Put it in your app](/docs/studio/). |
| `drawSlide`, `drawElement`, `drawText`, `slideCanvas`, `ImageStore` | The drawing of a slide on a canvas: what the studio, its thumbnails, presenting and PNG use. |
| `deckPdf` | The PDF of a deck in the browser, its fonts fetched. |
| `FONTS`, `googleFontsUrl`, `loadFonts`, `fontSheets`, `fontFileOf` | The families offered, their stylesheet, their loading (once the stylesheet has come), their TrueType files. |
| `EN`, `ES`, `stringsFor`, `languageOf` | What the studio says, in English and Spanish. |
| `injectStyles` | Its CSS, put in the page once. |

It depends on `@reboslides/core`, `@rebodocs/core` and, for its `CanvasMeasurer`, `@rebodocs/editor`.

## @reboslides/react

The studio for React. See [React component](/docs/react/) and [Headless](/docs/headless/).

| Export | What it is |
| --- | --- |
| `SlideStudio` | The whole studio as a component. |
| `SlidesProvider`, `SlidesSurface`, `useSlides`, `useSlidesValue`, `SlideThumbnail` | The headless hooks, for an interface of your own. |
| `createRoom` and the types of a session | To share a deck. |

It depends on `@reboslides/editor`, `@reboslides/collab` and, as a peer, `react` 18 or later.

## @reboslides/viewer

A deck only to look at, and a slide as a picture. See [Viewer and thumbnails](/docs/viewer/).

| Entry | What it exports |
| --- | --- |
| `@reboslides/viewer` | `createViewer`, `slidePicture`, `slideCanvas`, `deckOf` |
| `@reboslides/viewer/react` | `SlidesViewer` |

It depends on `@reboslides/core` and `@reboslides/editor`.

## @reboslides/collab

Working together. See [Collaboration](/docs/collaboration/).

| Entry | What it exports |
| --- | --- |
| `@reboslides/collab/server` | `createCollabServer`: the room server, to run alone (`bin/reboslides-collab.mjs`) or inside your Node server. |
| `@reboslides/collab/storage` | `memoryStorage`, `folderStorage`, `backendStorage`: where the decks of the rooms are kept. |
| `@reboslides/collab/browser` | `createRoom`, `joinRoom`, `studioHost`: the client, in the browser or in Node. |
| `@reboslides/collab` | The protocol between them. |

## @reboslides/mcp

The server for AI assistants, `bin/reboslides-mcp.mjs`, and `TOOLS`, its tools as functions of a deck. See [AI assistants](/docs/assistants/).
