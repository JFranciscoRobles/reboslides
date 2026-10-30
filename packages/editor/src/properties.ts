// The panel of properties beside the slide, as design apps have it: what is
// picked, in sections. Where it is and how big (of several, of the box that
// holds them), how it lines up and stacks, how transparent it is; then what
// its kind has: text its font, size, colour, style, alignment and lists, a
// shape its kind, fill and outline, a picture its corners. With nothing
// picked, the slide: its background.

import {
  type Element,
  SHAPE_KINDS,
  type ShapeKind,
  type TextElement,
  boundsOf,
  formatAllText,
  leadingRun,
  patchElements,
  resizeGroup,
  SIZE_PRESETS,
  UNITS,
  UNIT_PRECISION,
  formatLength,
  fromUnit,
  presetOf,
  presetSize,
  toUnit,
  setBackground,
  solid,
  unionOf,
  updateElements,
} from '@reboslides/core';
import { fromInput, h, toInput } from './dom';
import { type ListKind, type ParagraphProps, type ResolvedRunProps, type RunProps, applyRunProps, comparePositions, listKindAt, propsAt, resolveRun, setParagraphProps, toggleList } from './engine';
import { FONTS } from './fonts';
import { say } from './i18n';
import { ICONS } from './icons';
import { cssFill } from './render';
import type { Studio } from './studio';

let builtFor = '';
/** Set by a change that moves other fields of the panel with it: the panel is made again even while one of its fields has the focus. */
let rebuild = false;

/** Whatever `act` changes shows in every field of the panel: a width typed changes the height beside it. */
function fromMeasure(act: () => void): void {
  rebuild = true;
  act();
}

/** The text elements the panel changes: the one being edited, or every one picked. */
function textTargets(studio: Studio): TextElement[] {
  const editing = studio.editingElement;
  return editing ? [editing] : studio.picked.filter((e): e is TextElement => e.type === 'text');
}

export const textActions = {
  /** The formatting the panel shows: at the caret, or of the first letter of the first box picked. */
  run(studio: Studio): ResolvedRunProps | undefined {
    const editing = studio.editingElement;
    const range = studio.textRange;
    if (editing && range) return resolveRun(propsAt(editing.doc, range.from));
    const first = textTargets(studio)[0];
    return first && leadingRun(first);
  },

  paragraph(studio: Studio): ParagraphProps | undefined {
    const editing = studio.editingElement;
    const range = studio.textRange;
    if (editing && range) return editing.doc.paragraphs[range.from.para].props;
    return textTargets(studio)[0]?.doc.paragraphs[0].props;
  },

  /** `patch` given to the text picked, or to all the text of the boxes when none of it is. */
  applyRun(studio: Studio, patch: RunProps, merge?: string): void {
    const range = studio.textRange;
    const ids = textTargets(studio).map((e) => e.id);
    studio.change(
      (e) => {
        if (e.type !== 'text') return e;
        if (range && comparePositions(range.from, range.to)) return { ...e, doc: applyRunProps(e.doc, range, patch) };
        return formatAllText(e, patch);
      },
      merge,
      ids,
    );
  },

  /** `patch` given to the paragraphs the selection is in, or to all of them. */
  applyParagraph(studio: Studio, patch: ParagraphProps): void {
    const range = studio.textRange;
    studio.change(
      (e) => (e.type !== 'text' ? e : range ? { ...e, doc: setParagraphProps(e.doc, range.from.para, range.to.para, patch) } : formatAllText(e, {}, patch)),
      undefined,
      textTargets(studio).map((e) => e.id),
    );
  },

  toggle(studio: Studio, prop: 'bold' | 'italic' | 'underline' | 'strike'): void {
    const run = textActions.run(studio);
    if (run) textActions.applyRun(studio, { [prop]: !run[prop] });
  },

  list(studio: Studio, kind: ListKind): void {
    const range = studio.textRange;
    studio.change(
      (e) => {
        if (e.type !== 'text') return e;
        const from = range?.from.para ?? 0;
        const to = range?.to.para ?? e.doc.paragraphs.length - 1;
        return { ...e, doc: toggleList(e.doc, from, to, kind) };
      },
      undefined,
      textTargets(studio).map((e) => e.id),
    );
  },
};

