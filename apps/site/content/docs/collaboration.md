# Collaboration

Several people on one deck, each seeing the others' changes as they make them and what each has picked, in their colour and with their name. Undoing takes back what you did, and nothing of what the others did meanwhile.

A server coordinates the rooms, one for each deck shared. **Your backend keeps the decks and decides who may open them**: the server asks it, and nothing of your storage reaches the browser.

## Run the server

```bash
node packages/collab/bin/reboslides-collab.mjs --port 7430
# the decks in ./rooms, as .reboslides files; --memory to keep none
```

Or inside the Node server your API has:

```ts
import { createCollabServer } from '@reboslides/collab/server';
import { folderStorage } from '@reboslides/collab/storage';

const collab = createCollabServer({ storage: folderStorage('./decks') });
app.use('/collab', collab.handle); // Express, Nest, Node's own
```

Everything it answers is under `/collab`, so it can share an address with your app.

## Share a deck

A room is made with the deck in it, and its id is what the others join:

```ts
import { createRoom } from '@reboslides/collab/browser';

const room = await createRoom('https://collab.example', deck, deck.title);
```

When your backend keeps the decks (below), the room is the deck's id in your system: there is nothing to create.

## Connect the studio

```tsx
<SlideStudio collab={{ url: 'https://collab.example', room, name: 'Ana', ticket }} />
```

The [headless provider](/docs/headless/) takes the same `collab`, and its state says who is in. Without React:

```ts
import { joinRoom, studioHost } from '@reboslides/collab/browser';

const session = joinRoom(room, studioHost(studio), { url, name: 'Ana', ticket });
session.peers; // who else is in
session.leave();
```

Try it on this site: run the server, open `/demo/?collab=http://127.0.0.1:7430`, press **Share**, and open the address it gives in another window.

## Your backend {#backend}

With `--backend https://app.example/api/decks`, the server keeps nothing: three routes of your app do.

| Route | When | Does |
| --- | --- | --- |
| `GET URL/<id>` | Someone opens a room nobody is in. | Returns the deck, as the `.reboslides` file. |
| `PUT URL/<id>` | `--save-after` seconds after the changes stop, at least every `--save-every` while they go on, and when the room empties. | Stores it. |
| `POST URL/<id>/access` | Someone joins, with `{ "ticket" }`. | `{ "name": "Ana" }` to let them in, with `"readOnly": true` to let them only watch; 403 to keep them out. |

The server shows `--backend-key` as `Authorization: Bearer <key>`. The ticket is a short-lived token your app signs for each person.

## How changes meet {#changes}

Each change says what something is now: an element whole, a slide's background, the order of the slides. The server puts them in one order and everybody follows it. Two people changing different elements of a slide keep both; two moving the same element end where the one the server took last put it, the same for everybody. What one person does is shown at once, without waiting for the server.

The changes are the engine's: `diffDecks(before, after)` gives them and `applyChanges(deck, changes)` makes them, so a server, a test or an assistant can read and make them as well.

## An assistant in the room {#assistant}

The [MCP server](/docs/assistants/) joins a room with `join_room`: what Claude changes is seen by everyone in it at once.
