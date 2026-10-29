// What an assistant can do to a deck, as tools: each has a name, a
// description, the shape of its arguments, and a function that reads the deck
// or makes a new one and says what it did. They use nothing of Node or the
// browser: the server runs them on files, and a page could run them on the
// deck open in its studio.
//
// Slides go by their number, from 1, or their id; elements by their id, as
// read_slide gives them. Lengths are points from the top left corner of the
// slide; colours hex, as "2563EB".

import {
  type Alignment,
  type Deck,
  type Element,
  type Fill,
  LAYOUTS,
  type LayoutKind,
  type Order,
  SHAPE_KINDS,
  type ShapeKind,
  type Slide,
  type TextElement,
  THEMES,
  addElements,
  addSlide,
  alignElements,
  createShape,
  createText,
  deleteSlide,
  distributeElements,
  duplicateSlide,
  formatAllText,
  layoutSlide,
  leadingRun,
  moveSlide,
  patchElements,
  plainTextOf,
  removeElements,
  reorderElements,
  setBackground,
  setNotes,
  setTitle,
  updateElements,
} from '@reboslides/core';

export type Args = Record<string, unknown>;

export interface Tool {
  name: string;
  title: string;
  description: string;
  properties: Record<string, unknown>;
  required?: string[];
  /** Whether it changes the deck. */
  writes: boolean;
  /** What it says, and the deck it made when it changed it. */
  run(deck: Deck, args: Args): { text: string; deck?: Deck };
}

/** What the assistant asked wrong: said to it as the result, for it to put right. */
export class ToolError extends Error {}

export const fail = (message: string): never => {
  throw new ToolError(message);
};

const SLIDE = { type: ['integer', 'string'], description: 'The slide: its number, from 1, or its id. Left out, the first.' };
const ELEMENT = { type: 'string', description: 'The id of an element, as read_slide gives it.' };
const ELEMENTS = { type: 'array', items: { type: 'string' }, description: 'The ids of elements of the slide, as read_slide gives them.' };
const COLOR = (what: string) => ({ type: 'string', description: `${what}: a hex colour, as "2563EB".` });
const BOX = {
  x: { type: 'number', description: 'Points from the left edge of the slide.' },
  y: { type: 'number', description: 'Points from the top edge of the slide.' },
  width: { type: 'number', description: 'Points.' },
  height: { type: 'number', description: 'Points.' },
};

const round = (n: number) => Math.round(n * 10) / 10;

function slideOf(deck: Deck, given: unknown): Slide {
  if (given === undefined || given === null || given === '') return deck.slides[0];
  if (typeof given === 'number' || /^\d+$/.test(String(given))) {
    const n = Number(given);
    return deck.slides[n - 1] ?? fail(`There is no slide ${n}: the deck has ${deck.slides.length}.`);
  }
  return deck.slides.find((slide) => slide.id === given) ?? fail(`There is no slide with the id "${given}".`);
}

function elementOf(slide: Slide, given: unknown): Element {
  if (typeof given !== 'string') return fail('"element" must be the id of an element.');
  return slide.elements.find((element) => element.id === given) ?? fail(`Slide ${slide.id} has no element "${given}". read_slide lists them.`);
}

function idsOf(slide: Slide, given: unknown): string[] {
  if (!Array.isArray(given) || !given.length) return fail('"elements" must be a list of ids of elements.');
  return given.map((id) => elementOf(slide, id).id);
}

function colorArg(value: unknown, key: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const hex = String(value).replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(hex)) fail(`"${key}" must be a hex colour, as "2563EB".`);
  return hex;
}

function numberArg(args: Args, key: string): number | undefined {
  const v = args[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`"${key}" must be a number.`);
  return v as number;
}

function fillArg(args: Args): Fill | undefined {
  const color = colorArg(args.color, 'color');
  const from = colorArg(args.from, 'from');
  const to = colorArg(args.to, 'to');
  if (from && to) return { kind: 'gradient', from, to, angle: numberArg(args, 'angle') ?? 135 };
  return color ? { kind: 'solid', color } : undefined;
}

const fillText = (fill?: Fill) => (!fill ? 'none' : fill.kind === 'solid' ? fill.color : `gradient ${fill.from} → ${fill.to} at ${fill.angle}°`);

