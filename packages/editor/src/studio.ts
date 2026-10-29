// The studio: the deck being made, the slide on show and what is picked on
// it, and everything done to them by hand. The slide is drawn on a canvas;
// over it, in the page, go the boxes of what is picked, their handles, the
// guides an element snaps to, and, in a box of text being edited, the caret
// and the selection the engine of rebodocs works out. Every change goes
// through `commit`, which keeps the deck before it for undoing.

import {
  untitledDeck,
  type Deck,
  type Element,
  type ImageElement,
  type Slide,
  type TextElement,
  type Order,
  addElements,
  addSlide,
  alignElements,
  boundsOf,
  copyElement,
  createDeck,
  createImage,
  createText,
  deleteSlide,
  distributeElements,
  duplicateElements,
  duplicateSlide,
  elementAt,
  fitText,
  moveSlide,
  parseDeck,
  patchElements,
  plainTextOf,
  removeElements,
  resizeGroup,
  scaleText,
  type Rect,
  reorderElements,
  serializeDeck,
  toJson,
  fromJson,
  setTitle,
  textLayout,
  textOffset,
  toElement,
  toSlide,
  unionOf,
  updateElements,
  type Alignment,
  FILE_EXTENSION,
  DEFAULT_UNIT,
  UNITS,
  type Unit,
  formatLength,
  resizeDeck,
  setUnit,
  toUnit,
  exportPptx,
  importPptx,
  applyChanges,
  diffDecks,
} from '@reboslides/core';
import { renderProperties, textActions } from './properties';
import { button, download, fileName, h } from './dom';
import {
  type Layout,
  type LayoutCache,
  type Position,
  type Range,
  CanvasMeasurer,
  caretRect,
  clampPosition,
  comparePositions,
  createLayoutCache,
  deleteRange,
  docEnd,
  hitTest,
  insertText,
  lineForPosition,
  moveChar,
  moveWord,
  orderedRange,
  selectionRects,
  splitParagraph,
  textInRange,
  wordRangeAt,
} from './engine';
import { loadFonts } from './fonts';
import { type Names, type Strings, languageOf, namesFor, say, stringsFor } from './i18n';
import { ICONS } from './icons';
import { type PanelTab, renderPanel, PANEL_TABS } from './panels';
import { openExportDialog } from './exportdialog';
import { createMenuScreen } from './menuscreen';
import { deckPdf } from './pdfexport';
import { ImageStore, drawSlide, slideCanvas } from './render';
import { injectStyles } from './styles';

export interface StudioOptions {
  /** The deck to start with; the one kept in the browser, or a new one, when not given. */
  deck?: Deck;
  /** Where in `localStorage` the deck is kept between visits; null to keep it nowhere. */
  storageKey?: string | null;
  /**
   * Inside a box of a page, not over the whole window: the studio fills its
   * parent, which has to be positioned and have a height, and takes the keys,
   * copying and pasting only while it has the focus.
   */
  embedded?: boolean;
  /** The light or the dark theme; the one chosen last, or the system's, when not given. */
  theme?: 'light' | 'dark';
  /** Called with the deck once changes to it have stopped for a moment: where an application saves it. */
  onChange?: (deck: Deck) => void;
  /**
   * False for the slide alone: no bar, panels, properties or pages, for an
   * application that draws its own around it (what the headless hooks of
   * @reboslides/react mount). The slide is still edited by hand.
   */
  chrome?: boolean;
  /** The language of the studio, and of the slides of the designs: 'es' or 'en'. The browser's when left out. */
  locale?: string;
  /**
   * Given, the menu has the choice of language, and this is called with the one chosen: the application mounts
   * the studio again in it, with the same deck.
   */
  onLocale?: (locale: 'en' | 'es') => void;
}

/** Someone else working on the deck, as their selection is drawn. */
export interface StudioPeer {
  client: string;
  name: string;
  color: string;
  /** The slide they are on, and what they have picked on it. */
  slide?: string;
  selection: string[];
}

/** What the studio tells: `change` with every new deck (`remote` when it came from someone else), `state` after it is drawn again. */
export type StudioEvent = 'change' | 'state';
type StudioListener = (deck: Deck, remote: boolean) => void;

export interface TextEditing {
  id: string;
  anchor: Position;
  focus: Position;
  /** Where the caret goes up and down from, kept while it does so. */
  goalX?: number;
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

type Gesture =
  | { kind: 'move'; start: { x: number; y: number }; deck: Deck; moved: boolean }
  | { kind: 'resize'; handle: Handle; element: Element; deck: Deck; shift: boolean }
  | { kind: 'group'; handle: Handle; from: Rect; deck: Deck }
  | { kind: 'rotate'; element: Element; deck: Deck }
  | { kind: 'marquee'; start: { x: number; y: number }; now: { x: number; y: number }; before: string[] }
  | { kind: 'text'; id: string };

const HISTORY_LIMIT = 200;
/** Changes of the same kind closer together than this are undone as one: a word typed, a colour dragged through. */
const MERGE_WINDOW = 1200;
/** How near, in pixels of the screen, an element snaps to an edge or a centre. */
const SNAP = 6;
const CLIPBOARD_MARK = 'reboslides/elements\n';
const NUDGE = 1;

export class Studio {
  readonly root: HTMLElement;
  deck: Deck;
  current = 0;
  selection: string[] = [];
  editing?: TextEditing;
  panelTab: PanelTab | null = 'templates';
  themeId = 'minimal';
  /** Pictures put in during this session, to put in again from the panel. */
  uploads: { src: string; width: number; height: number }[] = [];
  readonly measurer: CanvasMeasurer;
  readonly images: ImageStore;
  cache: LayoutCache = createLayoutCache();

  private layouts = new WeakMap<TextElement, Layout>();
  /**
   * Each step of history: the deck before it and after it. Undoing makes the
   * changes from one to the other on the deck as it is now, so that what
   * other people changed meanwhile stays.
   */
  private undoStack: { before: Deck; after: Deck }[] = [];
  private redoStack: { before: Deck; after: Deck }[] = [];
  private listeners: { event: StudioEvent; fn: StudioListener }[] = [];
  private peers: StudioPeer[] = [];
  /** Whether the bar, the panels and the pages are there. */
  readonly chrome: boolean;
  private lastMerge?: { key: string; at: number };
  private gesture?: Gesture;
  private guides: { x?: number; y?: number }[] = [];
  private hoverId?: string;
  private zoom: number | 'fit' = 'fit';
  private scale = 1;
  private clipboard: Element[] = [];
  private storageKey: string | null;
  private saveTimer = 0;
  private frame = 0;
  private dirty = { stage: true, overlay: true, context: true, strip: true, panel: true };
  /** Set while the bar over the slide changes the deck: the bar stays as it is, its fields in the middle of being used. */
  fromContext = false;
  private thumbs = new Map<string, { slide: Slide; canvas: HTMLCanvasElement }>();
  private dragSlide = -1;

  // The parts of the page.
  private body!: HTMLElement;
  private rail!: HTMLElement;
  panel!: HTMLElement;
  properties!: HTMLElement;
  private menuScreen?: ReturnType<typeof createMenuScreen>;
  private viewport!: HTMLElement;
  private stage!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private overlay!: HTMLElement;
  private input!: HTMLTextAreaElement;
  private strip!: HTMLElement;
  private counter!: HTMLElement;
  private zoomInput!: HTMLInputElement;
  private titleInput!: HTMLInputElement;
  private undoButton!: HTMLButtonElement;
  private redoButton!: HTMLButtonElement;