/** Whatever `act` changes comes from the panel: the panel is left as it is, its fields still in use. */
function fromPanel(studio: Studio, act: () => void): void {
  studio.fromContext = true;
  act();
}

// —— Controls ——

const round = (v: number) => Math.round(v * 10) / 10;

function section(title: string, ...content: (Node | false | undefined)[]): HTMLElement {
  return h('section', { class: 'sp-section' }, h('h3', { class: 'sp-section-title' }, title), ...content);
}

function field(label: string, control: Node, wide = false): HTMLElement {
  return h('label', { class: `sp-field${wide ? ' sp-wide' : ''}` }, h('span', { class: 'sp-field-label' }, label), control);
}

function numberField(
  label: string,
  value: number | undefined,
  unit: string,
  onCommit: (v: number) => void,
  options: { min?: number; max?: number; step?: number; disabled?: boolean } = {},
): HTMLElement {
  const input = h('input', {
    type: 'number',
    class: 'sp-textfield',
    value: value === undefined ? '' : round(value),
    placeholder: value === undefined ? '—' : '',
    step: options.step ?? 1,
    min: options.min,
    max: options.max,
    disabled: options.disabled,
    'aria-label': label,
  });
  input.addEventListener('change', () => {
    const v = Number(input.value);
    if (input.value !== '' && Number.isFinite(v)) onCommit(v);
  });
  return field(label, h('span', { class: 'sp-textfield-wrap' }, input, unit ? h('span', { class: 'sp-unit' }, unit) : ''));
}

function picker<T extends string | number>(label: string, value: T, options: [T, string][], onChange: (v: T) => void, styleOf?: (v: T) => string): HTMLElement {
  const select = h('select', { class: 'sp-picker', 'aria-label': label });
  for (const [v, text] of options) select.append(h('option', { value: String(v), selected: v === value, style: styleOf?.(v) }, text));
  select.addEventListener('change', () => onChange((typeof value === 'number' ? Number(select.value) : select.value) as T));
  return field(label, select, true);
}

function actionButton(icon: string, label: string, act: () => void, selected = false, disabled = false): HTMLButtonElement {
  const b = h('button', {
    type: 'button',
    class: `sp-action-button${selected ? ' sp-selected' : ''}`,
    title: label,
    'aria-label': label,
    'aria-pressed': selected ? 'true' : undefined,
    disabled,
    onclick: () => act(),
  });
  b.innerHTML = icon;
  return b;
}

const actionGroup = (...buttons: HTMLElement[]) => h('div', { class: 'sp-action-group', role: 'group' }, ...buttons);

/** A swatch that opens the colour picker of the system, beside its hex value to type. */
function colorField(label: string, color: string, onInput: (color: string) => void): HTMLElement {
  const swatch = h('span', { class: 'sp-swatch', style: `background:#${color}` });
  const native = h('input', { type: 'color', value: toInput(color), 'aria-label': label });
  const hex = h('input', { type: 'text', class: 'sp-textfield sp-hex', value: color, maxlength: 7, spellcheck: false, 'aria-label': `${label} (hex)` });
  native.addEventListener('input', () => {
    const c = fromInput(native.value);
    swatch.style.background = native.value;
    hex.value = c;
    onInput(c);
  });
  hex.addEventListener('change', () => {
    const c = hex.value.replace('#', '').toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(c)) return void (hex.value = color);
    swatch.style.background = `#${c}`;
    native.value = toInput(c);
    onInput(c);
  });
  return field(label, h('span', { class: 'sp-color-field' }, h('label', { class: 'sp-swatch-button', title: label }, swatch, native), hex), true);
}

function slider(label: string, value: number, unit: string, onInput: (v: number) => void, min = 0, max = 100): HTMLElement {
  const out = h('span', { class: 'sp-slider-value' }, `${Math.round(value)}${unit}`);
  const range = h('input', { type: 'range', class: 'sp-slider', min, max, value: Math.round(value), 'aria-label': label });
  range.style.setProperty('--fill', `${((value - min) / (max - min)) * 100}%`);
  range.addEventListener('input', () => {
    out.textContent = `${range.value}${unit}`;
    range.style.setProperty('--fill', `${((Number(range.value) - min) / (max - min)) * 100}%`);
    onInput(Number(range.value));
  });
  return h('div', { class: 'sp-slider-field' }, h('div', { class: 'sp-slider-label' }, h('span', {}, label), out), range);
}

