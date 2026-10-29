// The panel beside the slide: where things are put on it from. Templates,
// shapes and stickers, text, the pictures uploaded, backgrounds, and the
// layers of the slide, top first.

import {
  type Element,
  type Fill,
  LAYOUTS,
  SHAPE_KINDS,
  THEMES,
  createImage,
  createShape,
  createText,
  layoutSlide,
  plainTextOf,
  setBackground,
  shapePath,
  solid,
  svgPath,
  themedDeck,
} from '@reboslides/core';
import { fromInput, h } from './dom';
import { type Strings, say } from './i18n';
import { ICONS } from './icons';
import { cssFill, drawElement, slideCanvas } from './render';
import type { Studio } from './studio';

export type PanelTab = 'templates' | 'elements' | 'text' | 'uploads' | 'background' | 'layers';

export const PANEL_TABS: { id: PanelTab; name: keyof Strings; icon: keyof typeof ICONS }[] = [
  { id: 'templates', name: 'tabTemplates', icon: 'templates' },
  { id: 'elements', name: 'tabElements', icon: 'elements' },
  { id: 'text', name: 'tabText', icon: 'text' },
  { id: 'uploads', name: 'tabUploads', icon: 'uploads' },
  { id: 'background', name: 'tabBackground', icon: 'background' },
  { id: 'layers', name: 'tabLayers', icon: 'layers' },
];

const STICKERS = ['⭐', '🔥', '🚀', '💡', '✅', '❤️', '🎉', '📈', '🎯', '👋', '🙌', '✨', '📌', '💬', '⚡', '🌱'];

const SOLIDS = [
  'FFFFFF',
  'F3F4F6',
  'D1D5DB',
  '6B7280',
  '111827',
  '000000',
  'FEE2E2',
  'FCA5A5',
  'EF4444',
  'B91C1C',
  'FFEDD5',
  'F97316',
  'FEF9C3',
  'FDE047',
  'EAB308',
  'DCFCE7',
  '4ADE80',
  '15803D',
  'CFFAFE',
  '22D3EE',
  '0E7490',
  'DBEAFE',
  '3B82F6',
  '1E3A8A',
  'EDE9FE',
  'A78BFA',
  '7C3AED',
  'FCE7F3',
  'F472B6',
  'BE185D',
];

const GRADIENTS: Fill[] = [
  { kind: 'gradient', from: '7C3AED', to: 'EC4899', angle: 35 },
  { kind: 'gradient', from: '06B6D4', to: '3B82F6', angle: 45 },
  { kind: 'gradient', from: 'F97316', to: 'FDE047', angle: 90 },
  { kind: 'gradient', from: '10B981', to: '064E3B', angle: 120 },
  { kind: 'gradient', from: '0F172A', to: '334155', angle: 90 },
  { kind: 'gradient', from: 'FBCFE8', to: 'BFDBFE', angle: 0 },
  { kind: 'gradient', from: 'F43F5E', to: '7C3AED', angle: 60 },
  { kind: 'gradient', from: 'FEF3C7', to: 'FDE68A', angle: 90 },
];

const PAIRS: [string, string, keyof Strings, boolean][] = [
  ['Playfair Display', 'Lora', 'pairElegant', true],
  ['Bebas Neue', 'Inter', 'pairImpact', false],
  ['Poppins', 'Poppins', 'pairModern', true],
  ['Space Grotesk', 'Inter', 'pairTechnical', true],
  ['Pacifico', 'Montserrat', 'pairPlayful', false],
  ['DM Serif Display', 'Inter', 'pairEditorial', false],
  ['Caveat', 'Lora', 'pairHand', true],
];

function centred(studio: Studio, element: Element): Element {
  const { width, height } = studio.deck.size;
  return { ...element, x: (width - element.width) / 2, y: (height - element.height) / 2 };
}