  constructor(parent: HTMLElement, options: StudioOptions = {}) {
    injectStyles();
    this.storageKey = options.storageKey === undefined ? 'reboslides:deck' : options.storageKey;
    this.deck = options.deck ?? this.restore() ?? createDeck(untitledDeck(languageOf(options.locale ?? (typeof navigator === 'undefined' ? undefined : navigator.language))));
    this.measurer = new CanvasMeasurer();
    this.images = new ImageStore(() => {
      // Thumbnails drawn before a picture came are drawn again with it.
      this.thumbs.clear();
      this.invalidate('stage', 'strip', 'panel');
    });
    this.embedded = !!options.embedded;
    this.chrome = options.chrome !== false;
    this.language = languageOf(options.locale ?? (typeof navigator === 'undefined' ? undefined : navigator.language));
    this.t = stringsFor(this.language);
    this.names = namesFor(this.language);
    this.onLocale = options.onLocale;
    this.onChange = options.onChange;
    this.root = h('div', { class: `rs-app${this.embedded ? ' rs-embedded' : ''}` });
    parent.append(this.root);
    this.build();
    this.setTheme(options.theme ?? storedTheme() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    this.deck = this.fitAll(this.deck);
    this.invalidate();
    // Text measured before its font came is measured again when it comes.
    loadFonts(() => this.destroyed || this.fontsChanged());
  }

  private readonly embedded: boolean;
  private readonly onChange?: (deck: Deck) => void;
  private readonly onLocale?: (locale: 'en' | 'es') => void;
  /** The language of the studio, what it says in it, and the names of what the engine names. */
  readonly language!: 'en' | 'es';
  readonly t!: Strings;
  readonly names!: Names;
  /** The deck last kept and told, so that the same one is not told twice. */
  private saved?: Deck;
  private destroyed = false;
  private disposers: (() => void)[] = [];

  /** A listener on something outside the studio, taken off when the studio is destroyed. */
  private listen<K extends keyof WindowEventMap>(target: Window | Document, type: K, fn: (e: WindowEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void {
    target.addEventListener(type, fn as EventListener, options);
    this.disposers.push(() => target.removeEventListener(type, fn as EventListener, options));
  }

  /** Whether a key, a copy or a paste is the studio's: always on its own page; inside a page, while the focus is in it. */
  private owns(): boolean {
    if (this.menuScreen?.isOpen()) return false;
    return !this.embedded || this.root.contains(document.activeElement);
  }

  /** The studio taken out of the page, with everything it listened to: what a component does when it goes. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
    this.menuScreen?.destroy();
    cancelAnimationFrame(this.frame);
    clearTimeout(this.saveTimer);
    this.root.remove();
  }

  // —— The deck and its history ——

  get slide(): Slide {
    return this.deck.slides[Math.min(this.current, this.deck.slides.length - 1)];
  }

  get picked(): Element[] {
    return this.slide.elements.filter((e) => this.selection.includes(e.id));
  }

  /** The deck made `next`, the one before kept for undoing: with the one before that, when the two changes are of the same `merge` kind and close together. */
  commit(next: Deck, merge?: string): void {
    if (next === this.deck) return;
    const now = Date.now();
    const merging = merge && this.lastMerge?.key === merge && now - this.lastMerge.at < MERGE_WINDOW && this.undoStack.length;
    const before = merging ? this.undoStack[this.undoStack.length - 1].before : this.deck;
    if (merging) this.undoStack.pop();
    this.lastMerge = merge ? { key: merge, at: now } : undefined;
    this.redoStack = [];
    this.setDeck(this.fitChanged(next, this.deck));
    this.undoStack.push({ before, after: this.deck });
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
  }

  /**
   * The deck made `deck` by someone else: no step of history of this
   * person's, and the selection and the text being typed kept where they still are.
   */
  applyRemote(deck: Deck): void {
    if (deck === this.deck) return;
    this.setDeck(deck, true);
  }

  /** Listens to the studio; what it returns stops listening. */
  on(event: StudioEvent, fn: StudioListener): () => void {
    const entry = { event, fn };
    this.listeners.push(entry);
    return () => {
      this.listeners = this.listeners.filter((one) => one !== entry);
    };
  }

  private emit(event: StudioEvent, remote = false): void {
    for (const { event: on, fn } of this.listeners) if (on === event) fn(this.deck, remote);
  }

  /** The others working on the deck: their selections are drawn on the slide they are on. */
  setPeers(peers: StudioPeer[]): void {
    this.peers = peers;
    this.invalidate('overlay');
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** The step made again on the deck as it is now: the deck it ended in when nothing else changed since. */
  private replay(from: Deck, to: Deck): Deck {
    return this.deck === from ? to : applyChanges(this.deck, diffDecks(from, to));
  }

  /** The deck shown as `next` without a step of history: a gesture's, which `endGesture` makes one. */
  private preview(next: Deck): void {
    this.setDeck(this.fitChanged(next, this.deck));
  }

  private setDeck(deck: Deck, remote = false): void {
    this.deck = deck;
    this.current = Math.min(this.current, deck.slides.length - 1);
    const ids = new Set(this.slide.elements.map((e) => e.id));
    this.selection = this.selection.filter((id) => ids.has(id));
    if (this.editing) {
      const el = this.slide.elements.find((e) => e.id === this.editing!.id);
      if (el?.type !== 'text') this.editing = undefined;
      else this.editing = { ...this.editing, anchor: clampPosition(el.doc, this.editing.anchor), focus: clampPosition(el.doc, this.editing.focus) };
    }
    this.invalidate();
    this.scheduleSave();
    this.emit('change', remote);
  }

  undo(): void {
    const step = this.undoStack.pop();
    if (!step) return;
    this.lastMerge = undefined;
    this.editing = undefined;
    this.setDeck(this.replay(step.after, step.before));
    this.redoStack.push(step);
  }

  redo(): void {
    const step = this.redoStack.pop();
    if (!step) return;
    this.lastMerge = undefined;
    this.editing = undefined;
    this.setDeck(this.replay(step.before, step.after));
    this.undoStack.push(step);
  }

  /** The text boxes that changed since `before` made as tall as their text, where they follow it. */
  private fitChanged(next: Deck, before: Deck): Deck {
    const old = new Set(before.slides);
    let deck = next;
    for (const slide of next.slides) {
      if (old.has(slide)) continue;
      const known = new Set(before.slides.find((s) => s.id === slide.id)?.elements);
      const ids = slide.elements.filter((e) => e.type === 'text' && e.autoHeight && !known.has(e)).map((e) => e.id);
      if (ids.length) deck = updateElements(deck, slide.id, ids, (e) => fitText(e as TextElement, this.measurer, this.cache));
    }
    return deck;
  }

  private fitAll(deck: Deck): Deck {
    let out = deck;
    for (const slide of deck.slides) {
      const ids = slide.elements.filter((e) => e.type === 'text' && e.autoHeight).map((e) => e.id);
      out = updateElements(out, slide.id, ids, (e) => fitText(e as TextElement, this.measurer, this.cache));
    }
    return out;
  }

  private fontsChanged(): void {
    this.measurer.reset();
    this.cache = createLayoutCache();
    this.layouts = new WeakMap();
    this.thumbs.clear();
    this.panel.dataset.key = '';
    this.deck = this.fitAll(this.deck);
    this.invalidate();
  }

  layoutOf = (element: TextElement): Layout => {
    let layout = this.layouts.get(element);
    if (!layout) {
      layout = textLayout(element, this.measurer, this.cache);
      this.layouts.set(element, layout);
    }
    return layout;
  };

  get drawContext() {
    return { measurer: this.measurer, images: this.images, cache: this.cache, layoutOf: this.layoutOf };
  }

  // —— What is shown ——

  select(ids: string[]): void {
    if (this.editing && !ids.includes(this.editing.id)) this.stopEditing();
    this.selection = ids;
    this.invalidate('overlay', 'context', 'panel');
  }

  goTo(index: number): void {
    const to = Math.max(0, Math.min(index, this.deck.slides.length - 1));
    if (to === this.current) return;
    this.stopEditing();
    this.current = to;
    this.selection = [];
    this.invalidate();
    this.thumbs.get(this.slide.id)?.canvas.parentElement?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  invalidate(...parts: (keyof Studio['dirty'])[]): void {
    for (const part of parts.length ? parts : (Object.keys(this.dirty) as (keyof Studio['dirty'])[])) this.dirty[part] = true;
    if (!this.frame && !this.destroyed) this.frame = requestAnimationFrame(() => this.render());
  }

  private render(): void {
    this.frame = 0;
    const d = this.dirty;
    this.dirty = { stage: false, overlay: false, context: false, strip: false, panel: false };
    if (d.stage) this.renderStage();
    if (d.stage || d.overlay) this.renderOverlay();
    if (this.chrome) {
      if (d.context || d.stage) renderProperties(this, !this.fromContext);
      if (d.strip || d.stage) this.renderStrip();
      if (d.panel) renderPanel(this);
      this.titleInput.value !== this.deck.title && document.activeElement !== this.titleInput && (this.titleInput.value = this.deck.title);
      this.undoButton.disabled = !this.undoStack.length;
      this.redoButton.disabled = !this.redoStack.length;
      this.counter.textContent = `${this.current + 1} / ${this.deck.slides.length}`;
      this.unitPicker.value = this.unit;
    }
    this.emit('state');
  }

  private build(): void {
    this.titleInput = h('input', {
      class: 'rs-title',
      'aria-label': this.t.deckName,
      oninput: () => this.commit(setTitle(this.deck, this.titleInput.value), 'title'),
    });
    const t = this.t;
    this.undoButton = button(ICONS.undo, t.undo, () => this.undo());
    this.redoButton = button(ICONS.redo, t.redo, () => this.redo());
    const menuButton = button(ICONS.menu, t.menu, () => this.menuScreen?.open());
    const exportButton = h('button', { type: 'button', class: 'sp-button sp-button-secondary', 'aria-haspopup': 'dialog', onclick: () => openExportDialog(this, exportButton) }, t.download);
    const presentButton = h('button', { type: 'button', class: 'sp-button sp-button-accent', onclick: () => this.present() });
    presentButton.innerHTML = `${ICONS.play}<span>${t.present}</span>`;
    const top = h(
      'header',
      { class: 'rs-top' },
      menuButton,
      h('div', { class: 'rs-divider-v' }),
      h('div', { class: 'rs-app-icon', 'aria-hidden': 'true' }),
      h('div', { class: 'rs-app-name' }, 'ReboSlides'),
      h('div', { class: 'rs-divider-v' }),
      this.undoButton,
      this.redoButton,
      h('div', { class: 'rs-spacer' }),
      this.titleInput,
      h('div', { class: 'rs-spacer' }),
      exportButton,
      presentButton,
    );

    this.rail = h('nav', { class: 'rs-rail', 'aria-label': t.panels });
    for (const tab of PANEL_TABS) {
      const b = h('button', {
        type: 'button',
        'data-tab': tab.id,
        onclick: () => {
          this.panelTab = this.panelTab === tab.id ? null : tab.id;
          // The strip too: it folds the column away and marks the tab.
          this.invalidate('panel', 'strip');
        },
      });
      const name = t[tab.name];
      b.title = name;
      b.setAttribute('aria-label', name);
      b.innerHTML = `${ICONS[tab.icon]}<span>${name}</span>`;
      this.rail.append(b);
    }
    this.panel = h('aside', { class: 'rs-panel' });

    this.properties = h('aside', { class: 'rs-props', 'aria-label': t.properties });
    this.canvas = h('canvas');
    this.overlay = h('div', { class: 'rs-overlay' });
    this.stage = h('div', { class: 'rs-stage' }, this.canvas, this.overlay);
    this.viewport = h('div', { class: 'rs-viewport', tabindex: 0 }, this.stage);
    this.input = h('textarea', { class: 'rs-input', 'aria-label': t.text, autocapitalize: 'off', spellcheck: false });

    this.strip = h('div', { class: 'rs-strip' });
    this.unitPicker = h('select', { class: 'sp-picker rs-unit', 'aria-label': t.unitOfMeasure, title: t.unitOfMeasure });
    for (const unit of UNITS) this.unitPicker.append(h('option', { value: unit }, unit));
    this.unitPicker.addEventListener('change', () => this.setUnit(this.unitPicker.value as Unit));
    this.counter = h('span');
    this.zoomInput = h('input', {
      type: 'range',
      min: 25,
      max: 250,
      step: 5,
      'aria-label': t.zoom,
      oninput: () => {
        this.zoom = Number(this.zoomInput.value) / 100;
        this.invalidate('stage');
      },
    });
    const bottom = h(
      'div',
      { class: 'rs-bottom' },
      this.strip,
      h(
        'div',
        { class: 'rs-zoom' },
        this.counter,
        this.unitPicker,
        this.zoomInput,
        h(
          'button',
          {
            type: 'button',
            class: 'sp-button sp-button-quiet',
            onclick: () => {
              this.zoom = 'fit';
              this.invalidate('stage');
            },
          },
          t.fit,
        ),
      ),
    );
    const main = h('main', { class: 'rs-main' }, this.viewport, bottom);
    this.body = h('div', { class: 'rs-body' }, this.rail, this.panel, main, this.properties);
    if (!this.chrome) {
      // The slide alone: the application draws the rest.
      this.root.classList.add('rs-bare');
      this.root.append(this.viewport, this.input);
    } else this.root.append(top, this.body, this.input);
    // The menu of the deck, from the first button of the bar, as Rebodocs has it.
    if (this.chrome)
      this.menuScreen = createMenuScreen({
        root: this.root,
        title: () => this.deck.title,
        slideCount: () => this.deck.slides.length,
        theme: () => (this.root.dataset.theme === 'dark' ? 'dark' : 'light'),
        newDeck: () => {
          this.stopEditing();
          this.current = 0;
          this.selection = [];
          this.commit(createDeck(untitledDeck(this.language)));
        },
        openFile: () => this.pickFile(),
        saveFile: () => this.saveFile(),
        present: () => this.present(),
        exportPdf: () => void this.exportPdf(),
        exportPng: () => void this.exportPng(),
        setTheme: (theme) => this.setTheme(theme),
        t,
        language: this.language,
        setLocale: this.onLocale,
        focus: () => this.viewport.focus({ preventScroll: true }),
      });

    const resized = new ResizeObserver(() => this.zoom === 'fit' && this.invalidate('stage'));
    resized.observe(this.viewport);
    this.disposers.push(() => resized.disconnect());
    this.viewport.addEventListener('pointerdown', (e) => this.pointerDown(e));
    this.viewport.addEventListener('pointermove', (e) => this.hover(e));
    this.viewport.addEventListener('pointerleave', () => this.hoverId && ((this.hoverId = undefined), this.invalidate('overlay')));
    this.viewport.addEventListener(
      'wheel',
      (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        this.zoom = Math.max(0.25, Math.min(2.5, this.scale * Math.exp(-e.deltaY / 300)));
        this.invalidate('stage');
      },
      { passive: false },
    );
    this.viewport.addEventListener('dragover', (e) => e.preventDefault());
    this.viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = [...(e.dataTransfer?.files ?? [])];
      const at = this.point(e);
      const deck = files.find((f) => f.name.endsWith(FILE_EXTENSION) || f.name.toLowerCase().endsWith('.pptx'));
      if (deck) this.openFile(deck);
      else this.addImageFiles(files, at);
    });
    this.listen(window, 'pointermove', (e) => this.pointerMove(e));
    this.listen(window, 'pointerup', (e) => this.pointerUp(e));
    this.listen(window, 'keydown', (e) => this.owns() && this.keyDown(e));
    this.listen(document, 'copy', (e) => this.owns() && this.copy(e));
    this.listen(document, 'cut', (e) => this.owns() && this.copy(e, true));
    this.listen(document, 'paste', (e) => this.owns() && this.paste(e));
    this.input.addEventListener('input', () => {
      if (this.composing) return;
      this.typeIn(this.input.value);
    });
    this.input.addEventListener('compositionstart', () => (this.composing = true));
    this.input.addEventListener('compositionend', () => {
      this.composing = false;
      this.typeIn(this.input.value);
    });
    this.input.addEventListener('blur', () => this.invalidate('overlay'));
  }

  private composing = false;
  private unitPicker!: HTMLSelectElement;

  /** The unit the lengths of the deck are shown in. */
  get unit(): Unit {
    return this.deck.unit ?? DEFAULT_UNIT;
  }

  setUnit(unit: Unit): void {
    this.commit(setUnit(this.deck, unit));
  }

  /** Whether a width or a height typed in carries the other with it, and the size of the text. On for a start: what resizing a picture by its measures wants. */
  keepRatio = true;

  setKeepRatio(keep: boolean): void {
    this.keepRatio = keep;
    this.invalidate('context');
  }

  /** Whether the slides made another size scale what is on them to fit. */
  fitOnResize = true;

  /** Every slide made `size`, what is on them scaled to fit or not as `fitOnResize` says. */
  resizeSlides(size: { width: number; height: number }): void {
    this.stopEditing();
    this.commit(resizeDeck(this.deck, size, this.fitOnResize));
    if (this.zoom !== 'fit') this.zoom = 'fit';
    this.thumbs.clear();
    this.panel.dataset.key = '';
    this.invalidate();
  }

  /** The studio in its light or dark theme, kept for the next visit. */
  setTheme(theme: 'light' | 'dark'): void {
    this.root.dataset.theme = theme;
    try {
      localStorage.setItem('reboslides:theme', theme);
    } catch {
      // Not kept: the next visit follows the system.
    }
  }

  /** A part of the page made not to be scrolled by keys meant for the slide. */
  private typingElsewhere(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    return !!el && el !== this.input && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  }

  private renderStage(): void {
    const { width, height } = this.deck.size;
    if (this.zoom === 'fit') {
      const room = this.viewport.getBoundingClientRect();
      this.scale = Math.max(0.1, Math.min((room.width - 64) / width, (room.height - 64) / height));
    } else this.scale = this.zoom;
    this.zoomInput.value = String(Math.round(this.scale * 100));
    const dpr = window.devicePixelRatio || 1;
    const w = width * this.scale;
    const hgt = height * this.scale;
    this.stage.style.width = `${w}px`;
    this.stage.style.height = `${hgt}px`;
    const pw = Math.round(w * dpr);
    const ph = Math.round(hgt * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    drawSlide(this.canvas.getContext('2d')!, this.slide, this.deck.size, this.scale * dpr, this.drawContext);
  }

  // —— What goes over the slide ——

  private boxFor(e: Pick<Element, 'x' | 'y' | 'width' | 'height' | 'rotation'>, cls: string): HTMLElement {
    const s = this.scale;
    return h('div', { class: `rs-box ${cls}`, style: `left:${e.x * s}px;top:${e.y * s}px;width:${e.width * s}px;height:${e.height * s}px;transform:rotate(${e.rotation}deg)` });
  }

  private renderOverlay(): void {
    const s = this.scale;
    const o = this.overlay;
    o.replaceChildren();
    const picked = this.picked;
    // What the others have picked on this slide, in their colours, with their names.
    for (const peer of this.peers) {
      if (peer.slide !== this.slide.id) continue;
      for (const e of this.slide.elements.filter((x) => peer.selection.includes(x.id))) {
        const box = this.boxFor(e, 'rs-peer-box');
        box.style.setProperty('--peer', `#${peer.color.replace('#', '')}`);
        box.append(h('span', { class: 'rs-peer-name' }, peer.name));
        o.append(box);
      }
    }
    const hover = this.slide.elements.find((e) => e.id === this.hoverId && !this.selection.includes(e.id));
    if (hover && !this.gesture) o.append(this.boxFor(hover, 'rs-hover-box'));
    for (const e of picked) {
      const box = this.boxFor(e, 'rs-sel-box');
      o.append(box);
      if (this.editing?.id === e.id && e.type === 'text') this.drawCaret(box, e);
      else if (picked.length === 1 && !e.locked && this.gesture?.kind !== 'move') this.addHandles(box, e);
    }
    if (picked.length > 1) {
      const bounds = unionOf(picked.map(boundsOf));
      const box = this.boxFor({ ...bounds, rotation: 0 }, 'rs-group-box');
      o.append(box);
      // The box of several is scaled from its corners, as a whole, and stretched from its sides.
      if (picked.some((e) => !e.locked) && this.gesture?.kind !== 'move') this.placeHandles(box, bounds.width * s, bounds.height * s, ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'], false);
    }
    for (const g of this.guides) {
      if (g.x !== undefined) o.append(h('div', { class: 'rs-guide', style: `left:${g.x * s - 0.5}px;top:0;width:1px;height:100%` }));
      if (g.y !== undefined) o.append(h('div', { class: 'rs-guide', style: `top:${g.y * s - 0.5}px;left:0;height:1px;width:100%` }));
    }
    const g = this.gesture;
    if (g?.kind === 'marquee') {
      const r = rectOf(g.start, g.now);
      o.append(h('div', { class: 'rs-marquee', style: `left:${r.x * s}px;top:${r.y * s}px;width:${r.width * s}px;height:${r.height * s}px` }));
    }
    if ((g?.kind === 'resize' || g?.kind === 'rotate' || g?.kind === 'group') && picked.length) {
      const e = picked[0];
      const b = g.kind === 'group' ? unionOf(picked.map(boundsOf)) : boundsOf(e);
      const sized = g.kind === 'group' ? b : e;
      const tag = g.kind === 'rotate' ? `${Math.round(e.rotation)}°` : `${formatLength(sized.width, this.unit)} × ${formatLength(sized.height, this.unit)}`;
      o.append(h('div', { class: 'rs-size-tag', style: `left:${(b.x + b.width / 2) * s}px;top:${(b.y + b.height) * s + 34}px` }, tag));
    }
  }

  private addHandles(box: HTMLElement, e: Element): void {
    const line = e.type === 'shape' && e.shape === 'line';
    const handles: Handle[] = line || e.type === 'text' ? (line ? ['w', 'e'] : ['nw', 'ne', 'se', 'sw', 'w', 'e']) : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    this.placeHandles(box, e.width * this.scale, e.height * this.scale, handles, true);
  }

  /** Handles on the edges of a box `w` by `hh` pixels, and the one to turn it by below it. */
  private placeHandles(box: HTMLElement, w: number, hh: number, handles: Handle[], turns: boolean): void {
    const at: Record<Exclude<Handle, 'rotate'>, [number, number]> = { nw: [0, 0], n: [w / 2, 0], ne: [w, 0], e: [w, hh / 2], se: [w, hh], s: [w / 2, hh], sw: [0, hh], w: [0, hh / 2] };
    const cursors: Record<string, string> = { nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw', n: 'ns', s: 'ns', e: 'ew', w: 'ew' };
    for (const handle of handles as Exclude<Handle, 'rotate'>[]) {
      const side = handle.length === 1 ? (handle === 'e' || handle === 'w' ? ' rs-side-h' : ' rs-side-v') : '';
      box.append(h('div', { class: `rs-handle${side}`, 'data-handle': handle, style: `left:${at[handle][0]}px;top:${at[handle][1]}px;cursor:${cursors[handle]}-resize` }));
    }
    if (!turns) return;
    const rotate = h('div', { class: 'rs-handle rs-rotate', 'data-handle': 'rotate', style: `left:${w / 2}px;top:${hh + 28}px`, title: this.t.rotate });
    rotate.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 12a8 8 0 11-2.3-5.6"/><path d="M20 4v5h-5"/></svg>';
    box.append(rotate);
  }

  private drawCaret(box: HTMLElement, e: TextElement): void {
    const ed = this.editing!;
    const s = this.scale;
    const layout = this.layoutOf(e);
    const dy = textOffsetOf(e, layout);
    const range = orderedRange(ed.anchor, ed.focus);
    for (const r of selectionRects(layout, this.measurer, range))
      box.append(h('div', { class: 'rs-sel-rect', style: `left:${r.x * s}px;top:${(r.y + dy) * s}px;width:${Math.max(2, r.width * s)}px;height:${r.height * s}px` }));
    if (comparePositions(ed.anchor, ed.focus) === 0 && document.activeElement === this.input) {
      const c = caretRect(layout, this.measurer, ed.focus);
      box.append(h('div', { class: 'rs-caret', style: `left:${c.x * s - 1}px;top:${(c.y + dy) * s}px;height:${c.height * s}px` }));
    }
  }

  // —— The pointer ——

  /** The point of the slide under the pointer. */
  point(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) / this.scale, y: (e.clientY - r.top) / this.scale };
  }

  private hover(e: PointerEvent): void {
    if (this.gesture) return;
    const p = this.point(e);
    const under = elementAt(this.slide, p.x, p.y, 2 / this.scale);
    const editing = this.editing && under?.id === this.editing.id;
    this.viewport.style.cursor = editing ? 'text' : under ? 'move' : '';
    if (under?.id !== this.hoverId) {
      this.hoverId = under?.id;
      this.invalidate('overlay');
    }
  }

  private pointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const p = this.point(e);
    const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle as Handle | undefined;
    const element = this.picked[0];
    if (handle && this.picked.length > 1) {
      e.preventDefault();
      this.gesture = { kind: 'group', handle, from: unionOf(this.picked.map(boundsOf)), deck: this.deck };
      return;
    }
    if (handle && element) {
      e.preventDefault();
      this.gesture = handle === 'rotate' ? { kind: 'rotate', element, deck: this.deck } : { kind: 'resize', handle, element, deck: this.deck, shift: e.shiftKey };
      return;
    }
    const hit = elementAt(this.slide, p.x, p.y, 2 / this.scale);
    if (this.editing && hit?.id === this.editing.id && hit.type === 'text') {
      e.preventDefault();
      const pos = this.textPosition(hit, p);
      if (e.detail === 2) this.setTextSelection(wordRangeAt(hit.doc, pos).from, wordRangeAt(hit.doc, pos).to);
      else if (e.detail >= 3) this.setTextSelection({ para: pos.para, offset: 0 }, { para: pos.para, offset: hit.doc.paragraphs[pos.para].runs.reduce((n, r) => n + r.text.length, 0) });
      else this.setTextSelection(e.shiftKey ? this.editing.anchor : pos, pos);
      this.gesture = { kind: 'text', id: hit.id };
      return;
    }
    if (hit) {
      e.preventDefault();
      this.viewport.focus({ preventScroll: true });
      if (e.detail === 2 && hit.type === 'text') {
        this.startEditing(hit, p);
        return;
      }
      if (e.shiftKey || e.metaKey) {
        this.select(this.selection.includes(hit.id) ? this.selection.filter((id) => id !== hit.id) : [...this.selection, hit.id]);
        return;
      }
      if (!this.selection.includes(hit.id)) this.select([hit.id]);
      this.gesture = { kind: 'move', start: p, deck: this.deck, moved: false };
      return;
    }
    if (target.closest('.rs-stage') || target === this.viewport) {
      this.viewport.focus({ preventScroll: true });
      this.stopEditing();
      this.gesture = { kind: 'marquee', start: p, now: p, before: e.shiftKey ? this.selection : [] };
      if (!e.shiftKey) this.select([]);
    }
  }

  private pointerMove(e: PointerEvent): void {
    const g = this.gesture;
    if (!g) return;
    const p = this.point(e);
    if (g.kind === 'move') this.moveTo(g, p, e.altKey);
    else if (g.kind === 'resize') this.resizeTo(g, p, e.shiftKey);
    else if (g.kind === 'group') this.resizeGroupTo(g, p, e.shiftKey);
    else if (g.kind === 'rotate') this.rotateTo(g, p, e.shiftKey);
    else if (g.kind === 'marquee') {
      g.now = p;
      const r = rectOf(g.start, p);
      const inside = this.slide.elements.filter((el) => !el.locked && intersects(boundsOf(el), r)).map((el) => el.id);
      this.selection = [...new Set([...g.before, ...inside])];
      this.invalidate('overlay', 'context');
    } else if (g.kind === 'text') {
      const el = this.slide.elements.find((x) => x.id === g.id);
      if (el?.type === 'text' && this.editing) this.setTextSelection(this.editing.anchor, this.textPosition(el, p));
    }
  }

  private pointerUp(_e: PointerEvent): void {
    const g = this.gesture;
    if (!g) return;
    this.gesture = undefined;
    this.guides = [];
    if (g.kind === 'move' || g.kind === 'resize' || g.kind === 'rotate' || g.kind === 'group') {
      if (this.deck !== g.deck) {
        this.undoStack.push({ before: g.deck, after: this.deck });
        this.redoStack = [];
        this.lastMerge = undefined;
      }
    }
    this.invalidate('overlay', 'context', 'strip');
    this.scheduleSave();
  }

  private moveTo(g: Extract<Gesture, { kind: 'move' }>, p: { x: number; y: number }, free: boolean): void {
    let dx = p.x - g.start.x;
    let dy = p.y - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) * this.scale < 3) return;
    g.moved = true;
    const start = g.deck.slides[this.current];
    const moving = start.elements.filter((e) => this.selection.includes(e.id) && !e.locked);
    if (!moving.length) return;
    this.guides = [];
    if (!free) {
      const b = unionOf(moving.map(boundsOf));
      const others = start.elements.filter((e) => !this.selection.includes(e.id)).map(boundsOf);
      const { width: W, height: H } = this.deck.size;
      const xs = [0, W / 2, W, ...others.flatMap((o) => [o.x, o.x + o.width / 2, o.x + o.width])];
      const ys = [0, H / 2, H, ...others.flatMap((o) => [o.y, o.y + o.height / 2, o.y + o.height])];
      const snap = (edges: number[], targets: number[]) => {
        let best: { d: number; at: number } | undefined;
        for (const edge of edges)
          for (const t of targets) {
            const d = t - edge;
            if (Math.abs(d) * this.scale <= SNAP && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, at: t };
          }
        return best;
      };
      const sx = snap([b.x + dx, b.x + dx + b.width / 2, b.x + dx + b.width], xs);
      const sy = snap([b.y + dy, b.y + dy + b.height / 2, b.y + dy + b.height], ys);
      if (sx) (dx += sx.d), this.guides.push({ x: sx.at });
      if (sy) (dy += sy.d), this.guides.push({ y: sy.at });
    }
    const ids = moving.map((e) => e.id);
    this.preview(updateElements(g.deck, start.id, ids, (e) => ({ ...e, x: e.x + dx, y: e.y + dy })));
  }

  private resizeTo(g: Extract<Gesture, { kind: 'resize' }>, p: { x: number; y: number }, shift: boolean): void {
    const o = g.element;
    const q = toElement(o, p.x, p.y);
    let left = 0;
    let top = 0;
    let right = o.width;
    let bottom = o.height;
    if (g.handle.includes('w')) left = Math.min(q.x, right - 8);
    if (g.handle.includes('e')) right = Math.max(q.x, left + 8);
    if (g.handle.includes('n')) top = Math.min(q.y, bottom - 8);
    if (g.handle.includes('s')) bottom = Math.max(q.y, top + 8);
    let w = right - left;
    let hh = bottom - top;
    const corner = g.handle.length === 2;
    const keep = corner && (o.type !== 'shape' || shift);
    if (keep) {
      const k = Math.max(w / o.width, hh / o.height);
      w = o.width * k;
      hh = o.height * k;
      if (g.handle.includes('w')) left = right - w;
      else right = left + w;
      if (g.handle.includes('n')) top = bottom - hh;
      else bottom = top + hh;
    }
    const centre = toSlide(o, (left + right) / 2, (top + bottom) / 2);
    let made: Element = { ...o, width: w, height: hh, x: centre.x - w / 2, y: centre.y - hh / 2 };
    if (o.type === 'text') {
      // Its corners make the text bigger with the box; its sides only make it wider or narrower.
      if (corner) made = { ...(made as TextElement), doc: scaleText(o.doc, w / o.width) };
      else made = { ...(made as TextElement), height: o.height, y: o.y + (centre.y - hh / 2 - o.y) };
    }
    if (o.type === 'shape' && o.shape === 'line') made = { ...made, height: o.height, y: centre.y - o.height / 2 };
    this.preview(updateElements(g.deck, this.slide.id, [o.id], () => made));
  }

  /** The box of several made to follow the pointer by the handle held: from a corner as a whole, unless Shift is held; from a side, stretched. */
  private resizeGroupTo(g: Extract<Gesture, { kind: 'group' }>, p: { x: number; y: number }, free: boolean): void {
    const f = g.from;
    let left = f.x;
    let top = f.y;
    let right = f.x + f.width;
    let bottom = f.y + f.height;
    if (g.handle.includes('w')) left = Math.min(p.x, right - 8);
    if (g.handle.includes('e')) right = Math.max(p.x, left + 8);
    if (g.handle.includes('n')) top = Math.min(p.y, bottom - 8);
    if (g.handle.includes('s')) bottom = Math.max(p.y, top + 8);
    if (g.handle.length === 2 && !free) {
      const k = Math.max((right - left) / f.width, (bottom - top) / f.height);
      if (g.handle.includes('w')) left = right - f.width * k;
      else right = left + f.width * k;
      if (g.handle.includes('n')) top = bottom - f.height * k;
      else bottom = top + f.height * k;
    }
    const to = { x: left, y: top, width: right - left, height: bottom - top };
    this.preview(resizeGroup(g.deck, this.slide.id, this.selection, f, to));
  }

  private rotateTo(g: Extract<Gesture, { kind: 'rotate' }>, p: { x: number; y: number }, shift: boolean): void {
    const o = g.element;
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    let angle = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI - 90;
    if (shift) angle = Math.round(angle / 15) * 15;
    else {
      const near = Math.round(angle / 45) * 45;
      if (Math.abs(angle - near) < 4) angle = near;
    }
    angle = ((((angle + 180) % 360) + 360) % 360) - 180;
    this.preview(patchElements(g.deck, this.slide.id, [o.id], { rotation: Math.round(angle * 10) / 10 }));
  }

  // —— Text ——

  private textPosition(e: TextElement, p: { x: number; y: number }): Position {
    const layout = this.layoutOf(e);
    const local = toElement(e, p.x, p.y);
    return hitTest(layout, this.measurer, 0, local.x, local.y - textOffsetOf(e, layout));
  }

  /** The box of text edited in place, the caret where the pointer is, or all its text picked. */
  startEditing(e: TextElement, at?: { x: number; y: number }): void {
    this.selection = [e.id];
    const pos = at ? this.textPosition(e, at) : undefined;
    this.editing = { id: e.id, anchor: pos ?? { para: 0, offset: 0 }, focus: pos ?? docEnd(e.doc) };
    this.lastMerge = undefined;
    this.input.value = '';
    this.input.focus({ preventScroll: true });
    this.invalidate('overlay', 'context');
  }

  /** The box left: and taken away, when nothing was written in it. */
  stopEditing(): void {
    const ed = this.editing;
    if (!ed) return;
    this.editing = undefined;
    const el = this.slide.elements.find((e) => e.id === ed.id);
    if (el?.type === 'text' && !plainTextOf(el).trim()) this.commit(removeElements(this.deck, this.slide.id, [el.id]));
    if (document.activeElement === this.input) this.viewport.focus({ preventScroll: true });
    this.invalidate('overlay', 'context');
  }

  get editingElement(): TextElement | undefined {
    const el = this.editing && this.slide.elements.find((e) => e.id === this.editing!.id);
    return el?.type === 'text' ? el : undefined;
  }

  get textRange(): Range | undefined {
    return this.editing && orderedRange(this.editing.anchor, this.editing.focus);
  }

  private setTextSelection(anchor: Position, focus: Position, goalX?: number): void {
    if (!this.editing) return;
    this.editing = { ...this.editing, anchor, focus, goalX };
    this.lastMerge = undefined;
    this.invalidate('overlay', 'context');
  }

  /** The text box's document changed by `change`, the caret put where it says. */
  editText(change: (doc: TextElement['doc'], range: Range) => { doc: TextElement['doc']; pos: Position }, merge?: string): void {
    const el = this.editingElement;
    const range = this.textRange;
    if (!el || !range) return;
    const { doc, pos } = change(el.doc, range);
    this.commit(
      updateElements(this.deck, this.slide.id, [el.id], (e) => ({ ...e, doc }) as TextElement),
      merge && `${merge}:${el.id}`,
    );
    if (this.editing) this.editing = { ...this.editing, anchor: pos, focus: pos, goalX: undefined };
  }

  private typeIn(text: string): void {
    this.input.value = '';
    if (!text || !this.editing) return;
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    this.editText(
      (doc, range) => {
        let d = comparePositions(range.from, range.to) ? deleteRange(doc, range) : doc;
        let pos = range.from;
        lines.forEach((line, i) => {
          if (i) ({ doc: d, pos } = splitParagraph(d, pos));
          ({ doc: d, pos } = insertText(d, pos, line));
        });
        return { doc: d, pos };
      },
      lines.length > 1 ? undefined : 'type',
    );
  }

  private textKey(e: KeyboardEvent): boolean {
    const ed = this.editing!;
    const el = this.editingElement!;
    const mod = e.metaKey || e.ctrlKey;
    const collapsed = comparePositions(ed.anchor, ed.focus) === 0;
    const move = (to: Position, goalX?: number) => this.setTextSelection(e.shiftKey ? ed.anchor : to, to, goalX);
    const range = this.textRange!;
    switch (e.key) {
      case 'Escape':
        this.stopEditing();
        return true;
      case 'Enter':
        this.editText((doc, r) => splitParagraph(comparePositions(r.from, r.to) ? deleteRange(doc, r) : doc, r.from));
        return true;
      case 'Backspace':
      case 'Delete': {
        const forward = e.key === 'Delete';
        let r = range;
        if (collapsed) {
          const step = e.altKey ? moveWord : moveChar;
          const other = step(el.doc, ed.focus, forward ? 1 : -1);
          r = orderedRange(ed.focus, other);
          if (!comparePositions(r.from, r.to)) return true;
        }
        this.editText((doc) => ({ doc: deleteRange(doc, r), pos: r.from }), 'delete');
        return true;
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        if (mod) {
          const line = lineForPosition(this.layoutOf(el), ed.focus);
          move({ para: line.para, offset: dir < 0 ? line.start : Math.max(line.start, line.end - (line.lastInParagraph ? 0 : 1)) });
        } else if (!collapsed && !e.shiftKey) move(dir < 0 ? range.from : range.to);
        else move((e.altKey ? moveWord : moveChar)(el.doc, ed.focus, dir));
        return true;
      }
      case 'ArrowUp':
      case 'ArrowDown': {
        const layout = this.layoutOf(el);
        const c = caretRect(layout, this.measurer, ed.focus);
        const x = ed.goalX ?? c.x;
        const y = e.key === 'ArrowUp' ? c.y - 1 : c.y + c.height + 1;
        if (y < 0) move({ para: 0, offset: 0 }, x);
        else if (y > layout.page.height) move(docEnd(el.doc), x);
        else move(hitTest(layout, this.measurer, 0, x, y), x);
        return true;
      }
      case 'Home':
      case 'End': {
        const line = lineForPosition(this.layoutOf(el), ed.focus);
        move({ para: line.para, offset: e.key === 'Home' ? line.start : line.end });
        return true;
      }
    }
    if (mod && e.key.toLowerCase() === 'a') {
      this.setTextSelection({ para: 0, offset: 0 }, docEnd(el.doc));
      return true;
    }
    return false;
  }

  // —— Keys ——

  private keyDown(e: KeyboardEvent): void {
    if (this.presenting || this.typingElsewhere(e.target)) return;
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if (mod && key === 'y') {
      e.preventDefault();
      this.redo();
      return;
    }
    if (mod && key === 's') {
      e.preventDefault();
      this.saveFile();
      return;
    }
    if (this.editing) {
      if (mod && ['b', 'i', 'u'].includes(key)) {
        e.preventDefault();
        const prop = ({ b: 'bold', i: 'italic', u: 'underline' } as const)[key as 'b' | 'i' | 'u'];
        textActions.toggle(this, prop);
        return;
      }
      if (this.textKey(e)) e.preventDefault();
      return;
    }
    const ids = this.selection;
    const slideId = this.slide.id;
    if ((e.key === 'Backspace' || e.key === 'Delete') && ids.length) {
      e.preventDefault();
      this.commit(removeElements(this.deck, slideId, ids));
    } else if (mod && key === 'd' && ids.length) {
      e.preventDefault();
      this.duplicate();
    } else if (mod && key === 'a') {
      e.preventDefault();
      this.select(this.slide.elements.filter((x) => !x.locked).map((x) => x.id));
    } else if (e.key === 'Escape') {
      this.select([]);
    } else if (e.key === 'Enter' && ids.length === 1) {
      const el = this.picked[0];
      if (el.type === 'text') {
        e.preventDefault();
        this.startEditing(el);
      }
    } else if (e.key.startsWith('Arrow') && ids.length) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : NUDGE;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      this.commit(
        updateElements(this.deck, slideId, ids, (x) => (x.locked ? x : { ...x, x: x.x + dx, y: x.y + dy })),
        'nudge',
      );
    } else if ((e.key === 'PageDown' || e.key === 'PageUp') && !ids.length) {
      e.preventDefault();
      this.goTo(this.current + (e.key === 'PageDown' ? 1 : -1));
    }
  }