// —— Sections ——

/** A length kept in points, shown and typed in the unit of the deck. */
function lengthField(studio: Studio, label: string, points: number | undefined, onCommit: (points: number) => void, options: { min?: number; disabled?: boolean } = {}): HTMLElement {
  const unit = studio.unit;
  const { decimals, step } = UNIT_PRECISION[unit];
  const shown = points === undefined ? undefined : Number(toUnit(points, unit).toFixed(decimals));
  const field = numberField(label, shown, unit, (v) => onCommit(fromUnit(v, unit)), { step, disabled: options.disabled, min: options.min === undefined ? undefined : toUnit(options.min, unit) });
  // Shown with the places its unit is read with, not rounded to a tenth.
  const input = field.querySelector('input')!;
  if (shown !== undefined) input.value = String(shown);
  return field;
}

function transformSection(studio: Studio): HTMLElement {
  const { t } = studio;
  const picked = studio.picked;
  const single = picked.length === 1 ? picked[0] : undefined;
  const box = single ?? { ...unionOf(picked.map(boundsOf)), rotation: 0 };
  const slideId = studio.slide.id;
  const ids = studio.selection;
  const line = single?.type === 'shape' && single.shape === 'line';
  const keep = studio.keepRatio && !line;
  const commit = (next: typeof studio.deck, merge: string) => fromMeasure(() => studio.commit(next, merge));
  const move = (dx: number, dy: number) =>
    commit(
      updateElements(studio.deck, slideId, ids, (e) => (e.locked ? e : { ...e, x: e.x + dx, y: e.y + dy })),
      'move-field',
    );
  /** The box given a width or a height: the other follows it when the proportions are kept, and so does the size of its text. */
  const resize = (side: 'width' | 'height', value: number) => {
    const v = Math.max(1, value);
    const k = v / box[side];
    const width = side === 'width' ? v : keep ? box.width * k : box.width;
    const height = side === 'height' ? v : keep ? box.height * k : box.height;
    if (!single) return commit(resizeGroup(studio.deck, slideId, ids, box, { ...box, width, height }), 'size-field');
    // Kept from its top left corner, as the fields say where it is.
    if (keep) return commit(resizeGroup(studio.deck, slideId, ids, single, { x: single.x, y: single.y, width, height }), 'size-field');
    const patch: Partial<Element> = { width, height };
    // A box of text given a height by hand keeps it.
    if (single.type === 'text' && side === 'height') (patch as Partial<TextElement>).autoHeight = false;
    commit(patchElements(studio.deck, slideId, ids, patch), 'size-field');
  };
  const lock = actionButton(keep ? ICONS.link : ICONS.unlink, keep ? t.ratioLocked : t.ratioFree, () => fromMeasure(() => studio.setKeepRatio(!studio.keepRatio)), keep, line);
  lock.classList.add('sp-ratio');
  return section(
    t.transform,
    h(
      'div',
      { class: 'sp-grid' },
      lengthField(studio, 'X', box.x, (v) => move(v - box.x, 0)),
      lengthField(studio, 'Y', box.y, (v) => move(0, v - box.y)),
    ),
    h(
      'div',
      { class: 'sp-size-row' },
      lengthField(studio, t.width, box.width, (v) => resize('width', v), { min: 1 }),
      lock,
      lengthField(studio, t.height, box.height, (v) => resize('height', v), { min: 1, disabled: line }),
    ),
    h(
      'div',
      { class: 'sp-grid' },
      numberField(t.rotation, single?.rotation, '°', (v) => commit(patchElements(studio.deck, slideId, ids, { rotation: ((((v + 180) % 360) + 360) % 360) - 180 }), 'rotation-field'), {
        disabled: !single,
      }),
    ),
  );
}