function templatesTab(studio: Studio): Node[] {
  const { t, names, language } = studio;
  const theme = THEMES.find((t) => t.id === studio.themeId) ?? THEMES[0];
  const chips = h('div', { class: 'rs-chips' });
  for (const one of THEMES) {
    chips.append(
      h(
        'button',
        {
          type: 'button',
          class: `rs-chip${one.id === theme.id ? ' rs-on' : ''}`,
          onclick: () => {
            studio.themeId = one.id;
            studio.invalidate('panel');
          },
        },
        h('i', { style: `background:${cssFill(one.background)};box-shadow:inset 0 0 0 4px #${one.accent}` }),
        names.theme(one),
      ),
    );
  }
  const grid = h('div', { class: 'rs-grid' });
  for (const layout of LAYOUTS) {
    const slide = layoutSlide(theme, layout, studio.deck.size, language);
    const tile = h('button', {
      type: 'button',
      class: 'rs-tile',
      title: say(t.addLayout, { name: names.layout(layout) }),
      onclick: () => studio.insertSlide(layoutSlide(theme, layout, studio.deck.size, language)),
    });
    tile.append(slideCanvas(slide, studio.deck.size, 260, studio.drawContext));
    grid.append(tile);
  }
  return [
    h('h3', {}, t.themes),
    chips,
    h('h3', {}, t.slides),
    h('p', { class: 'rs-note' }, t.slidesNote),
    grid,
    h('h3', {}, t.wholeDeck),
    h(
      'button',
      {
        type: 'button',
        class: 'sp-button sp-button-accent sp-block',
        onclick: () => {
          studio.commit(themedDeck(theme, studio.deck.size, studio.deck.title, language));
          studio.goTo(0);
          studio.toast(t.themedDone);
        },
      },
      say(t.startWithTheme, { theme: names.theme(theme) }),
    ),
    h('p', { class: 'rs-note' }, t.startWithThemeNote),
  ];
}

function elementsTab(studio: Studio): Node[] {
  const shapes = h('div', { class: 'rs-grid rs-grid-4' });
  for (const kind of SHAPE_KINDS) {
    const line = kind === 'line';
    const w = line ? 40 : kind === 'arrow' ? 44 : 40;
    const hh = line ? 4 : kind === 'arrow' ? 26 : 40;
    const tile = h('button', {
      type: 'button',
      class: 'rs-tile rs-shape-tile',
      title: studio.names.shape(kind),
      'aria-label': studio.names.shape(kind),
      onclick: () => {
        const size = line ? { width: 320, height: 8 } : kind === 'arrow' ? { width: 240, height: 140 } : { width: 200, height: 200 };
        studio.addAndSelect([centred(studio, createShape(kind, { x: 0, y: 0, ...size }))]);
      },
    });
    tile.innerHTML = `<svg viewBox="-4 -4 ${w + 8} ${hh + 8}"><path d="${svgPath(shapePath(kind, w, hh))}" fill="${line ? 'none' : 'currentColor'}" stroke="currentColor" stroke-width="${line ? 3 : 0}"/></svg>`;
    shapes.append(tile);
  }
  const stickers = h('div', { class: 'rs-grid rs-grid-4' });
  for (const emoji of STICKERS) {
    stickers.append(
      h(
        'button',
        {
          type: 'button',
          class: 'rs-tile rs-emoji',
          onclick: () => studio.addAndSelect([centred(studio, createText(emoji, { x: 0, y: 0, width: 140 }, { run: { fontSize: 96 }, paragraph: { align: 'center', lineHeight: 1 } }))]),
        },
        emoji,
      ),
    );
  }
  return [h('h3', {}, studio.t.shapes), shapes, h('h3', {}, studio.t.stickers), stickers];
}