  // —— Copy and paste ——

  private copy(e: ClipboardEvent, cut = false): void {
    if (this.typingElsewhere(e.target) || this.presenting) return;
    if (this.editing) {
      const el = this.editingElement;
      const range = this.textRange;
      if (!el || !range || !comparePositions(range.from, range.to)) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', textInRange(el.doc, range));
      if (cut) this.editText((doc) => ({ doc: deleteRange(doc, range), pos: range.from }));
      return;
    }
    if (!this.selection.length) return;
    e.preventDefault();
    this.clipboard = structuredClone(this.picked);
    e.clipboardData?.setData('text/plain', CLIPBOARD_MARK + toJson(this.clipboard));
    if (cut) this.commit(removeElements(this.deck, this.slide.id, this.selection));
  }

  private paste(e: ClipboardEvent): void {
    if (this.typingElsewhere(e.target) || this.presenting) return;
    const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    const text = e.clipboardData?.getData('text/plain') ?? '';
    e.preventDefault();
    if (files.length) {
      this.addImageFiles(files);
      return;
    }
    if (this.editing) {
      this.typeIn(text);
      return;
    }
    if (text.startsWith(CLIPBOARD_MARK)) {
      try {
        this.clipboard = fromJson(text.slice(CLIPBOARD_MARK.length));
      } catch {
        return;
      }
    } else if (text.trim()) {
      const { width, height } = this.deck.size;
      const box = createText(text.trim(), { x: width * 0.2, y: height * 0.4, width: width * 0.6 });
      this.addAndSelect([box]);
      return;
    }
    if (!this.clipboard.length) return;
    const copies = this.clipboard.map((el) => copyElement(el, 16, 16));
    this.clipboard = copies;
    this.addAndSelect(copies);
  }

