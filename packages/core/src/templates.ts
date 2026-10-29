// What a deck starts from: themes, each a palette and two fonts, and the
// layouts of slide every theme can be made in. A slide made from a template
// is an ordinary one, of ordinary elements: nothing keeps it tied to it.

import { toggleList } from '@rebodocs/core/internal';
import { type Deck, type Fill, type Slide, type SlideSize, type TextElement, type TextOptions, createShape, createSlide, createText, solid } from './model';

export interface Theme {
  id: string;
  name: string;
  background: Fill;
  /** The text, and the one set softer than it. */
  ink: string;
  muted: string;
  /** The colour that stands out, and a quieter one for surfaces behind things. */
  accent: string;
  surface: string;
  heading: string;
  body: string;
  /** Whether headings are set bold: not for a font that is heavy already. */
  headingBold: boolean;
}

export const THEMES: Theme[] = [
  { id: 'minimal', name: 'Minimal', background: solid('FFFFFF'), ink: '111827', muted: '6B7280', accent: '2563EB', surface: 'DBEAFE', heading: 'Inter', body: 'Inter', headingBold: true },
  {
    id: 'vibrante',
    name: 'Vibrante',
    background: { kind: 'gradient', from: '7C3AED', to: 'EC4899', angle: 35 },
    ink: 'FFFFFF',
    muted: 'F5F3FF',
    accent: 'FDE047',
    surface: 'A855F7',
    heading: 'Poppins',
    body: 'Poppins',
    headingBold: true,
  },
  {
    id: 'editorial',
    name: 'Editorial',
    background: solid('F5F0E8'),
    ink: '1C1917',
    muted: '78716C',
    accent: 'B45309',
    surface: 'E7DCC8',
    heading: 'Playfair Display',
    body: 'Lora',
    headingBold: true,
  },
  { id: 'noche', name: 'Noche', background: solid('0F172A'), ink: 'F8FAFC', muted: '94A3B8', accent: '22D3EE', surface: '1E293B', heading: 'Space Grotesk', body: 'Inter', headingBold: true },
  { id: 'fresco', name: 'Fresco', background: solid('ECFDF5'), ink: '064E3B', muted: '047857', accent: '10B981', surface: 'A7F3D0', heading: 'Montserrat', body: 'Montserrat', headingBold: true },
  { id: 'poster', name: 'Póster', background: solid('FDE047'), ink: '111111', muted: '3F3F46', accent: '111111', surface: 'FACC15', heading: 'Bebas Neue', body: 'Inter', headingBold: false },
];

export const LAYOUTS = ['cover', 'titleBody', 'section', 'columns', 'imageText', 'quote', 'bigNumber', 'closing'] as const;
export type LayoutKind = (typeof LAYOUTS)[number];

export const LAYOUT_NAMES: Record<LayoutKind, string> = {
  cover: 'Portada',
  titleBody: 'Título y texto',
  section: 'Sección',
  columns: 'Tres columnas',
  imageText: 'Imagen y texto',
  quote: 'Cita',
  bigNumber: 'Gran número',
  closing: 'Cierre',
};

