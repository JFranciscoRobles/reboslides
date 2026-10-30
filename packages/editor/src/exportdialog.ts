// The panel that comes down from Download, as Canva has it: the kind of file,
// what that kind can be asked (size, transparency, quality, bleed and crop
// marks, how long each slide shows), which slides, and the button. The
// choices are remembered for the next download.

import { formatLength, fromUnit, parsePages } from '@reboslides/core';
import { h } from './dom';
import { DEFAULT_SETTINGS, EXPORT_KINDS, type ExportKind, type ExportSettings, pixelHeight, exportNames, pixelWidth, runExport, videoFormat } from './exporter';
import { say } from './i18n';
import type { Studio } from './studio';

const KEY = 'reboslides:export';

function remembered(): ExportSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function remember(settings: ExportSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Not kept: the next download starts from the usual choices.
  }
}

type Pages = 'all' | 'current' | 'pick';

export function openExportDialog(studio: Studio, anchor: HTMLElement): void {
  const { t } = studio;
  const names = exportNames(t);
  const settings = remembered();
  if (settings.kind === 'video' && !videoFormat()) settings.kind = 'png';
  let pages: Pages = 'all';
  let picked = '';
  let busy = false;
  const body = h('div', { class: 'sp-export' });
  studio.openPopover(anchor, [body]);

  const count = () => studio.deck.slides.length;
  const chosen = (): number[] | undefined => (pages === 'all' ? [...Array(count()).keys()] : pages === 'current' ? [studio.current] : parsePages(picked, count()));

  const render = () => {
    const deck = studio.deck;
    const set = (patch: Partial<ExportSettings>) => {
      Object.assign(settings, patch);
      remember(settings);
      render();
    };
    const kind = h('select', { class: 'sp-picker', 'aria-label': t.fileType });
    for (const k of EXPORT_KINDS) {
      if (k === 'video' && !videoFormat()) continue;
      const label = k === 'video' ? `${t.formatVideoName} ${videoFormat()!.extension.slice(1).toUpperCase()}` : names[k].name;
      kind.append(h('option', { value: k, selected: k === settings.kind }, `${label}${k === 'png' ? ' · Sugerido' : ''}`));
    }
    kind.addEventListener('change', () => {
      const next = kind.value as ExportKind;
      // A GIF has 256 colours to a frame and a frame to each step of a fade: half the size is already heavy.
      set(next === 'gif' && settings.scale > 0.5 ? { kind: next, scale: 0.5 } : { kind: next });
    });

    const options: Node[] = [];
    const k = settings.kind;
    const check = (label: string, on: boolean, change: (on: boolean) => void) => {
      const input = h('input', { type: 'checkbox', checked: on });
      input.addEventListener('change', () => change(input.checked));
      return h('label', { class: 'sp-checkbox' }, input, h('span', { class: 'sp-checkbox-box', 'aria-hidden': 'true' }), h('span', {}, label));
    };
    const slider = (label: string, value: number, min: number, max: number, step: number, shown: string, change: (v: number) => void) => {
      const range = h('input', { type: 'range', class: 'sp-slider', min, max, step, value, 'aria-label': label });
      range.style.setProperty('--fill', `${((value - min) / (max - min)) * 100}%`);
      range.addEventListener('change', () => change(Number(range.value)));
      range.addEventListener('input', () => {
        range.style.setProperty('--fill', `${((Number(range.value) - min) / (max - min)) * 100}%`);
      });
      return h('div', { class: 'sp-slider-field' }, h('div', { class: 'sp-slider-label' }, h('span', {}, label), h('span', { class: 'sp-slider-value' }, shown)), range);
    };
    if (k === 'png' || k === 'jpg' || k === 'gif' || k === 'video') {
      const max = k === 'gif' ? 1 : 3;
      if (settings.scale > max) settings.scale = max;
      options.push(slider(t.scale, settings.scale, 0.25, max, 0.25, `×${settings.scale} · ${pixelWidth(deck, settings.scale)} × ${pixelHeight(deck, settings.scale)} px`, (v) => set({ scale: v })));
    }
    if (k === 'png') options.push(check(t.transparent, settings.transparent, (on) => set({ transparent: on })));
    if (k === 'jpg') options.push(slider(t.quality, Math.round(settings.quality * 100), 10, 100, 5, `${Math.round(settings.quality * 100)}%`, (v) => set({ quality: v / 100 })));
    if (k === 'pdf-print') {
      options.push(
        check(t.cropMarks, settings.cropMarks, (on) => set({ cropMarks: on })),
        check(`Sangrado (${formatLength(fromUnit(0.3, 'cm'), studio.unit === 'px' ? 'cm' : studio.unit)})`, settings.bleed, (on) => set({ bleed: on })),
      );
    }
    if (k === 'gif' || k === 'video') {
      const seconds = h('input', { type: 'number', class: 'sp-textfield', min: 1, max: 30, step: 0.5, value: settings.seconds, 'aria-label': t.secondsPerSlide });
      seconds.addEventListener('change', () => set({ seconds: Math.max(0.5, Math.min(30, Number(seconds.value) || DEFAULT_SETTINGS.seconds)) }));
      options.push(
        h('label', { class: 'sp-field' }, h('span', { class: 'sp-field-label' }, t.secondsPerSlide), h('span', { class: 'sp-textfield-wrap' }, seconds, h('span', { class: 'sp-unit' }, 's'))),
        check(t.fade, settings.fade, (on) => set({ fade: on })),
      );
    }
    if (k === 'video') {
      const n = chosen()?.length ?? count();
      options.push(h('p', { class: 'sp-help' }, say(t.recordsLive, { n: Math.ceil(n * settings.seconds) })));
    }

    const pagePicker = h('select', { class: 'sp-picker', 'aria-label': t.pages });
    for (const [value, label] of [
      ['all', say(t.allPages, { n: count() })],
      ['current', say(t.currentPage, { n: studio.current + 1 })],
      ['pick', t.pickPages],
    ] as const)
      pagePicker.append(h('option', { value, selected: value === pages }, label));
    pagePicker.addEventListener('change', () => {
      pages = pagePicker.value as Pages;
      render();
      if (pages === 'pick') body.querySelector<HTMLInputElement>('.sp-pages')?.focus();
    });
    const pageInput =
      pages === 'pick' &&
      h('input', {
        type: 'text',
        class: 'sp-textfield sp-pages',
        placeholder: say(t.pagesExample, { n: Math.min(5, count()) }),
        value: picked,
        'aria-label': t.pagesToDownload,
        oninput: (e: Event) => {
          picked = (e.target as HTMLInputElement).value;
          error.textContent = picked && !parsePages(picked, count()) ? say(t.pagesError, { n: count() }) : '';
          go.disabled = busy || !chosen();
        },
      });
    const error = h('p', { class: 'sp-error', role: 'alert' });
    const multiple = (chosen()?.length ?? 0) > 1 && ['png', 'jpg', 'svg'].includes(k);
    const progress = h('div', { class: 'sp-progress', hidden: true }, h('div', { class: 'sp-progress-bar' }));
    const go = h('button', { type: 'button', class: 'sp-button sp-button-accent sp-block', disabled: busy || (k !== 'reboslides' && !chosen()) }, t.download);
    go.addEventListener('click', async () => {
      const list = k === 'reboslides' ? [...Array(count()).keys()] : chosen();
      if (!list || busy) return;
      busy = true;
      go.disabled = true;
      go.textContent = k === 'video' ? t.recording : t.preparing;
      progress.hidden = false;
      const bar = progress.firstElementChild as HTMLElement;
      try {
        await runExport(settings, {
          deck: studio.deck,
          pages: list,
          measurer: studio.measurer,
          images: studio.images,
          layoutOf: studio.layoutOf,
          progress: (f) => (bar.style.width = `${Math.round(f * 100)}%`),
          t,
        });
        document.querySelector('.rsl-menu')?.remove();
      } catch (e) {
        error.textContent = say(t.downloadFailed, { error: (e as Error).message });
      } finally {
        busy = false;
        go.disabled = false;
        go.textContent = t.download;
      }
    });

    const parts: (Node | false)[] = [
      h('h2', { class: 'sp-export-title' }, t.download),
      h('label', { class: 'sp-field' }, h('span', { class: 'sp-field-label' }, t.fileType), kind),
      h('p', { class: 'sp-help' }, names[k].note),
      ...options,
      k !== 'reboslides' && h('label', { class: 'sp-field' }, h('span', { class: 'sp-field-label' }, t.pages), pagePicker),
      k !== 'reboslides' && pageInput,
      multiple && h('p', { class: 'sp-help' }, t.zipNote),
      error,
      progress,
      go,
    ];
    body.replaceChildren(...parts.filter((p): p is Node => !!p));
  };
  render();
}
