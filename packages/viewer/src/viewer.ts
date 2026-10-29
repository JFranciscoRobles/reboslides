// A deck only to look at: its slides drawn as the studio draws them, one under
// another or as a grid, with a bar floating over them (the slide one is on,
// the way they are set out, presenting and printing). For a file manager, a
// preview, a page that shows a deck: anywhere a deck is seen and not made.
// And a slide as a picture, for its thumbnail.

import { type Deck, type Slide, parseDeck } from '@reboslides/core';
import { CanvasMeasurer, type DrawContext, ImageStore, drawSlide, fontSheets, googleFontsUrl, loadFonts } from '@reboslides/editor';

/** A deck: one of the engine, the text of a .reboslides file, or its bytes. */
export type ViewerSource = Deck | string | Uint8Array | ArrayBuffer;

export const deckOf = (source: ViewerSource): Deck =>
  typeof source === 'string' ? parseDeck(source) : source instanceof Uint8Array || source instanceof ArrayBuffer ? parseDeck(new TextDecoder().decode(source)) : source;

/** How the slides are set out: one under another, each as wide as there is room for, or all of them as a grid. */
export type ViewerLayout = 'slides' | 'grid';

export interface ViewerOptions {
  layout?: ViewerLayout;
  /** False to leave out the bar; presenting and printing are then the application's. */
  bar?: boolean;
  /** The language of the bar: 'es' or 'en'. The browser's when left out. */
  locale?: string;
}

export interface Viewer {
  readonly deck: Deck;
  readonly layout: ViewerLayout;
  setLayout(layout: ViewerLayout): void;
  /** Full screen from a slide, with the arrows, the space bar or a click; Escape to leave. */
  present(from?: number): void;
  /** The browser's print dialog, a slide to a page: to paper, or to a PDF. */
  print(): void;
  /** Shows a slide: scrolled to it. */
  goTo(index: number): void;
  destroy(): void;
}

const TEXTS = {
  es: { slides: 'Diapositivas', grid: 'Cuadrícula', present: 'Presentar', print: 'Imprimir', of: 'de' },
  en: { slides: 'Slides', grid: 'Grid', present: 'Present', print: 'Print', of: 'of' },
};

const STYLE_ID = 'rv-viewer-style';
const STYLES = `
.rv-root{position:relative;display:flex;flex-direction:column;min-height:100%;box-sizing:border-box;padding:24px 24px 16px;background:#efede8;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#2f2e2b}
.rv-slides{flex:1;display:flex;flex-direction:column;align-items:center;gap:24px}
.rv-root[data-layout="grid"] .rv-slides{flex-direction:row;flex-wrap:wrap;justify-content:center;align-content:flex-start;gap:16px}
.rv-slide{position:relative;flex:none;border-radius:3px;box-shadow:0 1px 3px rgba(47,46,43,.12),0 8px 24px -12px rgba(47,46,43,.18);background:#fff;cursor:pointer}
.rv-slide canvas{display:block;width:100%;height:100%;border-radius:3px}
.rv-slide span{position:absolute;left:6px;bottom:6px;padding:0 6px;border-radius:4px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;font-weight:600}
.rv-root[data-layout="slides"] .rv-slide span{display:none}
.rv-bar{position:sticky;bottom:16px;z-index:2;display:flex;justify-content:center;margin-top:16px;pointer-events:none}
.rv-bar>div{display:flex;align-items:center;gap:4px;padding:5px;border:1px solid #e6e3dc;border-radius:14px;background:#fbfaf8;box-shadow:0 1px 2px rgba(47,46,43,.05),0 10px 30px -18px rgba(47,46,43,.28);pointer-events:auto}
.rv-bar button{height:30px;padding:0 11px;border:0;border-radius:9px;background:none;font:inherit;color:inherit;cursor:pointer}
.rv-bar button:hover{background:#f3f1ec}
.rv-bar button[aria-pressed="true"]{background:#f0ebf8;color:#6741d9;font-weight:600}
.rv-bar .rv-count{padding:0 10px;color:#5f5d58;font-variant-numeric:tabular-nums}
.rv-bar i{width:1px;height:18px;background:#e6e3dc}
.rv-present{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:#000;cursor:none}
.rv-present canvas{max-width:100%;max-height:100%}
.rv-print{display:none}
@media print{body>*:not(.rv-print){display:none!important}.rv-print{display:block!important}.rv-print img{display:block;width:100%;page-break-after:always;break-after:page}}
`;

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