  // —— Acts the panels and bars call ——

  addAndSelect(elements: Element[]): void {
    this.stopEditing();
    this.commit(addElements(this.deck, this.slide.id, elements));
    this.select(elements.map((e) => e.id));
  }

  duplicate(): void {
    const { deck, ids } = duplicateElements(this.deck, this.slide.id, this.selection);
    this.commit(deck);
    this.select(ids);
  }

  remove(): void {
    this.stopEditing();
    this.commit(removeElements(this.deck, this.slide.id, this.selection));
  }

  reorder(order: Order): void {
    this.commit(reorderElements(this.deck, this.slide.id, this.selection, order));
  }

  align(how: Alignment): void {
    this.commit(alignElements(this.deck, this.slide.id, this.selection, how));
  }

  distribute(axis: 'x' | 'y'): void {
    this.commit(distributeElements(this.deck, this.slide.id, this.selection, axis));
  }

  /** Each picked element changed by `change`, as one step of history with the others of the same `merge` kind. */
  change(change: (e: Element) => Element, merge?: string, ids = this.selection): void {
    this.commit(updateElements(this.deck, this.slide.id, ids, change), merge);
  }

  insertSlide(slide?: Slide): void {
    this.stopEditing();
    this.commit(addSlide(this.deck, this.current + 1, slide));
    this.goTo(this.current + 1);
  }

