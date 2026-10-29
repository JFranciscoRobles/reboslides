# How it works

## Three layers

1. **The engine of rebodocs** sets text: given paragraphs, a width and a measurer, it gives lines, each word where it goes. It also reads and cuts font files for the PDF.
2. **The engine of ReboSlides** (`@reboslides/core`) is the deck: slides of boxes placed freely, each change a function from a deck to a new one, the outlines of shapes, the themes, the file and the PDF. A box of text holds a rebodocs `Doc`.
3. **The studio** (`@reboslides/editor`) draws a deck and lets people change it by hand.

## One drawing

A slide is drawn on a canvas by one function, `drawSlide`: its background, then each element in order, translated to its centre and turned. The slide in the studio, the thumbnails, presenting and the PNG are all that function at different sizes. The PDF draws the same things in PDF's own operators, so the two agree.

## What goes over the canvas

Over the canvas, in the page, the studio puts what is not part of the slide: the boxes of what is picked, their handles, the guides, the box being dragged out, the caret and the selection. They are made again whenever something changes, which is cheap: there are a few of them.

## Changes and undo

Every change goes through `commit(next)`, which keeps the deck before. A gesture — a drag, a resize, a turn — shows its decks as it goes and keeps only the one it started from, so it is one step. Changes of the same kind close together (letters typed, a colour dragged through) merge into one step too.

Because a change never touches the deck it is given, a slide that did not change is the same object. The thumbnails use that to draw only the slides that changed.

## Text in place

A box being typed in keeps a caret and an anchor, positions in its `Doc`. Keys become operations of rebodocs (`insertText`, `splitParagraph`, `deleteRange`…), and the box is laid out again; its height follows its text when it is set to. Typing goes into a hidden text area, so accents and the input methods of other languages work as anywhere else. The caret and the selection are drawn from the layout with `caretRect` and `selectionRects`, and a click is turned into a position with `hitTest`.

## Fonts

The studio measures text with a canvas, with the fonts of the page. A font that arrives late would leave text measured with another, so the studio asks for every family it offers and lays every box out again as each arrives.