/** What the layouts say until it is written over, in Spanish and in English. */
const CONTENT = {
  es: {
    cover: ['Título de tu presentación', 'Un subtítulo que diga de qué trata'],
    titleBody: ['Un título claro', 'La primera idea, dicha en una línea\nLa segunda, que se sigue de ella\nY la tercera, que las junta'],
    section: 'Nombre de la sección',
    columns: [
      'Tres cosas que importan',
      ['Rápido', 'Explica en una frase por qué esto importa.'],
      ['Sencillo', 'Lo que se entiende sin tener que pensarlo.'],
      ['Tuyo', 'Lo que hace distinto lo que ofreces.'],
    ],
    imageText: ['Arrastra aquí una imagen', 'Una imagen vale más', 'Acompáñala con un texto breve que cuente lo que no se ve en ella.'],
    quote: ['Una frase que valga la pena recordar, dicha por alguien que sabe.', '— Nombre de quien lo dijo'],
    bigNumber: 'de algo que vale la pena contar, y de dónde sale ese número',
    closing: ['¡Gracias!', 'nombre@correo.com · tusitio.com'],
    untitled: 'Presentación sin título',
  },
  en: {
    cover: ['The title of your talk', 'A subtitle that says what it is about'],
    titleBody: ['A clear title', 'The first idea, said in one line\nThe second, which follows from it\nAnd the third, which brings them together'],
    section: 'Name of the section',
    columns: [
      'Three things that matter',
      ['Fast', 'Say in one sentence why this matters.'],
      ['Simple', 'What is understood without having to think.'],
      ['Yours', 'What makes what you offer different.'],
    ],
    imageText: ['Drop a picture here', 'A picture says more', 'Go with it with a short text that tells what cannot be seen in it.'],
    quote: ['A sentence worth remembering, said by someone who knows.', '— Name of who said it'],
    bigNumber: 'of something worth telling, and where that number comes from',
    closing: ['Thank you!', 'name@email.com · yoursite.com'],
    untitled: 'Untitled presentation',
  },
};

const contentOf = (locale: string | undefined) => (locale?.toLowerCase().startsWith('en') ? CONTENT.en : CONTENT.es);

/** The title of a deck not named yet, in the language: Spanish unless it is English. */
export const untitledDeck = (locale?: string): string => contentOf(locale).untitled;

/** A box of text in the theme: a heading in its heading font, anything else in its body font. */
function text(theme: Theme, kind: 'heading' | 'body', content: string, box: { x: number; y: number; width: number }, size: number, more: TextOptions = {}): TextElement {
  const heading = kind === 'heading';
  return createText(content, box, {
    ...more,
    run: { fontFamily: heading ? theme.heading : theme.body, fontSize: size, bold: heading && theme.headingBold, color: heading ? theme.ink : theme.muted, ...more.run },
    paragraph: { lineHeight: heading ? 1.05 : 1.3, spacingAfter: heading ? 0 : size * 0.4, ...more.paragraph },
  });
}

function bullets(element: TextElement): TextElement {
  return { ...element, doc: toggleList(element.doc, 0, element.doc.paragraphs.length - 1, 'bullet') };
}

