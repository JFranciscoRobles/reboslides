# Status and roadmap

ReboSlides is at version 0.1. This page says what works and what does not, plainly.

## Works, with tests

- Decks, slides and elements; every change as a new deck; undo and redo.
- Moving, resizing and turning by hand, smart guides, scaling and stretching a group.
- Text laid out by the rebodocs engine, edited in place: caret, selection, bullets and numbers, alignment, line spacing, bold, italic, underline, strikethrough, colours, fonts.
- Six themes and eight layouts; shapes, stickers, pictures with rounded corners, gradients, opacity, layers and locking.
- Any slide size, from a list or typed in px, pt, cm or inches, the content scaled to fit.
- Presenting full screen; downloading as PNG, JPG, standard or print PDF, SVG, GIF, video or the `.reboslides` file.
- A vector PDF with selectable text and its fonts inside, made in the browser or in Node.
- Light and dark themes, in the look of the Rebo suite.
- A React component, and headless hooks for an interface of one's own.
- The studio in English and Spanish, the layouts written in either.
- A viewer only to look at, and thumbnails of slides.
- Collaboration in real time: a room server, each person's selection drawn for the others, undo per person.
- An MCP server for AI assistants, on files or live in a room.

The engine's tests run with `npm test`; the studio is tried by hand and in a browser driven by Playwright.

## Not yet

- **npm.** The packages are used from the repository.
- **Cropping and filters** for pictures; groups that stay grouped; tables and charts.
- **Speaker notes** are kept in the deck but not shown or edited in the studio.
- **PowerPoint.** The engine has an experimental reader and writer of `.pptx`; they are not validated against PowerPoint.

## What could come next

1. Publishing the packages on npm.
2. Text typed by two people in the same box at once: today the last one to reach the server keeps the box.
3. Speaker notes shown and edited in the studio.