function arrangeSection(studio: Studio): HTMLElement {
  const { t } = studio;
  const several = studio.picked.length > 1;
  return section(
    t.arrange,
    h('p', { class: 'sp-help' }, several ? t.amongPicked : t.toSlide),
    actionGroup(
      actionButton(ICONS.alignLeftEdge, t.alignLeft, () => studio.align('left')),
      actionButton(ICONS.alignCenterH, t.centerH, () => studio.align('center')),
      actionButton(ICONS.alignRightEdge, t.alignRight, () => studio.align('right')),
      actionButton(ICONS.alignTopEdge, t.alignTop, () => studio.align('top')),
      actionButton(ICONS.alignCenterV, t.centerV, () => studio.align('middle')),
      actionButton(ICONS.alignBottomEdge, t.alignBottom, () => studio.align('bottom')),
    ),
    h(
      'div',
      { class: 'sp-row' },
      actionGroup(
        actionButton(ICONS.front, t.toFront, () => studio.reorder('front')),
        actionButton(ICONS.forward, t.forward, () => studio.reorder('forward')),
        actionButton(ICONS.backward, t.backward, () => studio.reorder('backward')),
        actionButton(ICONS.back, t.toBack, () => studio.reorder('back')),
      ),
      actionGroup(
        actionButton(ICONS.distributeH, t.distributeH, () => studio.distribute('x'), false, studio.picked.length < 3),
        actionButton(ICONS.distributeV, t.distributeV, () => studio.distribute('y'), false, studio.picked.length < 3),
      ),
    ),
  );
}

function appearanceSection(studio: Studio): HTMLElement {
  const { t } = studio;
  const first = studio.picked[0];
  return section(
    t.appearance,
    slider(t.opacity, first.opacity * 100, '%', (v) => fromPanel(studio, () => studio.change((e) => ({ ...e, opacity: v / 100 }), 'opacity'))),
  );
}

/** The spacings offered, the one the text has among them when it is none of them. */
function lineHeights(current: number): [number, string][] {
  const values = [...new Set([0.9, 1, 1.15, 1.3, 1.5, 2, Math.round(current * 100) / 100])].sort((a, b) => a - b);
  return values.map((v) => [v, v.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 2 })]);
}

function textSection(studio: Studio): HTMLElement {
  const { t } = studio;
  const run = textActions.run(studio)!;
  const para = textActions.paragraph(studio) ?? {};
  const align = para.align ?? 'left';
  const editing = studio.editingElement;
  const range = studio.textRange;
  const first = textTargets(studio)[0];
  const listKind = editing && range ? listKindAt(editing.doc, range.from.para) : first && listKindAt(first.doc, 0);
  const fonts = FONTS.includes(run.fontFamily) ? FONTS : [run.fontFamily, ...FONTS];
  return section(
    t.text,
    picker(
      t.font,
      run.fontFamily,
      fonts.map((f) => [f, f]),
      (f) => textActions.applyRun(studio, { fontFamily: f }),
      (f) => `font-family:"${f}"`,
    ),
    h(
      'div',
      { class: 'sp-grid' },
      numberField(t.size, run.fontSize, 'pt', (v) => v > 0 && fromPanel(studio, () => textActions.applyRun(studio, { fontSize: v }, 'size')), { min: 1, max: 999 }),
      picker(t.lineHeight, Math.round((para.lineHeight ?? 1) * 100) / 100, lineHeights(para.lineHeight ?? 1), (v) => textActions.applyParagraph(studio, { lineHeight: v })),
    ),
    colorField(t.color, run.color, (c) => fromPanel(studio, () => textActions.applyRun(studio, { color: c }, 'text-color'))),
    h(
      'div',
      { class: 'sp-row' },
      actionGroup(
        actionButton(ICONS.bold, t.bold, () => textActions.toggle(studio, 'bold'), run.bold),
        actionButton(ICONS.italic, t.italic, () => textActions.toggle(studio, 'italic'), run.italic),
        actionButton(ICONS.underline, t.underline, () => textActions.toggle(studio, 'underline'), run.underline),
        actionButton(ICONS.strike, t.strike, () => textActions.toggle(studio, 'strike'), run.strike),
      ),
      actionGroup(
        actionButton(ICONS.bullets, t.bullets, () => textActions.list(studio, 'bullet'), listKind === 'bullet'),
        actionButton(ICONS.numbers, t.numbered, () => textActions.list(studio, 'number'), listKind === 'number'),
      ),
    ),
    actionGroup(
      actionButton(ICONS.alignLeft, t.textLeft, () => textActions.applyParagraph(studio, { align: 'left' }), align === 'left'),
      actionButton(ICONS.alignCenter, t.textCenter, () => textActions.applyParagraph(studio, { align: 'center' }), align === 'center'),
      actionButton(ICONS.alignRight, t.textRight, () => textActions.applyParagraph(studio, { align: 'right' }), align === 'right'),
      actionButton(ICONS.alignJustify, t.justify, () => textActions.applyParagraph(studio, { align: 'justify' }), align === 'justify'),
    ),
  );
}

