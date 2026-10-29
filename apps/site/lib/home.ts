// What the landing page says: one place for the version, the packages and the
// features, so the badge, the install picker and the table change together.

import { version } from '../package.json';
import type { L } from './i18n';

/** The version every package is at; the site moves with them. */
export const VERSION = version;

/** The six pastel pairs, background and text, that take turns on tags, icons and packages. */
export type Pastel = 'blue' | 'yellow' | 'green' | 'pink' | 'purple' | 'orange';
export const PASTELS: Pastel[] = ['purple', 'yellow', 'green', 'pink', 'blue', 'orange'];
/** Whole class names, so Tailwind finds them. */
export const PASTEL_CLASS: Record<Pastel, string> = {
  blue: 'bg-pastel-blue text-pastel-blue-fg',
  yellow: 'bg-pastel-yellow text-pastel-yellow-fg',
  green: 'bg-pastel-green text-pastel-green-fg',
  pink: 'bg-pastel-pink text-pastel-pink-fg',
  purple: 'bg-pastel-purple text-pastel-purple-fg',
  orange: 'bg-pastel-orange text-pastel-orange-fg',
};
export const pastelAt = (i: number) => PASTELS[i % PASTELS.length];

export const TAGS: L[] = [
  { en: 'Drag, resize, rotate', es: 'Arrastrar, redimensionar, girar' },
  { en: 'Smart guides', es: 'Guías inteligentes' },
  { en: 'Group scaling', es: 'Escalar en grupo' },
  { en: 'Text by the rebodocs engine', es: 'Texto con el motor de rebodocs' },
  { en: 'Lists and rich text', es: 'Listas y texto enriquecido' },
  { en: 'Themes & layouts', es: 'Temas y diseños' },
  { en: 'Shapes & stickers', es: 'Formas y stickers' },
  { en: 'Any size, in px, cm or inches', es: 'Cualquier tamaño, en px, cm o pulgadas' },
  { en: 'Gradients', es: 'Degradados' },
  { en: 'PNG, JPG, PDF, SVG, GIF, video', es: 'PNG, JPG, PDF, SVG, GIF, video' },
  { en: 'Print PDF with bleed', es: 'PDF de impresión con sangrado' },
  { en: 'Embedded fonts', es: 'Fuentes incrustadas' },
  { en: 'Present full screen', es: 'Presentar a pantalla completa' },
  { en: 'Light & dark', es: 'Claro y oscuro' },
  { en: 'English & Spanish', es: 'Inglés y español' },
  { en: 'Viewer & thumbnails', es: 'Visor y miniaturas' },
  { en: 'Real-time collaboration', es: 'Colaboración en tiempo real' },
  { en: 'React & headless', es: 'React y headless' },
  { en: 'MCP for AI assistants', es: 'MCP para asistentes de IA' },
  { en: 'Undo everything', es: 'Deshacer todo' },
];

export interface Package {
  name: string;
  what: L;
  tag: L;
  color: Pastel;
}

/** In the order of the table. */
export const PACKAGES: Package[] = [
  {
    name: '@reboslides/core',
    what: {
      en: 'The engine: decks, slides and elements, every change as a new deck, text laid out by @rebodocs/core, shapes, themes, the .reboslides file and the vector PDF.',
      es: 'El motor: presentaciones, diapositivas y elementos, cada cambio como una presentación nueva, el texto maquetado por @rebodocs/core, formas, temas, el archivo .reboslides y el PDF vectorial.',
    },
    tag: { en: 'No DOM', es: 'Sin DOM' },
    color: 'purple',
  },
  {
    name: '@reboslides/editor',
    what: {
      en: 'The studio for the browser: the slide on a canvas, direct manipulation, text edited in place, panels, pages, undo, presenting and export.',
      es: 'El estudio para el navegador: la diapositiva en un canvas, manipulación directa, texto editado en el sitio, paneles, páginas, deshacer, presentar y exportar.',
    },
    tag: { en: 'No framework', es: 'Sin framework' },
    color: 'green',
  },
  {
    name: '@reboslides/react',
    what: {
      en: 'The studio as a React component, or headless hooks (SlidesProvider, useSlides, SlidesSurface, SlideThumbnail) for an interface of your own.',
      es: 'El estudio como componente de React, o hooks headless (SlidesProvider, useSlides, SlidesSurface, SlideThumbnail) para una interfaz propia.',
    },
    tag: { en: 'React 18+', es: 'React 18+' },
    color: 'blue',
  },
  {
    name: '@reboslides/viewer',
    what: {
      en: 'A deck only to look at, one slide under another or as a grid, presented or printed; and a slide as a picture, for a thumbnail.',
      es: 'Una presentación solo para verla, una diapositiva bajo otra o en cuadrícula, presentada o impresa; y una diapositiva como imagen, para una miniatura.',
    },
    tag: { en: 'Browser, React', es: 'Navegador, React' },
    color: 'yellow',
  },
  {
    name: '@reboslides/collab',
    what: {
      en: 'Collaboration in real time: the room server, its client, and the changes of a deck between them. Your backend keeps the decks.',
      es: 'Colaboración en tiempo real: el servidor de salas, su cliente y los cambios de una presentación entre ambos. Tu backend guarda las presentaciones.',
    },
    tag: { en: 'Node + browser', es: 'Node + navegador' },
    color: 'orange',
  },
  {
    name: '@reboslides/mcp',
    what: {
      en: 'An MCP server for Claude and other assistants to read and edit decks: on files, or live in a room with the people in it.',
      es: 'Un servidor MCP para que Claude y otros asistentes lean y editen presentaciones: en archivos, o en vivo en una sala con la gente que está.',
    },
    tag: { en: 'Node', es: 'Node' },
    color: 'pink',
  },
];

