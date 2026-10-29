# ReboSlides

A presentation design studio for the browser, with the look of the Rebo
suite (light and dark): slides with freely placed text, shapes and images,
themes and templates, full-screen presenting, and export to vector PDF and
PNG. The interface is in English and Spanish.

The text in each box is laid out by **the [rebodocs](../docs) engine**: the
same paragraphs, lists, fonts and measurements as a DOCX, fitted to the width
of the box with `layoutContinuous`. The caret, the selection and the point
under the pointer come from that same layout (`caretRect`, `selectionRects`,
`hitTest`), and editing uses its operations (`insertText`, `splitParagraph`,
`deleteRange`, `applyRunProps`, `toggleList`…). What belongs to slides
(positions, rotation, shapes, images, layers, templates) is ReboSlides' own.

## Packages

| Package | What it is |
| --- | --- |
| `@reboslides/core` | The engine, with no DOM: the deck and its slides, the elements and their changes (immutable, including scaling a group), text laid out by `@rebodocs/core`, shape outlines, themes, the vector PDF and the `.reboslides` file. |
| `@reboslides/editor` | The studio, with no framework: the slide drawn on a canvas, moving, resizing (also as a group) and rotating with alignment guides, in-place text editing, the assets panel, the properties panel, the page strip, undo, presenting and exporting. |
| `@reboslides/react` | The studio as a React component (`SlideStudio`), or headless hooks for an interface of your own (`SlidesProvider`, `useSlides`, `SlidesSurface`, `SlideThumbnail`). |
| `@reboslides/viewer` | A read-only viewer (`createViewer`, `<SlidesViewer>`) and thumbnails of a slide as an image or a canvas (`slidePicture`, `slideCanvas`). |
| `@reboslides/collab` | Real-time collaboration: the room server (`bin/reboslides-collab.mjs`), its client, and the changes between them (`diffDecks`/`applyChanges` from the core). Everyone sees the others' selection and undoes only their own changes. |
| `@reboslides/mcp` | An MCP server (`bin/reboslides-mcp.mjs`) so Claude and other assistants can read and edit presentations, in files or live in a room. |

And the apps that use those packages:

| App | What it shows | |
| --- | --- | --- |
| `apps/playground` | Where everything is tried. | `npm run dev` |
| `apps/demo` | The React package: `SlideStudio`, and an interface of its own built with the headless hooks. | `npm run demo` · :5191 |
| `apps/realtime` | Several people in one presentation: the page, a backend that stores the presentations and signs tickets, and the room server. | `npm run realtime` · :5192 |
| `apps/assistant` | The same with Claude in a chat, editing with the MCP tools while everyone watches. Needs `ANTHROPIC_API_KEY`. | `npm run assistant` · :5193 |
| `apps/viewer` | The viewer and the thumbnails. | `npm run viewer` · :5194 |
| `apps/storage` | Presentations kept in a storage bucket: the list from a backend, files read and written through signed addresses, and versions to restore. | `npm run storage` · :5195 |
| `apps/desktop` | The studio as a desktop app with Tauri, opening and saving `.reboslides` files. | `npm run desktop` · :5196 |
| `apps/site` | The website and the documentation. | `npm run build:site` |

`@rebodocs/core` and `@rebodocs/editor` (only its `CanvasMeasurer` from the
latter) are linked from `../docs` with `file:`; everything the editor uses
from rebodocs goes through `packages/editor/src/engine.ts`.

## PDF

The PDF is vector: backgrounds, gradients, shapes, rotation and transparency
as drawing, and text as text, selectable and searchable. Fonts are embedded,
cut down to the letters used, read and subset with rebodocs' `parseTrueType`
and `subsetTrueType`; the editor downloads their `.ttf` files from
Fontsource. A box with letters no font has (an emoji) goes in as an image.

## Usage

```sh
npm install
npm run dev        # the playground
npm test           # core tests
npm run typecheck
npm run lint
```

```ts
import { Studio, googleFontsUrl } from '@reboslides/editor';

document.querySelector<HTMLLinkElement>('#fonts')!.href = googleFontsUrl();
new Studio(document.getElementById('app')!, { storageKey: 'my-app:deck', locale: 'en' });
```

## Collaboration

```sh
node packages/collab/bin/reboslides-collab.mjs --port 7430   # rooms stored in ./rooms
```

```tsx
<SlideStudio deck={deck} collab={{ url: 'http://127.0.0.1:7430', room, name: 'Ana' }} />
```

On the site: `/demo/?collab=http://127.0.0.1:7430`, **Share**, and open the address it gives in another window.

## Assistants (MCP)

```sh
claude mcp add reboslides -- node /path/to/slides/packages/mcp/bin/reboslides-mcp.mjs --root ~/presentations
```

## Shortcuts

| | |
| --- | --- |
| Double click / Enter | Edit the text |
| Esc | Leave the text · deselect |
| ⌘Z · ⇧⌘Z | Undo · redo |
| ⌘D | Duplicate |
| ⌘C · ⌘X · ⌘V | Copy, cut, paste (also images and text from elsewhere) |
| Arrows (⇧ ×10) | Move |
| ⌘B · ⌘I · ⌘U | Bold, italic, underline |
| Alt while dragging | No guides |
| ⇧ while rotating | In steps of 15 degrees |
| Corner of a group | Scale it whole (⇧ to stretch it) |
| ⌘ + wheel | Zoom |