function textTab(studio: Studio): Node[] {
  const { t } = studio;
  const { width, height } = studio.deck.size;
  const add = (text: string, size: number, bold: boolean, cls: string, label: string) =>
    h(
      'button',
      {
        type: 'button',
        class: `rs-btn rs-wide ${cls}`,
        onclick: () => {
          const box = createText(text, { x: width * 0.15, y: height * 0.4, width: width * 0.7 }, { run: { fontSize: size, bold }, paragraph: { align: 'center' } });
          studio.addAndSelect([box]);
          studio.startEditing(box);
        },
      },
      label,
    );
  const pairs = PAIRS.map(([heading, body, key, bold]) => {
    const sample = t[key];
    return h(
      'button',
      {
        type: 'button',
        class: 'rs-pair',
        onclick: () => {
          const title = createText(
            sample,
            { x: width * 0.15, y: height * 0.34, width: width * 0.7 },
            { run: { fontFamily: heading, fontSize: 64, bold }, paragraph: { align: 'center', lineHeight: 1.05 } },
          );
          const sub = createText(t.pairSub, { x: width * 0.2, y: height * 0.56, width: width * 0.6 }, { run: { fontFamily: body, fontSize: 22, color: '4B5563' }, paragraph: { align: 'center' } });
          studio.addAndSelect([title, sub]);
        },
      },
      h('b', { style: `font-family:"${heading}";font-weight:${bold ? 700 : 400}` }, sample),
      h('span', { style: `font-family:"${body}"` }, `${heading} + ${body}`),
    );
  });
  return [
    h('h3', {}, t.addText),
    add(t.aHeading, 64, true, 'rs-add-heading', t.addHeading),
    add(t.aSubheading, 36, true, 'rs-add-sub', t.addSubheading),
    add(t.aParagraph, 22, false, 'rs-add-body', t.addParagraph),
    h('h3', {}, t.fontPairs),
    ...pairs,
  ];
}

function uploadsTab(studio: Studio): Node[] {
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
  input.addEventListener('change', () => input.files && studio.addImageFiles([...input.files]));
  const drop = h(
    'div',
    { class: 'rs-drop' },
    h('p', {}, studio.t.dropPictures),
    h('button', { type: 'button', class: 'sp-button sp-button-accent', onclick: () => input.click() }, studio.t.uploadPictures),
    input,
  );
  drop.addEventListener('dragover', (e) => (e.preventDefault(), drop.classList.add('rs-over')));
  drop.addEventListener('dragleave', () => drop.classList.remove('rs-over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('rs-over');
    studio.addImageFiles([...(e.dataTransfer?.files ?? [])]);
  });
  // The pictures of this session and those already in the deck, each once.
  const known = new Map(studio.uploads.map((u) => [u.src, u]));
  for (const slide of studio.deck.slides) for (const e of slide.elements) if (e.type === 'image' && !known.has(e.src)) known.set(e.src, { src: e.src, width: e.naturalWidth, height: e.naturalHeight });
  const grid = h('div', { class: 'rs-grid' });
  for (const image of known.values()) {
    grid.append(
      h(
        'button',
        { type: 'button', class: 'rs-tile', onclick: () => studio.addAndSelect([createImage(image.src, image.width, image.height, studio.deck.size)]) },
        h('img', { src: image.src, alt: '' }),
      ),
    );
  }
  return [drop, known.size ? h('h3', {}, studio.t.yourPictures) : '', grid].filter(Boolean) as Node[];
}

function backgroundTab(studio: Studio): Node[] {
  const { t } = studio;
  const apply = (fill: Fill) => studio.commit(setBackground(studio.deck, studio.slide.id, fill));
  const swatch = (fill: Fill) => h('button', { type: 'button', class: 'rs-swatch', style: `background:${cssFill(fill)}`, 'aria-label': t.useAsBackground, onclick: () => apply(fill) });
  const custom = h('input', { type: 'color', 'aria-label': t.customColor, style: 'width:100%;height:36px;border:0;padding:0;background:none' });
  custom.addEventListener('input', () => studio.commit(setBackground(studio.deck, studio.slide.id, solid(fromInput(custom.value))), 'background'));
  return [
    h('h3', {}, t.colors),
    h('div', { class: 'rs-grid', style: 'grid-template-columns:repeat(6,1fr)' }, ...SOLIDS.map((c) => swatch(solid(c)))),
    h('h3', {}, t.gradients),
    h('div', { class: 'rs-grid rs-grid-4' }, ...GRADIENTS.map(swatch)),
    h('h3', {}, t.custom),
    custom,
    h('h3', {}, t.wholeDeck),
    h(
      'button',
      {
        type: 'button',
        class: 'rs-btn rs-wide',
        onclick: () => {
          const bg = studio.slide.background;
          studio.commit({ ...studio.deck, slides: studio.deck.slides.map((s) => (s.background === bg ? s : { ...s, background: bg })) });
          studio.toast(t.backgroundAllDone);
        },
      },
      t.backgroundAll,
    ),
  ];
}

