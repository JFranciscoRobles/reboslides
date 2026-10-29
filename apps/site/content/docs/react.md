# React component

`@reboslides/react` gives the studio as a component, `SlideStudio`: the whole of it, bar, panels, slide and pages, as [the demo](/demo/) shows it. For an interface of your own around the slide, see [Headless](/docs/headless/).

```tsx
'use client';
import { SlideStudio, type Deck } from '@reboslides/react';

export function Editor({ deck, save }: { deck: Deck; save: (deck: Deck) => void }) {
  return (
    <div style={{ position: 'relative', height: 640 }}>
      <SlideStudio deck={deck} onChange={save} />
    </div>
  );
}
```

It renders nothing on the server: under Next.js it goes in a client component, and it is mounted in the browser after the first render. It fills the element it is in, which has to have a height.

## Props

| Prop | Type | What it does |
| --- | --- | --- |
| `deck` | `Deck` | The deck to open. A new one when not given. Another deck given opens it. |
| `onChange` | `(deck: Deck) => void` | Called with the deck once changes have stopped for a moment: where your app saves it. |
| `theme` | `'light' \| 'dark'` | The light or the dark theme; it follows the prop. |
| `locale` | `'en' \| 'es'` | The language of the studio. Another one mounts it again in it, with the deck as it is. |
| `onLocale` | `(locale) => void` | Given, the menu (☰) offers the language, and this is called with the one chosen: set `locale` to it. |
| `storageKey` | `string \| null` | Where in `localStorage` to keep the deck between visits. Nowhere when not given. |
| `collab` | `{ url, room, name?, ticket? }` | Works on the deck with other people. See [Collaboration](/docs/collaboration/). |
| `onCollab` | `(session) => void` | Told how the collaboration goes, and who is in the room. |
| `onReady` | `(studio) => void` | The `Studio` once it is there, and nothing when it is gone. |
| `className`, `style` | | Of the element it fills. |

The ref is the `Studio` itself, with everything [Put it in your app](/docs/studio/#working-with-it-from-code) lists:

```tsx
const studio = useRef<Studio>();
<SlideStudio ref={studio} deck={deck} />;
studio.current?.exportPdf();
```

## Fonts

The themes are set in families from Google Fonts. Put their stylesheet in the page once:

```tsx
import { googleFontsUrl } from '@reboslides/react';

<link rel="stylesheet" href={googleFontsUrl()} />;
```
