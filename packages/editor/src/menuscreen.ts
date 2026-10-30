// The menu of the deck, as Rebodocs has the menu of its document: a screen of
// its own over the studio, opened from the first button of its bar, with its
// parts down one side (the deck, export, the language, the appearance) and the one chosen
// beside them. Each entry calls the studio: this only lays them out.

import { h } from './dom';
import { type Strings, say } from './i18n';
import { ICONS } from './icons';

/** What the menu asks of the studio. */
export interface MenuHost {
  readonly root: HTMLElement;
  title(): string;
  slideCount(): number;
  theme(): 'light' | 'dark';
  newDeck(): void;
  openFile(): void;
  saveFile(): void;
  present(): void;
  exportPdf(): void;
  exportPng(): void;
  setTheme(theme: 'light' | 'dark'): void;
  /** What the menu says, and the language it is in. */
  t: Strings;
  language: 'en' | 'es';
  /** Given, the menu has the choice of language: the application mounts the studio again in the one chosen. */
  setLocale?: (locale: 'en' | 'es') => void;
  focus(): void;
}

export function createMenuScreen(host: MenuHost): { open(): void; close(): void; isOpen(): boolean; destroy(): void } {
  const { t } = host;
  const updates: (() => void)[] = [];
  const tabs: HTMLButtonElement[] = [];
  const panes: HTMLElement[] = [];
  const screen = h('div', { class: 'rsl-side', role: 'dialog', 'aria-modal': 'true', 'aria-label': t.menu });
  screen.hidden = true;

  const show = (index: number) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    panes.forEach((pane, i) => {
      pane.hidden = i !== index;
    });
  };
  const icon = (name: keyof typeof ICONS) => h('span', { class: 'rsl-side-glyph', html: ICONS[name], 'aria-hidden': 'true' });

  const list = h('div', { class: 'rsl-side-list', role: 'tablist', 'aria-orientation': 'vertical' });
  const main = h('div', { class: 'rsl-side-main' });
  const pane = (id: string, iconName: keyof typeof ICONS, label: string, intro: string, ...content: HTMLElement[]) => {
    const index = tabs.length;
    const tab = h(
      'button',
      { type: 'button', class: 'rsl-side-tab', id: `rsl-side-tab-${id}`, role: 'tab', 'aria-controls': `rsl-side-pane-${id}`, onclick: () => show(index) },
      icon(iconName),
      label,
    );
    list.append(tab);
    tabs.push(tab);
    const node = h('section', { class: 'rsl-side-pane', id: `rsl-side-pane-${id}`, role: 'tabpanel', 'aria-labelledby': tab.id }, h('h2', {}, label), intro ? h('p', {}, intro) : undefined);
    node.append(...content);
    main.append(node);
    panes.push(node);
  };

  /** The deck: its title and how many slides. */
  const card = (withIcon: boolean) => {
    const name = h('b');
    const count = h('small');
    updates.push(() => {
      name.textContent = host.title();
      const n = host.slideCount();
      count.textContent = n === 1 ? t.slideCountOne : say(t.slideCount, { n });
    });
    return h('div', { class: 'rsl-side-doc' }, withIcon ? h('span', { class: 'rsl-side-icon', html: ICONS.templates }) : undefined, h('div', {}, name, count));
  };

  /** An entry that closes the menu and then does what it says. */
  const act = (run: () => void) => () => {
    close();
    run();
  };
  const tile = (iconName: keyof typeof ICONS, label: string, keys: string, run: () => void) =>
    h('button', { type: 'button', class: 'rsl-side-tile', onclick: act(run) }, icon(iconName), h('span', {}, label), keys ? h('small', {}, keys) : undefined);
  const format = (iconName: keyof typeof ICONS, label: string, text: string, run: () => void) =>
    h('button', { type: 'button', class: 'rsl-side-format', onclick: act(run) }, h('span', { class: 'rsl-side-icon', html: ICONS[iconName] }), h('span', {}, h('b', {}, label), h('small', {}, text)));

  pane(
    'deck',
    'templates',
    t.menuDeck,
    '',
    card(true),
    h(
      'div',
      { class: 'rsl-side-tiles' },
      tile('plus', t.menuNew, '', () => host.newDeck()),
      tile('open', t.menuOpen, '', () => host.openFile()),
      tile('save', t.menuSave, '', () => host.saveFile()),
      tile('play', t.present, '', () => host.present()),
    ),
  );
  pane(
    'export',
    'download',
    t.menuExport,
    '',
    h(
      'div',
      { class: 'rsl-side-formats' },
      format('file', 'PDF', t.menuPdfText, () => host.exportPdf()),
      format('uploads', t.menuPng, t.menuPngText, () => host.exportPng()),
      format('save', t.menuFile, t.menuFileText, () => host.saveFile()),
    ),
  );
  const setLocale = host.setLocale;
  if (setLocale) {
    const languages = h('div', { class: 'rsl-side-choices', role: 'radiogroup', 'aria-label': t.menuLanguage });
    for (const [value, label] of [
      ['es', 'Español'],
      ['en', 'English'],
    ] as const)
      languages.append(
        h(
          'button',
          {
            type: 'button',
            class: 'rsl-side-choice',
            role: 'radio',
            'aria-checked': String(host.language === value),
            onclick: () => {
              if (value === host.language) return;
              close();
              setLocale(value);
            },
          },
          h('span', { class: 'rsl-side-dot' }),
          label,
        ),
      );
    pane('language', 'language', t.menuLanguage, t.menuLanguageText, languages);
  }
  const choices = h('div', { class: 'rsl-side-choices', role: 'radiogroup', 'aria-label': t.menuAppearance });
  for (const [value, label] of [
    ['light', t.menuLight],
    ['dark', t.menuDark],
  ] as const) {
    const choice = h(
      'button',
      {
        type: 'button',
        class: 'rsl-side-choice',
        role: 'radio',
        onclick: () => {
          host.setTheme(value);
          refresh();
        },
      },
      h('span', { class: 'rsl-side-dot' }),
      label,
    );
    updates.push(() => choice.setAttribute('aria-checked', String(host.theme() === value)));
    choices.append(choice);
  }
  pane('appearance', 'contrast', t.menuAppearance, t.menuAppearanceText, choices);

  const back = h('button', { type: 'button', class: 'rsl-side-back', onclick: () => close() }, icon('goBack'), h('span', {}, t.menuBack));
  const x = h('button', { type: 'button', class: 'rsl-side-x', 'aria-label': t.menuClose, title: t.menuClose, html: ICONS.close, onclick: () => close() });
  main.append(x);
  screen.append(h('nav', { class: 'rsl-side-nav', 'aria-label': t.menu }, back, list, card(false)), main);
  host.root.append(screen);

  const refresh = () => {
    for (const update of updates) update();
  };
  // On the document: in Safari a click does not give a button the focus, which may stay outside the menu.
  const onKey = (e: KeyboardEvent) => {
    if (screen.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && tabs.includes(document.activeElement as HTMLButtonElement)) {
      e.preventDefault();
      const at = tabs.indexOf(document.activeElement as HTMLButtonElement);
      const next = (at + (e.key === 'ArrowDown' ? 1 : tabs.length - 1)) % tabs.length;
      show(next);
      tabs[next].focus();
    }
  };
  document.addEventListener('keydown', onKey, true);

  function open(): void {
    refresh();
    show(0);
    screen.hidden = false;
    tabs[0]?.focus();
  }
  function close(): void {
    if (screen.hidden) return;
    screen.hidden = true;
    host.focus();
  }
  return {
    open,
    close,
    isOpen: () => !screen.hidden,
    destroy() {
      document.removeEventListener('keydown', onKey, true);
      screen.remove();
    },
  };
}