/** The families the themes are set in, asked for once for the page. */
function askFonts(): void {
  const href = googleFontsUrl();
  if (document.querySelector(`link[href="${CSS.escape(href)}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}

/** What draws slides: a measurer of text and the pictures, shared by everything a page shows. */
let shared: { dc: DrawContext; measurer: CanvasMeasurer; listeners: Set<() => void> } | undefined;
function context(): NonNullable<typeof shared> {
  if (shared) return shared;
  askFonts();
  const listeners = new Set<() => void>();
  const measurer = new CanvasMeasurer();
  const redraw = () => {
    for (const fn of listeners) fn();
  };
  shared = { measurer, listeners, dc: { measurer, images: new ImageStore(redraw) } };
  loadFonts(() => {
    measurer.reset();
    redraw();
  });
  return shared;
}

/** The families the text of a slide is set in, waited for: a slide drawn before its fonts come is measured in others. */
async function fontsOf(slide: Slide, measurer: CanvasMeasurer): Promise<void> {
  if (!document.fonts) return;
  await fontSheets();
  const families = new Set<string>();
  for (const element of slide.elements)
    if (element.type === 'text') for (const paragraph of element.doc.paragraphs) for (const run of paragraph.runs) if (run.props.fontFamily) families.add(run.props.fontFamily);
  // Asked for each time, which costs nothing once they are here: WebKit's `check` says yes of faces it has not loaded.
  const faces = await Promise.all([...families].flatMap((family) => [document.fonts.load(`16px "${family}"`), document.fonts.load(`bold 16px "${family}"`)]).map((p) => p.catch(() => [])));
  if (faces.some((found) => found.length)) measurer.reset();
}

/** A slide on a canvas `width` pixels wide, its pictures and its fonts waited for. */
export async function slideCanvas(deck: Deck, index = 0, width = 320): Promise<HTMLCanvasElement> {
  const { dc, measurer } = context();
  const slide = deck.slides[index] ?? deck.slides[0];
  await Promise.all([dc.images.ready([slide]), fontsOf(slide, measurer)]);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = Math.round((width * deck.size.height) / deck.size.width);
  drawSlide(canvas.getContext('2d')!, slide, deck.size, width / deck.size.width, dc);
  return canvas;
}

/** A slide as a picture, for a thumbnail: a PNG data URL `width` pixels wide. */
export async function slidePicture(source: ViewerSource, index = 0, width = 320): Promise<string> {
  return (await slideCanvas(deckOf(source), index, width)).toDataURL('image/png');
}

/** A deck to look at in `container`, which must have a size. */
export function createViewer(container: HTMLElement, source: ViewerSource, options: ViewerOptions = {}): Viewer {
  injectStyle();
  const deck = deckOf(source);
  const words = TEXTS[(options.locale ?? navigator.language).toLowerCase().startsWith('es') ? 'es' : 'en'];
  const { dc, listeners } = context();
  let layout: ViewerLayout = options.layout ?? 'slides';
  let current = 0;

  const root = document.createElement('div');
  root.className = 'rv-root';
  const list = document.createElement('div');
  list.className = 'rv-slides';
  root.append(list);
  container.append(root);

  const items = deck.slides.map((_slide, i) => {
    const box = document.createElement('div');
    box.className = 'rv-slide';
    const canvas = document.createElement('canvas');
    const number = document.createElement('span');
    number.textContent = String(i + 1);
    box.append(canvas, number);
    box.addEventListener('click', () => (layout === 'grid' ? (setLayout('slides'), goTo(i)) : present(i)));
    list.append(box);
    return { box, canvas };
  });

  let count: HTMLElement | undefined;
  const pressed: Partial<Record<ViewerLayout, HTMLButtonElement>> = {};
  if (options.bar !== false) {
    const bar = document.createElement('div');
    bar.className = 'rv-bar';
    const inner = document.createElement('div');
    const button = (label: string, run: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', run);
      inner.append(b);
      return b;
    };
    button('‹', () => goTo(current - 1)).setAttribute('aria-label', '‹');
    count = document.createElement('span');
    count.className = 'rv-count';
    inner.append(count);
    button('›', () => goTo(current + 1)).setAttribute('aria-label', '›');
    inner.append(document.createElement('i'));
    pressed.slides = button(words.slides, () => setLayout('slides'));
    pressed.grid = button(words.grid, () => setLayout('grid'));
    inner.append(document.createElement('i'));
    button(`▶ ${words.present}`, () => present(current));
    button(words.print, () => print());
    bar.append(inner);
    root.append(bar);
  }

  /** Every slide drawn at the width the layout gives it. */
  const draw = () => {
    const room = container.clientWidth - 48;
    const width = layout === 'grid' ? Math.min(300, Math.max(160, (room - 16 * 3) / 4)) : Math.min(1100, Math.max(240, room));
    const height = (width * deck.size.height) / deck.size.width;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    items.forEach(({ box, canvas }, i) => {
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) drawSlide(ctx, deck.slides[i], deck.size, (width * dpr) / deck.size.width, dc);
    });
  };
  const showCount = () => {
    if (count) count.textContent = `${current + 1} ${words.of} ${deck.slides.length}`;
    for (const [mode, b] of Object.entries(pressed)) b?.setAttribute('aria-pressed', String(mode === layout));
  };

  // The slide on show: the one most in view as the slides are scrolled.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting && entry.intersectionRatio > 0.5) current = items.findIndex((item) => item.box === entry.target);
      showCount();
    },
    { root: container, threshold: [0.5] },
  );
  for (const { box } of items) observer.observe(box);
  const resized = new ResizeObserver(() => draw());
  resized.observe(container);
  listeners.add(draw);

  function setLayout(next: ViewerLayout): void {
    layout = next;
    root.dataset.layout = next;
    draw();
    showCount();
  }

  function goTo(index: number): void {
    current = Math.max(0, Math.min(deck.slides.length - 1, index));
    items[current].box.scrollIntoView({ block: layout === 'grid' ? 'nearest' : 'center', behavior: 'smooth' });
    showCount();
  }

  function present(from = current): void {
    let at = from;
    const screen = document.createElement('div');
    screen.className = 'rv-present';
    screen.tabIndex = 0;
    const canvas = document.createElement('canvas');
    screen.append(canvas);
    const show = () => {
      const scale = Math.min(window.innerWidth / deck.size.width, window.innerHeight / deck.size.height);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(deck.size.width * scale * dpr);
      canvas.height = Math.round(deck.size.height * scale * dpr);
      canvas.style.width = `${deck.size.width * scale}px`;
      drawSlide(canvas.getContext('2d')!, deck.slides[at], deck.size, scale * dpr, dc);
    };
    const step = (by: number) => {
      const next = at + by;
      if (next >= deck.slides.length) return leave();
      at = Math.max(0, next);
      show();
    };
    const keys = (event: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(event.key)) step(1);
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(event.key)) step(-1);
      else if (event.key === 'Escape') leave();
      else return;
      event.preventDefault();
    };
    const leave = () => {
      window.removeEventListener('keydown', keys, true);
      window.removeEventListener('resize', show);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      screen.remove();
      goTo(at);
    };
    screen.addEventListener('click', () => step(1));
    window.addEventListener('keydown', keys, true);
    window.addEventListener('resize', show);
    document.body.append(screen);
    show();
    screen.focus();
    void screen.requestFullscreen?.().catch(() => {});
  }

  function print(): void {
    const sheet = document.createElement('div');
    sheet.className = 'rv-print';
    const width = 1600;
    const page = document.createElement('style');
    page.textContent = `@page{size:${deck.size.width}pt ${deck.size.height}pt;margin:0}`;
    for (const slide of deck.slides) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = Math.round((width * deck.size.height) / deck.size.width);
      drawSlide(canvas.getContext('2d')!, slide, deck.size, width / deck.size.width, dc);
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      sheet.append(img);
    }
    document.head.append(page);
    document.body.append(sheet);
    const done = () => {
      sheet.remove();
      page.remove();
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  }

  setLayout(layout);
  void dc.images.ready(deck.slides).then(draw);

  return {
    deck,
    get layout() {
      return layout;
    },
    setLayout,
    present,
    print,
    goTo,
    destroy() {
      listeners.delete(draw);
      observer.disconnect();
      resized.disconnect();
      root.remove();
    },
  };
}
