# What is ReboSlides

ReboSlides is a design studio for presentations that you put inside your own web application. People place text, shapes and pictures anywhere on a slide, start from themes, present full screen and download a PDF — without leaving your app, and without a server.

It is a sibling of [Rebodocs](https://rebodocs.com): the text in every box of a slide is a document of the rebodocs engine, laid out by it. Paragraphs, runs, lists, line spacing, the caret and the selection are the ones a word processor has, measured with the fonts on the screen.

## What you get

- **A studio** (`@reboslides/editor`) — the slide drawn on a canvas, elements moved, resized and turned by hand with smart guides, groups scaled from their corners, text edited in place, panels of themes, shapes, text and uploads, a panel of properties, the pages at the bottom, undo, presenting and export. No framework; one class.
- **An engine** (`@reboslides/core`) — the deck as plain data, every change a function that returns a new deck, the text laid out by `@rebodocs/core`, the outlines of the shapes, the themes, the `.reboslides` file and a vector PDF. No DOM: it runs in Node too.

## Who it is for

Apps where people make something to show: a proposal tool, a report builder, a course platform, a CRM that sends a deck with a quote. The studio is the editor; your app decides where decks are kept and who opens them.

## Try it

The [studio on the whole window](/demo/) keeps your deck in the browser. Or read [Getting started](/docs/getting-started/) to run it from the repository.

> ReboSlides is young. Its interface is in Spanish for now and its packages are not on npm yet. [Status and roadmap](/docs/status/) says what works and what is missing.
