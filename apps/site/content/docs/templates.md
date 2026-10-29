# Themes and layouts

A theme is a palette and two fonts. A layout is a kind of slide. Every layout can be made in every theme, so the six themes and eight layouts are 48 slides ready to use.

## Themes

```ts
interface Theme {
  id: string;
  name: string;
  background: Fill;
  ink: string; // text
  muted: string; // softer text
  accent: string; // what stands out
  surface: string; // quieter, behind things
  heading: string; // font of headings
  body: string; // font of the rest
  headingBold: boolean;
}
```

| Theme | Fonts | Look |
| --- | --- | --- |
| Minimal | Inter | White, blue accent |
| Vibrante | Poppins | Violet to pink gradient, yellow accent |
| Editorial | Playfair Display, Lora | Paper, brown accent |
| Noche | Space Grotesk, Inter | Night blue, cyan accent |
| Fresco | Montserrat | Mint, green accent |
| Póster | Bebas Neue, Inter | Yellow, black |

`THEME_FONTS` lists every family the themes use: the ones a page has to load to show them.

## Layouts

`LAYOUTS` is `['cover', 'titleBody', 'section', 'columns', 'imageText', 'quote', 'bigNumber', 'closing']`: a cover, a title with bullets, a section number, three columns, a picture beside text, a quote, a big number, and a closing slide.

```ts
import { layoutSlide, themedDeck, THEMES, DEFAULT_SIZE } from '@reboslides/core';

const noche = THEMES.find((t) => t.id === 'noche')!;
const quote = layoutSlide(noche, 'quote', DEFAULT_SIZE); // one slide
const deck = themedDeck(noche, DEFAULT_SIZE, 'Launch plan'); // one of each layout, in the order a talk goes
```

A slide made from a template is an ordinary slide of ordinary elements: nothing keeps it tied to its theme.

## Your own

A theme is data: write your own `Theme` and pass it to `layoutSlide` or `themedDeck`. Its fonts have to be loaded in the page for the studio to measure and show them.
