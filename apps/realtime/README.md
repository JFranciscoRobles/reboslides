# Realtime demo

Several people on one deck at once, each seeing what the others have picked. The collaboration server only coordinates: a backend keeps the decks and says who may come in.

```bash
npm run realtime      # from the root: http://localhost:5192, the rooms on :7433
```

Open it in two windows with two names and pick the same deck. One process runs the three parts an application has apart:

- **The page** (`src/App.tsx`): the decks, and `<SlideStudio collab={…} />` for the one open.
- **Your backend** (`server/backend.ts`): the decks in `./decks` as `.reboslides` files; a ticket into a room, signed; and the three routes the collaboration server asks (`GET`/`PUT /backend/decks/<room>`, `POST /backend/decks/<room>/access`).
- **The collaboration server** (`server/dev.ts`): `createCollabServer` with `backendStorage`, as `reboslides-collab --backend … --backend-key …` runs it.