function layersTab(studio: Studio): Node[] {
  const { t } = studio;
  const list = h('div');
  const elements = studio.slide.elements.slice().reverse();
  for (const e of elements) {
    const name = e.type === 'text' ? plainTextOf(e).split('\n')[0] || t.text : e.type === 'image' ? t.image : studio.names.shape(e.shape);
    const lock = h('button', {
      type: 'button',
      class: 'rs-btn',
      title: e.locked ? t.unlock : t.lock,
      onclick: (ev: Event) => {
        ev.stopPropagation();
        studio.change((x) => ({ ...x, locked: !e.locked }), undefined, [e.id]);
      },
    });
    lock.innerHTML = e.locked ? ICONS.lock : ICONS.unlock;
    const thumb = h('canvas', { width: 80, height: 80 });
    const ctx = thumb.getContext('2d');
    if (ctx) {
      const k = Math.min(64 / e.width, 64 / Math.max(e.height, 1));
      ctx.translate(40, 40);
      ctx.scale(k, k);
      ctx.translate(-e.x - e.width / 2, -e.y - e.height / 2);
      drawElement(ctx, e, studio.drawContext);
    }
    list.append(
      h(
        'div',
        { class: `rs-layer${studio.selection.includes(e.id) ? ' rs-on' : ''}`, role: 'button', tabindex: 0, onclick: () => studio.select([e.id]) },
        thumb,
        h('span', { style: e.type === 'text' ? `font-family:"${e.doc.paragraphs[0]?.runs[0]?.props.fontFamily ?? 'Inter'}"` : '' }, name),
        lock,
      ),
    );
  }
  return [h('h3', {}, t.layersTop), elements.length ? list : h('p', { class: 'rs-note' }, t.emptySlide)];
}

export function renderPanel(studio: Studio): void {
  const tabs: Record<PanelTab, (s: Studio) => Node[]> = { templates: templatesTab, elements: elementsTab, text: textTab, uploads: uploadsTab, background: backgroundTab, layers: layersTab };
  if (!studio.panelTab) {
    studio.panel.replaceChildren();
    // Made again when it is opened.
    studio.panel.dataset.key = '';
    return;
  }
  // The panel is made again only when what it shows can have changed: the layers with the slide, the rest when shown.
  const key =
    studio.panelTab === 'layers'
      ? `layers|${studio.slide.id}|${studio.selection}|${studio.slide.elements.map((e) => e.id).join()}`
      : studio.panelTab === 'uploads'
        ? `uploads|${studio.uploads.length}`
        : `${studio.panelTab}|${studio.themeId}`;
  if (studio.panel.dataset.key === key && studio.panelTab !== 'layers') return;
  studio.panel.dataset.key = key;
  const top = studio.panel.scrollTop;
  const tab = PANEL_TABS.find((t) => t.id === studio.panelTab)!;
  const close = h('button', {
    type: 'button',
    class: 'sp-action-button',
    title: studio.t.closePanel,
    'aria-label': studio.t.closePanel,
    onclick: () => {
      studio.panelTab = null;
      studio.invalidate('panel', 'strip');
    },
  });
  close.innerHTML = ICONS.close;
  studio.panel.replaceChildren(h('header', { class: 'sp-panel-header' }, h('h2', {}, studio.t[tab.name]), close), h('div', { class: 'sp-panel-body' }, ...tabs[studio.panelTab](studio)));
  studio.panel.scrollTop = top;
}
