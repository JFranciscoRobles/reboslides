// The studio for whoever draws their own interface, in React: a provider that
// holds the deck, the element its slide is drawn in, and a hook that gives
// what to show and what to do. Nothing here has a look of its own: the slide
// is still moved, resized and typed in by hand, and the rest is the page's.
//
//   <SlidesProvider deck={deck} onChange={save}>
//     <MyToolbar />                       uses useSlides()
//     <SlidesSurface className="flex-1" />
//     <MyPages />                          SlideThumbnail for each slide
//   </SlidesProvider>

import type { CollabState, Peer, Session } from '@reboslides/collab/browser';
import {
  type Alignment,
  type Deck,
  type Element,
  type Fill,
  type Order,
  type ShapeKind,
  type Slide,
  createShape,
  createText,
  deleteSlide as deleteSlideOp,
  duplicateSlide as duplicateSlideOp,
  moveSlide as moveSlideOp,
  setBackground as setBackgroundOp,
  setTitle as setTitleOp,
} from '@reboslides/core';
import { Studio } from '@reboslides/editor';
import { type CSSProperties, type ReactNode, createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { type SlidesCollab, connect } from './collab';

export interface SlidesState {
  deck: Deck;
  /** The slide shown, and where it is in the deck. */
  current: number;
  slide: Slide;
  /** The ids picked on it, and the elements they are. */
  selection: string[];
  picked: Element[];
  /** Whether a text box is being typed in. */
  editing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  theme: 'light' | 'dark';
  /** Working with other people: how it goes, who else is in, and this person's colour. Nothing when the deck is not shared. */
  collab?: { state: CollabState; peers: Peer[]; color: string; name: string; pending: number };
}

export interface SlidesCommands {
  undo(): void;
  redo(): void;
  goTo(index: number): void;
  select(ids: string[]): void;
  /** A slide after the one shown, blank or the one given, and shown. */
  addSlide(slide?: Slide): void;
  duplicateSlide(id?: string): void;
  deleteSlide(id?: string): void;
  moveSlide(from: number, to: number): void;
  setBackground(fill: Fill, everySlide?: boolean): void;
  setTitle(title: string): void;
  /** A text box in the middle of the slide, picked. */
  addText(text: string, size?: number): void;
  addShape(kind: ShapeKind): void;
  addImages(files: File[]): Promise<void>;
  /** What is picked: taken away, copied, put in front or behind, lined up. */
  remove(): void;
  duplicate(): void;
  reorder(order: Order): void;
  align(how: Alignment): void;
  distribute(axis: 'x' | 'y'): void;
  /** Each picked element changed by `change`, as one step of history. */
  change(change: (element: Element) => Element): void;
  present(): void;
  exportPdf(): Promise<void>;
  exportPng(): Promise<void>;
  /** The deck as a .reboslides file the browser downloads, and one opened. */
  saveFile(): void;
  openFile(file: File): Promise<void>;
  setTheme(theme: 'light' | 'dark'): void;
}

export interface UseSlides {
  state: SlidesState;
  commands: SlidesCommands;
  /** The studio itself, once the surface is on the page: for what the hooks do not say. */
  studio: Studio | undefined;
}

export interface SlidesProviderProps {
  children?: ReactNode;
  /** The deck to start with; opened again when another is given. */
  deck?: Deck;
  /** Called with the deck once changes to it have stopped for a moment. */
  onChange?: (deck: Deck) => void;
  theme?: 'light' | 'dark';
  /** The language of what the studio says, and of the slides of the designs: 'es' or 'en'. The browser's when left out. */
  locale?: string;
  /** Works on the deck with other people, in a room of the collaboration server. */
  collab?: SlidesCollab;
}

interface Held {
  studio: Studio | undefined;
  session: Session | undefined;
  attach: (element: HTMLElement | null) => void;
  subscribe: (fn: () => void) => () => void;
  version: () => number;
}

const Context = createContext<Held | undefined>(undefined);

export function SlidesProvider(props: SlidesProviderProps) {
  const latest = useRef(props);
  latest.current = props;
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [studio, setStudio] = useState<Studio>();
  const [session, setSession] = useState<Session>();
  const listeners = useRef(new Set<() => void>());
  const version = useRef(0);
  const bump = useCallback(() => {
    version.current++;
    for (const fn of listeners.current) fn();
  }, []);

  useEffect(() => {
    if (!element) return;
    const { deck, theme, locale } = latest.current;
    const made = new Studio(element, { deck, theme, locale, chrome: false, embedded: true, storageKey: null, onChange: (d) => latest.current.onChange?.(d) });
    const off = made.on('state', bump);
    setStudio(made);
    bump();
    return () => {
      off();
      made.destroy();
      setStudio(undefined);
    };
  }, [element, props.deck, bump]);

  useEffect(() => {
    if (studio && props.theme) studio.setTheme(props.theme);
  }, [studio, props.theme]);

  const { url, room, name, ticket } = props.collab ?? {};
  useEffect(() => {
    if (!studio || !url || !room) return;
    const leave = connect(studio, { url, room, name, ticket }, (s) => {
      setSession(s);
      bump();
    });
    return () => {
      leave();
      setSession(undefined);
    };
  }, [studio, url, room, name, ticket, bump]);

  const held = useMemo<Held>(
    () => ({
      studio,
      session,
      attach: setElement,
      subscribe: (fn) => {
        listeners.current.add(fn);
        return () => listeners.current.delete(fn);
      },
      version: () => version.current,
    }),
    [studio, session],
  );
  return createElement(Context.Provider, { value: held }, props.children);
}

export interface SlidesSurfaceProps {
  className?: string;
  /** The element takes the size it is given: something must give it a height. */
  style?: CSSProperties;
}

/** Where the slide is drawn and edited: one in each provider. */
export function SlidesSurface(props: SlidesSurfaceProps) {
  const held = useContext(Context);
  if (!held) throw new Error('SlidesSurface goes inside a SlidesProvider.');
  return createElement('div', { ref: held.attach, className: props.className, style: { position: 'relative', minHeight: 0, ...props.style } });
}

function snapshot(studio: Studio, session: Session | undefined): SlidesState {
  return {
    deck: studio.deck,
    current: studio.current,
    slide: studio.slide,
    selection: studio.selection,
    picked: studio.picked,
    editing: !!studio.editing,
    canUndo: studio.canUndo,
    canRedo: studio.canRedo,
    theme: studio.root.dataset.theme === 'dark' ? 'dark' : 'light',
    collab: session && { state: session.state, peers: session.peers, color: session.color, name: session.name, pending: session.pending },
  };
}

const NO_DECK: Deck = { title: '', size: { width: 960, height: 540 }, slides: [{ id: '', background: { kind: 'solid', color: 'FFFFFF' }, elements: [] }] };
const EMPTY: SlidesState = { deck: NO_DECK, current: 0, slide: NO_DECK.slides[0], selection: [], picked: [], editing: false, canUndo: false, canRedo: false, theme: 'light' };

/** What to show and what to do, from inside a SlidesProvider. Before the surface is on the page, an empty deck and commands that do nothing. */
export function useSlides(): UseSlides {
  const held = useContext(Context);
  if (!held) throw new Error('useSlides goes inside a SlidesProvider.');
  const { studio, session } = held;
  const cache = useRef<{ version: number; state: SlidesState }>(undefined);
  const get = () => {
    const version = held.version();
    if (!studio) return EMPTY;
    if (cache.current?.version !== version) cache.current = { version, state: snapshot(studio, session) };
    return cache.current.state;
  };
  const state = useSyncExternalStore(held.subscribe, get, () => EMPTY);
  const commands = useMemo(() => commandsOf(studio), [studio]);
  return { state, commands, studio };
}

/** One value of the state, the component drawn again only when it changes: `useSlidesValue((s) => s.canUndo)`. */
export function useSlidesValue<T>(pick: (state: SlidesState) => T): T {
  return pick(useSlides().state);
}

function commandsOf(studio: Studio | undefined): SlidesCommands {
  const s = () => studio;
  const center = (width: number, height: number) => {
    const size = studio?.deck.size ?? NO_DECK.size;
    return { x: (size.width - width) / 2, y: (size.height - height) / 2, width, height };
  };
  const on = (id?: string) => id ?? studio?.slide.id ?? '';
  return {
    undo: () => s()?.undo(),
    redo: () => s()?.redo(),
    goTo: (index) => s()?.goTo(index),
    select: (ids) => s()?.select(ids),
    addSlide: (slide) => s()?.insertSlide(slide),
    duplicateSlide: (id) => studio && studio.commit(duplicateSlideOp(studio.deck, on(id))),
    deleteSlide: (id) => studio && studio.commit(deleteSlideOp(studio.deck, on(id))),
    moveSlide: (from, to) => studio && studio.commit(moveSlideOp(studio.deck, from, to)),
    setBackground: (fill, every) => {
      if (!studio) return;
      let deck = studio.deck;
      for (const slide of every ? deck.slides : [studio.slide]) deck = setBackgroundOp(deck, slide.id, fill);
      studio.commit(deck);
    },
    setTitle: (title) => studio && studio.commit(setTitleOp(studio.deck, title), 'title'),
    addText: (text, size = 32) => {
      if (!studio) return;
      const box = center(studio.deck.size.width * 0.6, size * 1.4);
      studio.addAndSelect([createText(text, box, { run: { fontSize: size } })]);
    },
    addShape: (kind) => studio?.addAndSelect([createShape(kind, center(160, kind === 'line' ? 0 : 160))]),
    addImages: async (files) => {
      await studio?.addImageFiles(files);
    },
    remove: () => s()?.remove(),
    duplicate: () => s()?.duplicate(),
    reorder: (order) => s()?.reorder(order),
    align: (how) => s()?.align(how),
    distribute: (axis) => s()?.distribute(axis),
    change: (change) => s()?.change(change),
    present: () => s()?.present(),
    exportPdf: async () => {
      await studio?.exportPdf();
    },
    exportPng: async () => {
      await studio?.exportPng();
    },
    saveFile: () => s()?.saveFile(),
    openFile: async (file) => {
      await studio?.openFile(file);
    },
    setTheme: (theme) => s()?.setTheme(theme),
  };
}