  async addImageFiles(files: File[], at?: { x: number; y: number }): Promise<void> {
    const added: ImageElement[] = [];
    for (const file of files.filter((f) => f.type.startsWith('image/'))) {
      const image = await readImage(file).catch(() => undefined);
      if (!image) continue;
      this.uploads.unshift(image);
      const el = createImage(image.src, image.width, image.height, this.deck.size);
      added.push(at ? { ...el, x: at.x - el.width / 2 + added.length * 16, y: at.y - el.height / 2 + added.length * 16 } : el);
    }
    if (added.length) this.addAndSelect(added);
    else if (files.length) this.toast(this.t.couldNotReadImage);
    this.invalidate('panel');
  }

  // —— The strip of slides ——

  private renderStrip(): void {
    const items: HTMLElement[] = [];
    const seen = new Set<string>();
    this.deck.slides.forEach((slide, i) => {
      seen.add(slide.id);
      let thumb = this.thumbs.get(slide.id);
      if (!thumb || thumb.slide !== slide) {
        const canvas = slideCanvas(slide, this.deck.size, 68 * (this.deck.size.width / this.deck.size.height) * Math.min(2, window.devicePixelRatio || 1), this.drawContext);
        thumb = { slide, canvas };
        this.thumbs.set(slide.id, thumb);
      }
      const tools = h('div', { class: 'rs-thumb-tools' });
      const tool = (icon: string, label: string, act: () => void) => {
        const t = h('span', {
          title: label,
          role: 'button',
          onclick: (ev: Event) => {
            ev.stopPropagation();
            act();
          },
        });
        t.innerHTML = icon;
        tools.append(t);
      };
      tool(ICONS.copy, this.t.duplicateSlide, () => {
        this.commit(duplicateSlide(this.deck, slide.id));
        this.goTo(i + 1);
      });
      tool(ICONS.trash, this.t.deleteSlide, () => this.commit(deleteSlide(this.deck, slide.id)));
      const item = h(
        'button',
        {
          type: 'button',
          class: `rs-thumb${i === this.current ? ' rs-on' : ''}`,
          draggable: true,
          'aria-label': say(this.t.slideN, { n: i + 1 }),
          onclick: () => this.goTo(i),
          ondragstart: () => (this.dragSlide = i),
          ondragover: (ev: Event) => {
            ev.preventDefault();
            item.classList.add('rs-drop-before');
          },
          ondragleave: () => item.classList.remove('rs-drop-before'),
          ondrop: (ev: Event) => {
            ev.preventDefault();
            ev.stopPropagation();
            item.classList.remove('rs-drop-before');
            const from = this.dragSlide;
            if (from < 0) return;
            const to = from < i ? i - 1 : i;
            this.commit(moveSlide(this.deck, from, to));
            this.current = to;
            this.dragSlide = -1;
          },
        },
        thumb.canvas,
        h('span', { class: 'rs-num' }, String(i + 1)),
        tools,
      );
      items.push(item);
    });
    for (const id of this.thumbs.keys()) if (!seen.has(id)) this.thumbs.delete(id);
    const add = h('button', { type: 'button', class: 'rs-add-slide', title: this.t.addSlide, 'aria-label': this.t.addSlide, onclick: () => this.insertSlide() });
    add.innerHTML = ICONS.plus;
    this.strip.replaceChildren(...items, add);
    for (const tab of this.rail.querySelectorAll<HTMLElement>('[data-tab]')) tab.classList.toggle('rs-on', tab.dataset.tab === this.panelTab);
    this.body.classList.toggle('rs-folded', !this.panelTab);
  }

