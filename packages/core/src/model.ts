// What a deck is: slides of one size, each with a background and the elements
// placed on it, last on top. An element is a box anywhere on the slide, turned
// about its centre: text, a shape or a picture. The text of a box is a
// document of @rebodocs/core, the same paragraphs and runs a DOCX has, set to
// the width of the box by its engine. Every length is in points, from the top
// left corner of the slide; colours are hex RGB without '#'.

import { type Doc, type ParagraphProps, type RunProps, createDoc, createParagraph } from '@rebodocs/core';
import type { Unit } from './units';

/** 16:9 at the size PowerPoint gives it: 13.333 by 7.5 inches. */
export const DEFAULT_SIZE: SlideSize = { width: 960, height: 540 };

export interface SlideSize {
  width: number;
  height: number;
}

/** A flat colour, or a gradient from one to the other at `angle` degrees (0 is left to right, 90 top to bottom). */
export type Fill = { kind: 'solid'; color: string } | { kind: 'gradient'; from: string; to: string; angle: number };

interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise, about the centre of the box. */
  rotation: number;
  /** 0 is not seen, 1 hides what is under it. */
  opacity: number;
  /** A locked element is not picked from the slide: it is changed only from the list of layers. */
  locked?: boolean;
}

export type VerticalAlign = 'top' | 'middle' | 'bottom';

export interface TextElement extends Box {
  type: 'text';
  /** The paragraphs of the box, laid out across its width. Only `paragraphs` and `numbering` of it matter here. */
  doc: Doc;
  /** Where the text sits in a box taller than it. */
  verticalAlign: VerticalAlign;
  /** The box grows and shrinks with its text, as a text box of Canva does; off once its height is set by hand. */
  autoHeight: boolean;
}

export const SHAPE_KINDS = ['rect', 'roundRect', 'ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'arrow', 'heart', 'line'] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];

export interface ShapeElement extends Box {
  type: 'shape';
  shape: ShapeKind;
  /** Not drawn for a 'line'. */
  fill?: Fill;
  stroke?: string;
  strokeWidth: number;
}

export interface ImageElement extends Box {
  type: 'image';
  /** A data: URL, so that the deck is whole in its file. */
  src: string;
  /** How big the picture is itself, in pixels: what its box keeps the proportions of. */
  naturalWidth: number;
  naturalHeight: number;
  /** Rounds the corners of the picture, in points; a circle when it is half its side. */
  radius: number;
}

export type Element = TextElement | ShapeElement | ImageElement;

export interface Slide {
  id: string;
  background: Fill;
  elements: Element[];
  /** What the speaker says over it, shown to them alone. */
  notes?: string;
}

export interface Deck {
  title: string;
  size: SlideSize;
  slides: Slide[];
  /** The unit its lengths are shown in; `DEFAULT_UNIT` when not said. Every length is kept in points whatever it is. */
  unit?: Unit;
}

let counter = 0;

/** A name for a new slide or element, unique in the deck and in any other made in this session. */
export function newId(prefix = 'e'): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const solid = (color: string): Fill => ({ kind: 'solid', color });

export function createSlide(background: Fill = solid('FFFFFF'), elements: Element[] = []): Slide {
  return { id: newId('s'), background, elements };
}

export function createDeck(title = 'Presentación sin título', size: SlideSize = DEFAULT_SIZE): Deck {
  return { title, size, slides: [createSlide()] };
}

export interface TextOptions {
  run?: RunProps;
  paragraph?: ParagraphProps;
  verticalAlign?: VerticalAlign;
}

/** A box of text, one paragraph to each line of `text`, all in the same formatting; as tall as its text once laid out. */
export function createText(text: string, box: Pick<Box, 'x' | 'y' | 'width'> & Partial<Box>, options: TextOptions = {}): TextElement {
  const run: RunProps = { fontFamily: 'Inter', fontSize: 24, color: '1F2937', kern: 0, ...options.run };
  const paragraphs = text.split('\n').map((line) => createParagraph(line, run, { spacingAfter: 0, lineHeight: 1.15, ...options.paragraph }));
  return {
    id: newId(),
    type: 'text',
    height: run.fontSize! * 1.4,
    rotation: 0,
    opacity: 1,
    ...box,
    doc: createDoc(paragraphs, { width: box.width, height: 0, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 }),
    verticalAlign: options.verticalAlign ?? 'top',
    autoHeight: true,
  };
}

export function createShape(shape: ShapeKind, box: Pick<Box, 'x' | 'y' | 'width' | 'height'> & Partial<Box>, look: Partial<Pick<ShapeElement, 'fill' | 'stroke' | 'strokeWidth'>> = {}): ShapeElement {
  const line = shape === 'line';
  return {
    id: newId(),
    type: 'shape',
    rotation: 0,
    opacity: 1,
    ...box,
    shape,
    ...(line ? {} : { fill: solid('8B5CF6') }),
    ...(line ? { stroke: '1F2937' } : {}),
    strokeWidth: line ? 4 : 0,
    ...look,
  };
}

/** A picture placed in `box`, or, without one, centred on a slide of `size` and as large as fits half of it. */
export function createImage(src: string, naturalWidth: number, naturalHeight: number, size: SlideSize, box?: Partial<Box>): ImageElement {
  const scale = Math.min((size.width * 0.5) / naturalWidth, (size.height * 0.5) / naturalHeight, 1);
  const width = box?.width ?? naturalWidth * scale;
  const height = box?.height ?? naturalHeight * scale;
  return {
    id: newId(),
    type: 'image',
    x: (size.width - width) / 2,
    y: (size.height - height) / 2,
    rotation: 0,
    opacity: 1,
    ...box,
    width,
    height,
    src,
    naturalWidth,
    naturalHeight,
    radius: 0,
  };
}

/** The element, made anew with new names, to be put on a slide beside the one it is copied from. */
export function copyElement<E extends Element>(element: E, dx = 0, dy = 0): E {
  return { ...structuredClone(element), id: newId(), x: element.x + dx, y: element.y + dy, locked: false };
}

export function copySlide(slide: Slide): Slide {
  return { ...structuredClone(slide), id: newId('s'), elements: slide.elements.map((e) => copyElement(e)) };
}