/** An element in a line: what it is, where, and what it says or looks like. */
function describe(element: Element): string {
  const where = `at ${round(element.x)},${round(element.y)} size ${round(element.width)}×${round(element.height)}${element.rotation ? ` turned ${round(element.rotation)}°` : ''}${element.opacity < 1 ? ` opacity ${element.opacity}` : ''}${element.locked ? ' locked' : ''}`;
  if (element.type === 'text') {
    const run = leadingRun(element);
    const look = [run?.fontFamily, run?.fontSize && `${run.fontSize}pt`, run?.bold && 'bold', run?.color && `#${run.color}`].filter(Boolean).join(' ');
    return `${element.id} text ${where} [${look}]: ${JSON.stringify(plainTextOf(element))}`;
  }
  if (element.type === 'shape') return `${element.id} shape ${element.shape} ${where} fill ${fillText(element.fill)}${element.stroke ? ` stroke #${element.stroke} ${element.strokeWidth}pt` : ''}`;
  return `${element.id} image ${where} ${element.naturalWidth}×${element.naturalHeight}px${element.radius ? ` corners ${element.radius}pt` : ''}`;
}

/** The deck changed by a tool, and what it says it did. */
const did = (deck: Deck, text: string) => ({ deck, text });

export const TOOLS: Tool[] = [
  {
    name: 'get_overview',
    title: 'Overview of the deck',
    description: 'The title and size of the deck, and each slide in a line: its number, id, background, and what its texts say.',
    properties: {},
    writes: false,
    run: (deck) => ({
      text: [
        `"${deck.title}", ${deck.slides.length} slide(s) of ${deck.size.width}×${deck.size.height} points.`,
        ...deck.slides.map((slide, i) => {
          const texts = slide.elements.filter((e): e is TextElement => e.type === 'text').map((e) => plainTextOf(e).replace(/\s+/g, ' ').slice(0, 80));
          const others = slide.elements.length - texts.length;
          return `${i + 1}. ${slide.id} · background ${fillText(slide.background)} · ${texts.length ? texts.map((t) => JSON.stringify(t)).join(', ') : 'no text'}${others ? ` · ${others} shape(s) or picture(s)` : ''}${slide.notes ? ' · has notes' : ''}`;
        }),
        `Themes for add_slide: ${THEMES.map((t) => t.id).join(', ')}. Layouts: ${LAYOUTS.join(', ')}.`,
      ].join('\n'),
    }),
  },
  {
    name: 'read_slide',
    title: 'Read a slide',
    description: 'Every element of a slide, from the bottom one to the top one: its id, kind, where it is, its size, and its text or its look. The ids are what the other tools take.',
    properties: { slide: SLIDE },
    writes: false,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      const n = deck.slides.indexOf(slide) + 1;
      return {
        text: [
          `Slide ${n} (${slide.id}), background ${fillText(slide.background)}, ${slide.elements.length} element(s):`,
          ...slide.elements.map(describe),
          ...(slide.notes ? [`Notes: ${slide.notes}`] : []),
        ].join('\n'),
      };
    },
  },
  {
    name: 'find_text',
    title: 'Find text',
    description: 'The text boxes whose words have what is looked for, in every slide, without minding capitals.',
    properties: { query: { type: 'string', description: 'What to look for.' } },
    required: ['query'],
    writes: false,
    run: (deck, args) => {
      const query = String(args.query ?? '').toLowerCase();
      if (!query) fail('"query" must say what to look for.');
      const found = deck.slides.flatMap((slide, i) =>
        slide.elements.filter((e): e is TextElement => e.type === 'text' && plainTextOf(e).toLowerCase().includes(query)).map((e) => `slide ${i + 1} ${describe(e)}`),
      );
      return { text: found.length ? found.join('\n') : `No text has "${args.query}".` };
    },
  },
  {
    name: 'set_title',
    title: 'Name the deck',
    description: 'Sets the title of the deck: the name of its file and of the PDF.',
    properties: { title: { type: 'string', description: 'The new title.' } },
    required: ['title'],
    writes: true,
    run: (deck, args) => did(setTitle(deck, String(args.title ?? '').trim() || fail('"title" must not be empty.')), `The deck is now "${args.title}".`),
  },
  {
    name: 'add_slide',
    title: 'Add a slide',
    description: `Adds a slide, blank or made from a layout of a theme with its texts to replace (read_slide gives their ids, set_text changes them). Layouts: ${LAYOUTS.join(', ')}.`,
    properties: {
      at: { type: 'integer', description: 'Its number once added, from 1. At the end when left out.' },
      layout: { type: 'string', enum: [...LAYOUTS], description: 'A layout. Blank when left out.' },
      theme: { type: 'string', enum: THEMES.map((t) => t.id), description: 'The theme of the layout. "minimal" when left out.' },
    },
    writes: true,
    run: (deck, args) => {
      const at = args.at === undefined ? deck.slides.length : Math.max(0, Math.min(deck.slides.length, Number(args.at) - 1));
      let slide: Slide | undefined;
      if (args.layout !== undefined) {
        if (!LAYOUTS.includes(args.layout as LayoutKind)) fail(`"layout" must be one of: ${LAYOUTS.join(', ')}.`);
        const theme = THEMES.find((t) => t.id === (args.theme ?? 'minimal')) ?? fail(`"theme" must be one of: ${THEMES.map((t) => t.id).join(', ')}.`);
        slide = layoutSlide(theme, args.layout as LayoutKind, deck.size);
      }
      const next = addSlide(deck, at, slide);
      const made = next.slides[at];
      return did(next, `Added slide ${at + 1} (${made.id}).${made.elements.length ? `\n${made.elements.map(describe).join('\n')}` : ''}`);
    },
  },
  {
    name: 'duplicate_slide',
    title: 'Duplicate a slide',
    description: 'Puts a copy of a slide right after it.',
    properties: { slide: SLIDE },
    writes: true,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      const next = duplicateSlide(deck, slide.id);
      const at = deck.slides.indexOf(slide) + 1;
      return did(next, `Copied it as slide ${at + 1} (${next.slides[at].id}).`);
    },
  },
  {
    name: 'delete_slide',
    title: 'Delete a slide',
    description: 'Takes a slide out of the deck. A deck keeps one slide at least.',
    properties: { slide: SLIDE },
    writes: true,
    run: (deck, args) => {
      if (deck.slides.length < 2) fail('It is the only slide: a deck keeps one at least.');
      const slide = slideOf(deck, args.slide);
      return did(deleteSlide(deck, slide.id), `Deleted slide ${deck.slides.indexOf(slide) + 1}.`);
    },
  },
  {
    name: 'move_slide',
    title: 'Move a slide',
    description: 'Moves a slide to another place in the deck.',
    properties: { slide: SLIDE, to: { type: 'integer', description: 'Its number once moved, from 1.' } },
    required: ['slide', 'to'],
    writes: true,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      const to = Math.max(0, Math.min(deck.slides.length - 1, Number(args.to) - 1));
      return did(moveSlide(deck, deck.slides.indexOf(slide), to), `Slide ${slide.id} is now number ${to + 1}.`);
    },
  },
  {
    name: 'set_background',
    title: 'Set a background',
    description: 'Gives a slide, or every slide, a flat colour or a gradient from one colour to another.',
    properties: {
      slide: SLIDE,
      every_slide: { type: 'boolean', description: 'All the slides, not one.' },
      color: COLOR('A flat colour'),
      from: COLOR('Where a gradient starts'),
      to: COLOR('Where it ends'),
      angle: { type: 'number', description: 'Of the gradient, in degrees: 0 left to right, 90 top to bottom. 135 when left out.' },
    },
    writes: true,
    run: (deck, args) => {
      const fill = fillArg(args) ?? fail('Give "color", or "from" and "to" for a gradient.');
      const slides = args.every_slide ? deck.slides : [slideOf(deck, args.slide)];
      const next = slides.reduce((d, slide) => setBackground(d, slide.id, fill), deck);
      return did(next, `Background ${fillText(fill)} on ${args.every_slide ? 'every slide' : `slide ${deck.slides.indexOf(slides[0]) + 1}`}.`);
    },
  },
  {
    name: 'set_notes',
    title: 'Write the notes of a slide',
    description: 'What the speaker says over a slide, shown to them alone when presenting.',
    properties: { slide: SLIDE, notes: { type: 'string', description: 'The notes; empty to take them away.' } },
    required: ['notes'],
    writes: true,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      return did(setNotes(deck, slide.id, String(args.notes ?? '')), 'Notes written.');
    },
  },
  {
    name: 'add_text',
    title: 'Add a text box',
    description: 'Puts a box of text on a slide. A line break in the text starts a new paragraph. The box grows with its text.',
    properties: {
      slide: SLIDE,
      text: { type: 'string', description: 'What it says.' },
      ...BOX,
      font_size: { type: 'number', description: 'In points. 24 when left out.' },
      font: { type: 'string', description: 'The font: Inter, Playfair Display, Space Grotesk, Montserrat, Bebas Neue… Inter when left out.' },
      color: COLOR('The colour of the text'),
      bold: { type: 'boolean' },
      italic: { type: 'boolean' },
      align: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
    },
    required: ['text', 'x', 'y', 'width'],
    writes: true,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      const fontSize = numberArg(args, 'font_size') ?? 24;
      const lines = String(args.text ?? '').split('\n').length;
      const box = { x: numberArg(args, 'x') ?? 0, y: numberArg(args, 'y') ?? 0, width: numberArg(args, 'width') ?? 300, height: numberArg(args, 'height') ?? Math.ceil(fontSize * 1.2 * lines) };
      const run = {
        fontSize,
        ...(typeof args.font === 'string' && args.font ? { fontFamily: args.font } : {}),
        ...(colorArg(args.color, 'color') ? { color: colorArg(args.color, 'color') } : {}),
        ...(args.bold ? { bold: true } : {}),
        ...(args.italic ? { italic: true } : {}),
      };
      const align = args.align as 'left' | 'center' | 'right' | 'justify' | undefined;
      const element = createText(String(args.text ?? ''), box, { run, ...(align ? { paragraph: { align } } : {}) });
      return did(addElements(deck, slide.id, [element]), `Added ${describe(element)}`);
    },
  },
  {
    name: 'add_shape',
    title: 'Add a shape',
    description: `Puts a shape on a slide: ${SHAPE_KINDS.join(', ')}.`,
    properties: {
      slide: SLIDE,
      shape: { type: 'string', enum: [...SHAPE_KINDS] },
      ...BOX,
      color: COLOR('Its fill'),
      from: COLOR('Where a gradient fill starts'),
      to: COLOR('Where it ends'),
      angle: { type: 'number' },
      stroke: COLOR('Its outline'),
      stroke_width: { type: 'number', description: 'Of the outline, in points.' },
    },
    required: ['shape', 'x', 'y', 'width', 'height'],
    writes: true,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      if (!SHAPE_KINDS.includes(args.shape as ShapeKind)) fail(`"shape" must be one of: ${SHAPE_KINDS.join(', ')}.`);
      const fill = fillArg(args);
      const stroke = colorArg(args.stroke, 'stroke');
      const element = createShape(
        args.shape as ShapeKind,
        { x: numberArg(args, 'x') ?? 0, y: numberArg(args, 'y') ?? 0, width: numberArg(args, 'width') ?? 100, height: numberArg(args, 'height') ?? 100 },
        { ...(fill ? { fill } : {}), ...(stroke ? { stroke } : {}), ...(numberArg(args, 'stroke_width') !== undefined ? { strokeWidth: numberArg(args, 'stroke_width') } : {}) },
      );
      return did(addElements(deck, slide.id, [element]), `Added ${describe(element)}`);
    },
  },
  {
    name: 'set_text',
    title: 'Change the text of a box',
    description: 'Writes new text in a text box, in the look of its first letters. A line break starts a new paragraph.',
    properties: { slide: SLIDE, element: ELEMENT, text: { type: 'string', description: 'What it says now.' } },
    required: ['element', 'text'],
    writes: true,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      const old = elementOf(slide, args.element);
      if (old.type !== 'text') fail(`"${old.id}" is a ${old.type}, not text.`);
      const was = old as TextElement;
      const paragraph = was.doc.paragraphs[0]?.props;
      const fresh = createText(String(args.text ?? ''), was, { run: leadingRun(was) ?? {}, ...(paragraph ? { paragraph } : {}) });
      const next = updateElements(deck, slide.id, [was.id], () => ({ ...was, doc: fresh.doc }));
      return did(next, `Now ${describe(elementOf(slideOf(next, slide.id), was.id))}`);
    },
  },
  {
    name: 'format_text',
    title: 'Format the text of boxes',
    description: 'Changes the look of all the text of text boxes: font, size, colour, bold, italic, alignment.',
    properties: {
      slide: SLIDE,
      elements: ELEMENTS,
      font: { type: 'string' },
      font_size: { type: 'number' },
      color: COLOR('The colour of the text'),
      bold: { type: 'boolean' },
      italic: { type: 'boolean' },
      align: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
    },
    required: ['elements'],
    writes: true,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      const ids = idsOf(slide, args.elements);
      const run = {
        ...(typeof args.font === 'string' && args.font ? { fontFamily: args.font } : {}),
        ...(numberArg(args, 'font_size') ? { fontSize: numberArg(args, 'font_size') } : {}),
        ...(colorArg(args.color, 'color') ? { color: colorArg(args.color, 'color') } : {}),
        ...(typeof args.bold === 'boolean' ? { bold: args.bold } : {}),
        ...(typeof args.italic === 'boolean' ? { italic: args.italic } : {}),
      };
      const align = args.align as 'left' | 'center' | 'right' | 'justify' | undefined;
      const next = updateElements(deck, slide.id, ids, (e) => (e.type === 'text' ? formatAllText(e, run, align ? { align } : undefined) : e));
      return did(next, `Formatted ${ids.length} box(es).`);
    },
  },
  {
    name: 'update_element',
    title: 'Move, size or restyle an element',
    description: 'Changes where an element is, its size, turn and opacity; and for a shape its fill and outline. Only what is given changes.',
    properties: {
      slide: SLIDE,
      element: ELEMENT,
      ...BOX,
      rotation: { type: 'number', description: 'Degrees, clockwise.' },
      opacity: { type: 'number', description: 'From 0, not seen, to 1.' },
      color: COLOR('A shape’s fill'),
      from: COLOR('Where a gradient fill starts'),
      to: COLOR('Where it ends'),
      angle: { type: 'number' },
      stroke: COLOR('A shape’s outline'),
      stroke_width: { type: 'number' },
      locked: { type: 'boolean', description: 'Locked elements are not picked by hand on the slide.' },
    },
    required: ['element'],
    writes: true,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      const element = elementOf(slide, args.element);
      const patch: Record<string, unknown> = {};
      for (const key of ['x', 'y', 'width', 'height', 'rotation', 'opacity'] as const) if (numberArg(args, key) !== undefined) patch[key] = numberArg(args, key);
      if (typeof args.locked === 'boolean') patch.locked = args.locked;
      if (patch.opacity !== undefined) patch.opacity = Math.max(0, Math.min(1, patch.opacity as number));
      if (element.type === 'shape') {
        const fill = fillArg(args);
        if (fill) patch.fill = fill;
        if (colorArg(args.stroke, 'stroke')) patch.stroke = colorArg(args.stroke, 'stroke');
        if (numberArg(args, 'stroke_width') !== undefined) patch.strokeWidth = numberArg(args, 'stroke_width');
      }
      if (element.type === 'text' && patch.height !== undefined) patch.autoHeight = false;
      const next = patchElements(deck, slide.id, [element.id], patch as Partial<Element>);
      return did(next, `Now ${describe(elementOf(slideOf(next, slide.id), element.id))}`);
    },
  },
  {
    name: 'remove_elements',
    title: 'Remove elements',
    description: 'Takes elements off a slide.',
    properties: { slide: SLIDE, elements: ELEMENTS },
    required: ['elements'],
    writes: true,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      const ids = idsOf(slide, args.elements);
      return did(removeElements(deck, slide.id, ids), `Removed ${ids.length} element(s).`);
    },
  },
  {
    name: 'arrange',
    title: 'Bring forward or send back',
    description: 'Changes which elements are on top: to the front, one forward, one backward, or to the back.',
    properties: { slide: SLIDE, elements: ELEMENTS, order: { type: 'string', enum: ['front', 'forward', 'backward', 'back'] } },
    required: ['elements', 'order'],
    writes: true,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      if (!['front', 'forward', 'backward', 'back'].includes(String(args.order))) fail('"order" must be front, forward, backward or back.');
      return did(reorderElements(deck, slide.id, idsOf(slide, args.elements), args.order as Order), 'Done.');
    },
  },
  {
    name: 'align',
    title: 'Line up elements',
    description: 'Lines elements up by an edge or their centres: with each other when there are several, with the slide when there is one. Or spaces three or more out evenly.',
    properties: {
      slide: SLIDE,
      elements: ELEMENTS,
      how: { type: 'string', enum: ['left', 'center', 'right', 'top', 'middle', 'bottom', 'distribute-x', 'distribute-y'] },
    },
    required: ['elements', 'how'],
    writes: true,
    run: (deck, args) => {
      const slide = slideOf(deck, args.slide);
      const ids = idsOf(slide, args.elements);
      const how = String(args.how);
      if (how === 'distribute-x' || how === 'distribute-y') return did(distributeElements(deck, slide.id, ids, how === 'distribute-x' ? 'x' : 'y'), 'Spaced out.');
      if (!['left', 'center', 'right', 'top', 'middle', 'bottom'].includes(how)) fail('"how" must be left, center, right, top, middle, bottom, distribute-x or distribute-y.');
      return did(alignElements(deck, slide.id, ids, how as Alignment), 'Lined up.');
    },
  },
];

export const findTool = (name: string) => TOOLS.find((tool) => tool.name === name);