  // —— Files, export, presenting ——

  /** `content` in a box under `anchor`, until a click elsewhere. */
  openPopover(anchor: HTMLElement, content: Node[], role = 'dialog'): HTMLElement {
    document.querySelector('.rs-menu')?.remove();
    const r = anchor.getBoundingClientRect();
    const menu = h('div', { class: 'rs-menu', role, style: `top:${r.bottom + 6}px;left:${r.left}px` }, ...content);
    this.root.append(menu);
    // Kept inside the window: one opened from the right edge opens leftwards.
    menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))}px`;
    const close = (ev: Event) => {
      if (menu.contains(ev.target as Node) || anchor.contains(ev.target as Node)) return;
      menu.remove();
      window.removeEventListener('pointerdown', close, true);
    };
    window.addEventListener('pointerdown', close, true);
    return menu;
  }

  private menu(anchor: HTMLElement, items: ({ label: string; icon?: string; act: () => void } | '-')[]): void {
    const menu = this.openPopover(anchor, [], 'menu');
    for (const item of items) {
      if (item === '-') {
        menu.append(h('hr'));
        continue;
      }
      const b = h('button', {
        type: 'button',
        role: 'menuitem',
        onclick: () => {
          menu.remove();
          item.act();
        },
      });
      b.innerHTML = `${item.icon ?? ''}<span>${item.label}</span>`;
      menu.append(b);
    }
  }

  /** A menu under `anchor`: what the bar over the slide uses too. */
  openMenu(anchor: HTMLElement, items: ({ label: string; icon?: string; act: () => void } | '-')[]): void {
    this.menu(anchor, items);
  }

  saveFile(): void {
    download(new Blob([serializeDeck(this.deck)], { type: 'application/json' }), fileName(this.deck.title, FILE_EXTENSION));
  }

  pickFile(): void {
    const input = h('input', { type: 'file', accept: `${FILE_EXTENSION},.pptx,application/json,application/vnd.openxmlformats-officedocument.presentationml.presentation` });
    input.onchange = () => input.files?.[0] && this.openFile(input.files[0]);
    input.click();
  }

  async openFile(file: File): Promise<void> {
    try {
      let deck: Deck;
      let skipped = 0;
      if (file.name.toLowerCase().endsWith('.pptx')) {
        ({ deck, skipped } = importPptx(new Uint8Array(await file.arrayBuffer())));
        if (deck.title === 'Presentación importada') deck = { ...deck, title: file.name.replace(/\.pptx$/i, '') };
      } else deck = parseDeck(await file.text());
      this.stopEditing();
      this.current = 0;
      this.selection = [];
      this.commit(this.fitAll(deck));
      if (skipped) this.toast(skipped === 1 ? this.t.notImportedOne : say(this.t.notImported, { n: skipped }));
    } catch (error) {
      this.toast((error as Error).message);
    }
  }

  async exportPng(): Promise<void> {
    await this.images.ready([this.slide]);
    // Twice the size in pixels: sharp on any screen, and a slide made 1080 px wide comes out 2160.
    const canvas = slideCanvas(this.slide, this.deck.size, toUnit(this.deck.size.width, 'px') * 2, this.drawContext);
    canvas.toBlob((blob) => blob && download(blob, fileName(`${this.deck.title} ${this.current + 1}`, '.png')), 'image/png');
  }

  async exportPptx(): Promise<void> {
    await this.images.ready(this.deck.slides);
    // Pictures of kinds PowerPoint may not show go in as PNG.
    const png = (src: string) => {
      const image = this.images.get(src);
      if (!image) return undefined;
      const canvas = h('canvas', { width: image.naturalWidth, height: image.naturalHeight });
      canvas.getContext('2d')?.drawImage(image, 0, 0);
      const data = atob(canvas.toDataURL('image/png').split(',')[1]);
      return { bytes: Uint8Array.from(data, (c) => c.charCodeAt(0)), type: 'image/png' as const };
    };
    const bytes = exportPptx(this.deck, { image: png });
    download(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }), fileName(this.deck.title, '.pptx'));
  }

  async exportPdf(): Promise<void> {
    this.toast(this.t.preparingPdf);
    try {
      const pdf = await deckPdf(this.deck, { measurer: this.measurer, images: this.images, layoutOf: this.layoutOf });
      download(new Blob([pdf], { type: 'application/pdf' }), fileName(this.deck.title, '.pdf'));
    } catch (error) {
      this.toast(say(this.t.pdfFailed, { error: (error as Error).message }));
    }
  }

  private presenting = false;

  present(from = this.current): void {
    this.stopEditing();
    this.presenting = true;
    let index = from;
    const canvas = h('canvas');
    const count = h('div', { class: 'rs-present-count' });
    const screen = h('div', { class: 'rs-present', tabindex: 0 }, canvas, count);
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = this.deck.size;
      const scale = Math.min(window.innerWidth / width, window.innerHeight / height);
      canvas.width = Math.round(width * scale * dpr);
      canvas.height = Math.round(height * scale * dpr);
      canvas.style.width = `${width * scale}px`;
      canvas.style.height = `${height * scale}px`;
      drawSlide(canvas.getContext('2d')!, this.deck.slides[index], this.deck.size, scale * dpr, { ...this.drawContext });
      count.textContent = `${index + 1} / ${this.deck.slides.length}`;
    };
    const go = (step: number) => {
      index = Math.max(0, Math.min(this.deck.slides.length - 1, index + step));
      draw();
    };
    const end = () => {
      if (!this.presenting) return;
      this.presenting = false;
      window.removeEventListener('keydown', keys, true);
      window.removeEventListener('resize', draw);
      screen.remove();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      this.goTo(index);
    };
    const keys = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) go(1);
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) go(-1);
      else if (e.key === 'Home') go(-Infinity);
      else if (e.key === 'End') go(Infinity);
      else if (e.key === 'Escape') end();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    screen.addEventListener('click', (e) => go(e.clientX < window.innerWidth / 4 ? -1 : 1));
    screen.addEventListener('fullscreenchange', () => !document.fullscreenElement && end());
    window.addEventListener('keydown', keys, true);
    window.addEventListener('resize', draw);
    this.root.append(screen);
    screen.requestFullscreen?.().catch(() => {});
    this.images.ready(this.deck.slides).then(draw);
    draw();
    screen.focus();
  }

  toast(message: string): void {
    document.querySelector('.rs-toast')?.remove();
    const t = h('div', { class: 'rs-toast', role: 'status' }, message);
    this.root.append(t);
    setTimeout(() => t.remove(), 2600);
  }

  // —— Kept between visits ——

  private restore(): Deck | undefined {
    if (!this.storageKey) return undefined;
    try {
      const text = localStorage.getItem(this.storageKey);
      return text ? parseDeck(text) : undefined;
    } catch {
      return undefined;
    }
  }

  /** The deck kept, and told to whoever asked, once changes have stopped for a moment. */
  private scheduleSave(): void {
    if (!this.storageKey && !this.onChange) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      if (this.saved === this.deck) return;
      this.saved = this.deck;
      this.onChange?.(this.deck);
      if (!this.storageKey) return;
      try {
        localStorage.setItem(this.storageKey, serializeDeck(this.deck));
      } catch {
        // Too big for the browser to keep: the file is where it is kept whole.
      }
    }, 600);
  }
}

// —— Helpers ——

function textOffsetOf(e: TextElement, layout: Layout): number {
  return textOffset(e.verticalAlign, layout.page.height, e.height);
}

function rectOf(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** A picture file as a data: URL, made smaller first when it is far bigger than a slide shows. */
async function readImage(file: File): Promise<{ src: string; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const MAX = 2000;
    const big = Math.max(image.naturalWidth, image.naturalHeight);
    if (big > MAX || file.size > 1_500_000) {
      const k = Math.min(1, MAX / big);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * k);
      canvas.height = Math.round(image.naturalHeight * k);
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      return { src: canvas.toDataURL(type, 0.9), width: canvas.width, height: canvas.height };
    }
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    return { src, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function storedTheme(): 'light' | 'dark' | undefined {
  try {
    const theme = localStorage.getItem('reboslides:theme');
    return theme === 'light' || theme === 'dark' ? theme : undefined;
  } catch {
    return undefined;
  }
}
