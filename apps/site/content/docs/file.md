# The .reboslides file

A deck saved is a JSON file with the extension `.reboslides`. Its pictures are inside it as `data:` URLs, so one file is the whole deck: send it, keep it in a database, open it again.

```json
{
  "format": "reboslides",
  "version": 1,
  "deck": { "title": "…", "size": { "width": 960, "height": 540 }, "slides": [] }
}
```

## Reading and writing

```ts
import { parseDeck, serializeDeck } from '@reboslides/core';

const text = serializeDeck(deck);
const again = parseDeck(text); // throws, saying why, when the text is not a deck
```

`parseDeck` refuses a file of a newer version of the format than the engine knows, and fills in a deck with no slides or no size.

## Keeping decks in your app

The studio hands you the deck in `onChange`; keep it as you keep anything else:

```ts
new Studio(element, {
  deck: await api.loadDeck(id),
  storageKey: null,
  onChange: (deck) => api.saveDeck(id, serializeDeck(deck)),
});
```

`FILE_FORMAT`, `FILE_VERSION` and `FILE_EXTENSION` are the three constants of the format.
