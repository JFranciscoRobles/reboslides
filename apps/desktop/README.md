# Desktop

ReboSlides as an application of its own, with [Tauri](https://tauri.app): the studio in a window of the system, and the decks on the disk.

- **Files of the disk**: `.reboslides` opened and saved where they are (Archivo → Abrir, Guardar, Guardar como), from the Finder or the Explorer with a double click, or dropped on the window. Each deck in a window of its own; one with changes asks before it is closed.
- **The menus of the system**, in Spanish: new deck, open, save, export as PDF or PNG, undo, the light and the dark theme.
- **What the page cannot do** is in `src-tauri/src/lib.rs`: reading and writing files, opening windows, hearing of the decks the system asks to open.

```bash
npm run desktop         # from the root: the application, with the page served by Vite (port 5196)
npm run build:desktop   # ReboSlides.app (or the installer of the system) in src-tauri/target/release/bundle
```

It needs Rust and the [prerequisites of Tauri](https://tauri.app/start/prerequisites/). The icons are made from `apps/site/public/logo.svg` with `npx tauri icon`.