function shapeSection(studio: Studio, shapes: Extract<Element, { type: 'shape' }>[]): HTMLElement {
  const { t } = studio;
  const first = shapes[0];
  const fill = first.fill?.kind === 'solid' ? first.fill.color : first.fill?.kind === 'gradient' ? first.fill.from : 'FFFFFF';
  const line = first.shape === 'line';
  return section(
    t.shape,
    picker<ShapeKind>(
      t.kind,
      first.shape,
      SHAPE_KINDS.map((k) => [k, studio.names.shape(k)]),
      (shape) => studio.change((e) => (e.type === 'shape' ? { ...e, shape, ...(shape === 'line' ? { stroke: e.stroke ?? '1F2937', strokeWidth: e.strokeWidth || 4 } : {}) } : e)),
    ),
    !line && colorField(t.fill, fill, (c) => fromPanel(studio, () => studio.change((e) => (e.type === 'shape' ? { ...e, fill: solid(c) } : e), 'fill'))),
    colorField(line ? t.lineColor : t.border, first.stroke ?? '1F2937', (c) =>
      fromPanel(studio, () => studio.change((e) => (e.type === 'shape' ? { ...e, stroke: c, strokeWidth: e.strokeWidth || 2 } : e), 'stroke')),
    ),
    h(
      'div',
      { class: 'sp-grid' },
      numberField(
        t.thickness,
        first.strokeWidth,
        'pt',
        (v) => fromPanel(studio, () => studio.change((e) => (e.type === 'shape' ? { ...e, strokeWidth: Math.max(0, v), stroke: e.stroke ?? '1F2937' } : e), 'stroke-width')),
        {
          min: 0,
          max: 80,
        },
      ),
    ),
  );
}

function imageSection(studio: Studio, image: Extract<Element, { type: 'image' }>): HTMLElement {
  const { t } = studio;
  const half = Math.min(image.width, image.height) / 2;
  return section(
    t.image,
    slider(t.roundCorners, (image.radius / half) * 100, '%', (v) =>
      fromPanel(studio, () => studio.change((e) => (e.type === 'image' ? { ...e, radius: (v / 100) * (Math.min(e.width, e.height) / 2) } : e), 'radius')),
    ),
  );
}

function checkbox(label: string, checked: boolean, onChange: (checked: boolean) => void): HTMLElement {
  const input = h('input', { type: 'checkbox', checked });
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'sp-checkbox' }, input, h('span', { class: 'sp-checkbox-box', 'aria-hidden': 'true' }), h('span', {}, label));
}

function sizeSection(studio: Studio): HTMLElement {
  const { t } = studio;
  const { size } = studio.deck;
  const preset = presetOf(size);
  const resize = (next: { width: number; height: number }) => fromMeasure(() => studio.resizeSlides(next));
  const presets: [string, string][] = [
    ...(preset ? [] : ([['custom', `${t.customSize} · ${formatLength(size.width, studio.unit)} × ${formatLength(size.height, studio.unit)}`]] as [string, string][])),
    ...SIZE_PRESETS.map((p): [string, string] => [p.id, `${studio.names.preset(p)} · ${p.width} × ${p.height} ${p.unit}`]),
  ];
  return section(
    t.slideSize,
    picker(t.measure, preset?.id ?? 'custom', presets, (id) => {
      const chosen = SIZE_PRESETS.find((p) => p.id === id);
      if (!chosen) return;
      // A size known in pixels is worked in pixels, one known in centimetres in centimetres.
      fromMeasure(() => {
        studio.setUnit(chosen.unit);
        studio.resizeSlides(presetSize(chosen));
      });
    }),
    h(
      'div',
      { class: 'sp-size-row' },
      lengthField(studio, t.width, size.width, (v) => resize({ width: v, height: size.height }), { min: 1 }),
      actionButton(ICONS.swap, t.swapOrientation, () => resize({ width: size.height, height: size.width }), false, Math.abs(size.width - size.height) < 0.01),
      lengthField(studio, t.height, size.height, (v) => resize({ width: size.width, height: v }), { min: 1 }),
    ),
    picker(
      t.unit,
      studio.unit,
      UNITS.map((u) => [u, studio.names.unit(u)]),
      (u) => fromMeasure(() => studio.setUnit(u)),
    ),
    checkbox(t.fitOnResize, studio.fitOnResize, (on) => (studio.fitOnResize = on)),
  );
}

