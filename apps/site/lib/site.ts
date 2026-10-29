/** Where the code is. One place to change it. */
export const REPO = 'https://github.com/JFranciscoRobles/reboslides';
export const SITE = 'https://reboslides.com';
/** The engine whose text layout ReboSlides uses. */
export const REBODOCS = 'https://rebodocs.com';

import type { Pastel } from './home';
import type { L } from './i18n';

export interface NavItem {
  title: L;
  /** The file in `content/docs`, without `.md`; `index` is `/docs/`. */
  slug: string;
}

/** The pages of the documentation, in the order they are read; each group has its colour in the sidebar. */
export const NAV: { title: L; color: Pastel; items: NavItem[] }[] = [
  {
    title: { en: 'Start', es: 'Empezar' },
    color: 'blue',
    items: [
      { title: { en: 'What is ReboSlides', es: 'Qué es ReboSlides' }, slug: 'index' },
      { title: { en: 'Getting started', es: 'Primeros pasos' }, slug: 'getting-started' },
    ],
  },
  {
    title: { en: 'The studio', es: 'El estudio' },
    color: 'purple',
    items: [
      { title: { en: 'Put it in your app', es: 'Ponlo en tu aplicación' }, slug: 'studio' },
      { title: { en: 'React component', es: 'Componente de React' }, slug: 'react' },
      { title: { en: 'Headless: your own UI', es: 'Headless: tu propia interfaz' }, slug: 'headless' },
      { title: { en: 'Viewer and thumbnails', es: 'Visor y miniaturas' }, slug: 'viewer' },
      { title: { en: 'Using the studio', es: 'Usar el estudio' }, slug: 'using' },
      { title: { en: 'Keyboard shortcuts', es: 'Atajos de teclado' }, slug: 'shortcuts' },
    ],
  },
  {
    title: { en: 'The engine', es: 'El motor' },
    color: 'yellow',
    items: [
      { title: { en: 'Decks and elements', es: 'Presentaciones y elementos' }, slug: 'deck' },
      { title: { en: 'Changing a deck', es: 'Cambiar una presentación' }, slug: 'changes' },
      { title: { en: 'Text, set by rebodocs', es: 'Texto, maquetado por rebodocs' }, slug: 'text' },
      { title: { en: 'Themes and layouts', es: 'Temas y diseños' }, slug: 'templates' },
    ],
  },
  {
    title: { en: 'Together', es: 'En equipo' },
    color: 'orange',
    items: [
      { title: { en: 'Collaboration', es: 'Colaboración' }, slug: 'collaboration' },
      { title: { en: 'AI assistants (MCP)', es: 'Asistentes de IA (MCP)' }, slug: 'assistants' },
    ],
  },
  {
    title: { en: 'Output', es: 'Salida' },
    color: 'pink',
    items: [
      { title: { en: 'PDF', es: 'PDF' }, slug: 'pdf' },
      { title: { en: 'The .reboslides file', es: 'El archivo .reboslides' }, slug: 'file' },
    ],
  },
  {
    title: { en: 'Reference', es: 'Referencia' },
    color: 'green',
    items: [
      { title: { en: 'Packages', es: 'Paquetes' }, slug: 'packages' },
      { title: { en: 'How it works', es: 'Cómo funciona' }, slug: 'architecture' },
      { title: { en: 'Status and roadmap', es: 'Estado y hoja de ruta' }, slug: 'status' },
    ],
  },
];

export const PAGES = NAV.flatMap((group) => group.items);
/** The group a page is in, for the line above its title. */
export const groupOf = (slug: string) => NAV.find((group) => group.items.some((item) => item.slug === slug));
export const hrefOf = (slug: string) => (slug === 'index' ? '/docs/' : `/docs/${slug}/`);