/** A slide of the layout in the theme, for a deck of `size`, its texts in the language of `locale` (Spanish unless English). */
export function layoutSlide(theme: Theme, layout: LayoutKind, size: SlideSize, locale?: string): Slide {
  const c = contentOf(locale);
  const { width: W, height: H } = size;
  const pad = W * 0.075;
  const inner = W - pad * 2;
  const slide = (elements: Slide['elements']) => createSlide(theme.background, elements);
  switch (layout) {
    case 'cover':
      return slide([
        createShape('ellipse', { x: W * 0.68, y: -H * 0.25, width: H * 0.9, height: H * 0.9 }, { fill: solid(theme.surface) }),
        // Room for a title of two lines in a font as tall as Poppins, whose lines are half as tall again as its size.
        createShape('rect', { x: pad, y: H * 0.22, width: 64, height: 8 }, { fill: solid(theme.accent) }),
        text(theme, 'heading', c.cover[0], { x: pad, y: H * 0.27, width: inner * 0.75 }, 56),
        text(theme, 'body', c.cover[1], { x: pad, y: H * 0.72, width: inner * 0.7 }, 24),
      ]);
    case 'titleBody':
      return slide([
        createShape('rect', { x: 0, y: 0, width: 16, height: H }, { fill: solid(theme.accent) }),
        text(theme, 'heading', c.titleBody[0], { x: pad, y: pad * 0.8, width: inner }, 44),
        bullets(
          text(theme, 'body', c.titleBody[1], { x: pad, y: H * 0.36, width: inner * 0.8 }, 24, {
            run: { color: theme.ink },
          }),
        ),
      ]);
    case 'section':
      return slide([
        text(theme, 'heading', '01', { x: pad, y: H * 0.1, width: inner }, 120, { run: { color: theme.accent } }),
        text(theme, 'heading', c.section, { x: pad, y: H * 0.56, width: inner * 0.8 }, 48),
        createShape('line', { x: pad, y: H * 0.82, width: inner, height: 4 }, { stroke: theme.muted, strokeWidth: 2 }),
      ]);
    case 'columns': {
      const gap = 32;
      const col = (inner - gap * 2) / 3;
      const [heading, ...items] = c.columns as [string, ...[string, string][]];
      return slide([
        text(theme, 'heading', heading, { x: pad, y: pad * 0.8, width: inner }, 40, { paragraph: { align: 'center' } }),
        ...items.flatMap(([title, body], i) => {
          const x = pad + i * (col + gap);
          return [
            createShape('roundRect', { x, y: H * 0.36, width: col, height: H * 0.5 }, { fill: solid(theme.surface) }),
            createShape('ellipse', { x: x + 24, y: H * 0.36 + 24, width: 48, height: 48 }, { fill: solid(theme.accent) }),
            text(theme, 'heading', title, { x: x + 24, y: H * 0.36 + 96, width: col - 48 }, 26),
            text(theme, 'body', body, { x: x + 24, y: H * 0.36 + 140, width: col - 48 }, 17),
          ];
        }),
      ]);
    }
    case 'imageText':
      return slide([
        createShape('rect', { x: 0, y: 0, width: W * 0.46, height: H }, { fill: solid(theme.surface) }),
        text(theme, 'body', c.imageText[0], { x: W * 0.06, y: H * 0.46, width: W * 0.34 }, 18, { paragraph: { align: 'center' } }),
        text(theme, 'heading', c.imageText[1], { x: W * 0.53, y: H * 0.24, width: W * 0.4 }, 40),
        text(theme, 'body', c.imageText[2], { x: W * 0.53, y: H * 0.52, width: W * 0.4 }, 20),
      ]);
    case 'quote':
      return slide([
        text(theme, 'heading', '“', { x: pad, y: H * 0.06, width: 200 }, 180, { run: { color: theme.accent, fontFamily: 'Playfair Display' } }),
        text(theme, 'heading', c.quote[0], { x: pad + 40, y: H * 0.34, width: inner - 80 }, 40, { run: { italic: true, bold: false } }),
        text(theme, 'body', c.quote[1], { x: pad + 40, y: H * 0.74, width: inner - 80 }, 22),
      ]);
    case 'bigNumber':
      return slide([
        text(theme, 'heading', '87%', { x: pad, y: H * 0.16, width: inner }, 180, { run: { color: theme.accent }, paragraph: { align: 'center' } }),
        text(theme, 'body', c.bigNumber, { x: W * 0.2, y: H * 0.66, width: W * 0.6 }, 24, { paragraph: { align: 'center' } }),
      ]);
    case 'closing':
      return slide([
        createShape('ellipse', { x: -H * 0.3, y: H * 0.55, width: H * 0.8, height: H * 0.8 }, { fill: solid(theme.surface) }),
        createShape('star', { x: W * 0.82, y: H * 0.12, width: 72, height: 72 }, { fill: solid(theme.accent) }),
        text(theme, 'heading', c.closing[0], { x: pad, y: H * 0.3, width: inner }, 96, { paragraph: { align: 'center' } }),
        text(theme, 'body', c.closing[1], { x: pad, y: H * 0.62, width: inner }, 22, { paragraph: { align: 'center' } }),
      ]);
  }
}

/** A whole deck in the theme: a slide of each layout, in the order a talk goes. */
export function themedDeck(theme: Theme, size: SlideSize, title?: string, locale?: string): Deck {
  return { title: title ?? untitledDeck(locale), size, slides: LAYOUTS.map((layout) => layoutSlide(theme, layout, size, locale)) };
}

/** The families every theme is set in: those a page showing the templates has to load. */
export const THEME_FONTS = [...new Set(THEMES.flatMap((t) => [t.heading, t.body]))];