function slideSection(studio: Studio): HTMLElement[] {
  const { t } = studio;
  const bg = studio.slide.background;
  return [
    sizeSection(studio),
    section(
      t.background,
      colorField(t.color, bg.kind === 'solid' ? bg.color : bg.from, (c) => fromPanel(studio, () => studio.commit(setBackground(studio.deck, studio.slide.id, solid(c)), 'background'))),
      h('div', { class: 'sp-preview', style: `background:${cssFill(bg)}` }),
      h(
        'button',
        {
          type: 'button',
          class: 'sp-button sp-button-secondary sp-block',
          onclick: () => studio.commit({ ...studio.deck, slides: studio.deck.slides.map((s) => (s.background === bg ? s : { ...s, background: bg })) }),
        },
        t.applyToAll,
      ),
    ),
    section(t.tips, h('ul', { class: 'sp-tips' }, h('li', {}, t.tipEdit), h('li', {}, t.tipSelect), h('li', {}, t.tipGuides))),
  ];
}

/** The panel made again for what is picked; left alone when it is still for the same and in use, or when it made the change itself. */
export function renderProperties(studio: Studio, force: boolean): void {
  const { t } = studio;
  const ed = studio.editing;
  const key = `${studio.slide.id}|${studio.selection.join(',')}|${ed ? `${ed.anchor.para}.${ed.anchor.offset}-${ed.focus.para}.${ed.focus.offset}` : ''}`;
  const panel = studio.properties;
  const busy = panel.contains(document.activeElement) && document.activeElement !== panel;
  const fromItself = studio.fromContext;
  studio.fromContext = false;
  const again = rebuild;
  rebuild = false;
  if (key === builtFor && !again && (!force || busy || fromItself)) return;
  builtFor = key;
  const picked = studio.picked;
  const kind = !picked.length ? t.slide : picked.length > 1 ? say(t.nElements, { n: picked.length }) : { text: t.text, shape: t.shape, image: t.image }[picked[0].type];
  const parts: Node[] = [];
  if (!picked.length) parts.push(...slideSection(studio));
  else {
    const texts = picked.filter((e) => e.type === 'text');
    const shapes = picked.filter((e) => e.type === 'shape');
    if (texts.length === picked.length) parts.push(textSection(studio));
    else if (shapes.length === picked.length) parts.push(shapeSection(studio, shapes));
    else if (picked.length === 1 && picked[0].type === 'image') parts.push(imageSection(studio, picked[0]));
    parts.push(transformSection(studio), arrangeSection(studio), appearanceSection(studio));
    const locked = picked.every((e) => e.locked);
    parts.push(
      h(
        'div',
        { class: 'sp-footer' },
        actionButton(locked ? ICONS.lock : ICONS.unlock, locked ? t.unlock : t.lock, () => studio.change((e) => ({ ...e, locked: !locked })), locked),
        actionButton(ICONS.copy, t.duplicate, () => studio.duplicate()),
        h('span', { class: 'sp-spacer' }),
        h('button', { type: 'button', class: 'sp-button sp-button-negative', onclick: () => studio.remove() }, t.delete),
      ),
    );
  }
  const top = panel.scrollTop;
  panel.replaceChildren(h('header', { class: 'sp-panel-header' }, h('h2', {}, t.properties), h('span', { class: 'sp-badge' }, kind)), h('div', { class: 'sp-panel-body' }, ...parts));
  panel.scrollTop = top;
}
