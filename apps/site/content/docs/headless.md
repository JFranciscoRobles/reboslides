# Headless: your own interface

The studio has its own bar, panels and pages. When your app should look like itself instead, `@reboslides/react` gives the slide alone, and hooks with what to show and what to do: you draw the rest. [The demo](/demo/#headless) has an interface made this way, in about a hundred lines.

```tsx
'use client';
import { SlideThumbnail, SlidesProvider, SlidesSurface, useSlides } from '@reboslides/react';

export function MyEditor({ deck, save }) {
  return (
    <SlidesProvider deck={deck} onChange={save}>
      <MyBar />
      <div style={{ display: 'flex', height: 600 }}>
        <MyPages />
        <SlidesSurface style={{ flex: 1 }} />
      </div>
    </SlidesProvider>
  );
}

function MyBar() {
  const { state, commands } = useSlides();
  return (
    <div>
      <button onClick={commands.undo} disabled={!state.canUndo}>Undo</button>
      <button onClick={() => commands.addText('Your idea here', 40)}>Text</button>
      <button onClick={() => commands.addShape('star')}>Star</button>
      <button onClick={commands.remove} disabled={!state.selection.length}>Delete</button>
      <button onClick={commands.present}>Present</button>
    </div>
  );
}

function MyPages() {
  const { state, commands } = useSlides();
  return state.deck.slides.map((slide, i) => (
    <button key={slide.id} onClick={() => commands.goTo(i)} aria-current={i === state.current}>
      <SlideThumbnail slide={slide} width={140} />
    </button>
  ));
}
```

The slide in the surface is still edited by hand: elements are moved, resized, turned and picked with the pointer, text is typed in place, and the keys of the studio work while it has the focus.

## SlidesProvider {#provider}

Holds the deck. Everything that uses the hooks goes inside it.

| Prop | Type | What it does |
| --- | --- | --- |
| `deck` | `Deck` | The deck to start with; another one given opens it. |
| `onChange` | `(deck: Deck) => void` | Called with the deck once changes have stopped for a moment. |
| `theme` | `'light' \| 'dark'` | The colours of the surface around the slide. |
| `locale` | `'en' \| 'es'` | The language of the layouts it adds and of what it says. |
| `collab` | `{ url, room, name?, ticket? }` | Works on the deck with other people. See [Collaboration](/docs/collaboration/). |

## SlidesSurface {#surface}

Where the slide is drawn and edited: one in each provider. It takes `className` and `style`, and the size it is given: something must give it a height. Until it is on the page, the hooks give an empty deck and commands that do nothing.

## useSlides {#use-slides}

`const { state, commands, studio } = useSlides()`. The component is drawn again when the state changes. `useSlidesValue((state) => state.canUndo)` takes one value of it.

### state

| Field | What it is |
| --- | --- |
| `deck`, `slide`, `current` | The deck, the slide shown, and its place. |
| `selection`, `picked` | The ids picked on the slide, and the elements they are. |
| `editing` | Whether a text box is being typed in. |
| `canUndo`, `canRedo` | Whether there is a step to undo or redo. |
| `theme` | `'light'` or `'dark'`. |
| `collab` | With `collab`: `state`, `peers`, `color`, `name` and `pending` changes. |

### commands

| Command | What it does |
| --- | --- |
| `undo()`, `redo()` | A step back or forward: this person's, in a shared deck. |
| `goTo(index)`, `select(ids)` | Shows a slide; picks elements on it. |
| `addSlide(slide?)`, `duplicateSlide(id?)`, `deleteSlide(id?)`, `moveSlide(from, to)` | The slides. `layoutSlide` makes one from a theme. |
| `setBackground(fill, everySlide?)`, `setTitle(title)` | The deck. |
| `addText(text, size?)`, `addShape(kind)`, `addImages(files)` | Something new in the middle of the slide, picked. |
| `remove()`, `duplicate()`, `reorder(order)`, `align(how)`, `distribute(axis)` | What is picked. |
| `change(fn)` | Each picked element made `fn(element)`, as one step of history. |
| `present()`, `exportPdf()`, `exportPng()`, `saveFile()`, `openFile(file)` | Presenting and files. |
| `setTheme(theme)` | Light or dark. |

`studio` is the `Studio` itself, for anything else: `studio.commit(deck)` takes a deck changed through the engine as one step.

## SlideThumbnail {#thumbnail}

A slide drawn small, as the studio draws it, for a list of pages: `<SlideThumbnail slide={slide} width={140} />`. Inside a provider it shares the fonts and pictures of the surface, and is drawn again when its slide changes.

## Without React {#vanilla}

The same comes with the class: `new Studio(parent, { chrome: false, embedded: true })` draws the slide alone, `studio.on('state', fn)` tells after each change of what is shown, and `studio.on('change', fn)` after each change of the deck.