/** Each feature: its title, a line or two on it, and the path of its icon on a 24 grid. */
export const FEATURES: [L, L, string][] = [
  [
    { en: 'Place anything anywhere', es: 'Coloca cualquier cosa donde sea' },
    {
      en: 'Text, shapes and pictures move, resize and turn by hand, snapping to the edges and centres of the slide and of each other.',
      es: 'Texto, formas e imágenes se mueven, se redimensionan y giran a mano, ajustándose a los bordes y centros de la diapositiva y entre sí.',
    },
    'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  ],
  [
    { en: 'Text that is really text', es: 'Texto que es texto de verdad' },
    {
      en: 'Each box is a document of the rebodocs engine: paragraphs, runs, lists, line spacing, a caret and a selection measured with the fonts on screen.',
      es: 'Cada caja es un documento del motor de rebodocs: párrafos, tramos, listas, interlineado, un cursor y una selección medidos con las fuentes de la pantalla.',
    },
    'M5 6V4h14v2M12 4v16M9 20h6',
  ],
  [
    { en: 'Scale a group', es: 'Escala un grupo' },
    {
      en: 'Pick several and drag a corner: everything grows together, text included. Drag a side to stretch them; lines keep their weight.',
      es: 'Elige varios y arrastra una esquina: todo crece junto, también el texto. Arrastra un lado para estirarlos; las líneas conservan su grosor.',
    },
    'M4 4h6v6H4zM14 14h6v6h-6zM10 10l4 4M20 4v6M14 4h6',
  ],
  [
    { en: 'Themes and layouts', es: 'Temas y diseños' },
    {
      en: 'Six themes, each a palette and a pair of fonts, and eight layouts of slide in each. Start a deck from one, or add a single slide.',
      es: 'Seis temas, cada uno una paleta y un par de fuentes, y ocho diseños de diapositiva en cada uno. Empieza una presentación con uno o añade una sola diapositiva.',
    },
    'M3 3h8v10H3zM13 3h8v6h-8zM13 11h8v10h-8zM3 15h8v6H3z',
  ],
  [
    { en: 'A PDF in vectors', es: 'Un PDF en vectores' },
    {
      en: 'Shapes as outlines, gradients as gradients, text as text you can select and search, its fonts inside cut down to the letters used.',
      es: 'Formas como contornos, degradados como degradados, texto como texto que puedes seleccionar y buscar, con sus fuentes dentro reducidas a las letras usadas.',
    },
    'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h4',
  ],
  [
    { en: 'Present', es: 'Presenta' },
    {
      en: 'Full screen from any slide, with the arrows, the space bar or a click; the same drawing as the studio, so what you saw is what they see.',
      es: 'A pantalla completa desde cualquier diapositiva, con las flechas, la barra espaciadora o un clic; el mismo dibujo que el estudio, así que lo que viste es lo que ven.',
    },
    'M7 4l13 8-13 8z',
  ],
  [
    { en: 'Undo anything', es: 'Deshaz lo que sea' },
    {
      en: 'Every change makes a new deck and keeps the one before; a drag, a word typed or a colour dragged through is one step.',
      es: 'Cada cambio hace una presentación nueva y guarda la anterior; un arrastre, una palabra escrita o un color recorrido es un solo paso.',
    },
    'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  ],
  [
    { en: 'The look of the Rebo suite', es: 'El aspecto de la suite Rebo' },
    {
      en: 'Tools, a panel of properties and pages at the bottom as islands on a warm canvas, as Rebodocs has them, light or dark.',
      es: 'Herramientas, un panel de propiedades y páginas abajo como islas sobre un lienzo cálido, como las tiene Rebodocs, en claro u oscuro.',
    },
    'M12 3a9 9 0 1 0 0 18 4 4 0 0 1 0-8 4 4 0 0 0 0-8M7.5 10.5h.01M12 7.5h.01M16.5 10.5h.01',
  ],
  [
    { en: 'In English and Spanish', es: 'En inglés y español' },
    {
      en: 'The whole studio in either language, chosen from its menu, and the layouts it adds written in it.',
      es: 'Todo el estudio en cualquiera de los dos idiomas, elegido desde su menú, y los diseños que agrega escritos en él.',
    },
    'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM3 10h14M10 3c-2 2-3 4.3-3 7s1 5 3 7M10 3c2 2 3 4.3 3 7s-1 5-3 7',
  ],
  [
    { en: 'Yours, in your page', es: 'Tuyo, en tu página' },
    {
      en: 'One class mounts the studio in any element; no framework, no server. Where decks are kept is up to your app.',
      es: 'Una clase monta el estudio en cualquier elemento; sin framework, sin servidor. Dónde se guardan las presentaciones lo decide tu aplicación.',
    },
    'M4 5h16v14H4zM4 9h16M8 13h4',
  ],
];
