// ReboSlides on the desktop: each window is one deck, a .reboslides file of
// the disk. The window is the studio; Tauri adds the native menu, the dialogs
// to open and save, and the decks the system asks to open. In Spanish or
// English, as chosen in the menu (the system's language at first), and kept.

import { type Deck, createDeck, parseDeck, serializeDeck, untitledDeck } from '@reboslides/core';
import { Studio, googleFontsUrl, setDownloader } from '@reboslides/editor';
import { invoke } from '@tauri-apps/api/core';
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { ask, message, open, save } from '@tauri-apps/plugin-dialog';

const win = getCurrentWebviewWindow();
const IS_MAC = /Mac/.test(navigator.platform);

const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = googleFontsUrl();
document.head.append(fonts);

const LOCALE_KEY = 'reboslides:locale';
let locale: 'es' | 'en' = (() => {
  let kept: string | null = null;
  try {
    kept = localStorage.getItem(LOCALE_KEY);
  } catch {
    // Nowhere to keep it: the system's language.
  }
  return (kept ?? navigator.language).toLowerCase().startsWith('en') ? 'en' : 'es';
})();
const say = (es: string, en: string) => (locale === 'es' ? es : en);

const host = document.getElementById('app')!;
let studio!: Studio;

/** The studio in the language, with `deck`; what the window needs of it wired again each time. */
function mountStudio(deck: Deck): void {
  studio = new Studio(host, { deck, storageKey: null, locale, onLocale: (next) => setLocale(next) });
  // Its own menu opens and saves on the disk too.
  studio.pickFile = () => void openDialog();
  studio.saveFile = () => void saveDeck();
  studio.on('change', showTitle);
  document.documentElement.lang = locale;
}
mountStudio(createDeck(untitledDeck(locale)));

// --- The file -----------------------------------------------------------------

/** Where the deck is on the disk, once it is somewhere. */
let path: string | undefined;
/** The deck as it was last opened or saved: while the studio holds this very one, there is nothing to save. */
let saved: Deck = studio.deck;

const dirty = () => studio.deck !== saved;
const baseName = (file: string) => file.split(/[\\/]/).pop() ?? file;
const title = () => (path ? baseName(path) : say('Presentación sin título', 'Untitled presentation'));
const pristine = () => !path && !dirty();
const filter = () => [{ name: say('Presentación de ReboSlides', 'ReboSlides presentation'), extensions: ['reboslides'] }];

let shown = '';
function showTitle(): void {
  const next = `${title()}${dirty() ? (IS_MAC ? ' — ' : ' • ') + say('editado', 'edited') : ''}`;
  if (next === shown) return;
  shown = next;
  document.title = next;
  void win.setTitle(next);
}

const failed = (what: string, error: unknown) => message(`${what}: ${error instanceof Error ? error.message : String(error)}`, { title: 'ReboSlides', kind: 'error' });
const readFile = async (file: string) => new Uint8Array(await invoke<ArrayBuffer>('read_document', { path: file }));
/** Writes `bytes` to `file`: they go as they are, with where to in a header. */
const writeFile = (file: string, bytes: Uint8Array) => invoke('write_document', bytes, { headers: { path: encodeURIComponent(file) } });

async function load(file: string): Promise<void> {
  try {
    const deck = parseDeck(new TextDecoder().decode(await readFile(file)));
    path = file;
    studio.applyRemote(deck);
    saved = studio.deck;
    showTitle();
  } catch (error) {
    await failed(say('No se pudo abrir', 'Could not open'), error);
  }
}

/** Opens decks: the first here when this window has nothing yet, the others each in a window of its own. */
async function openPaths(paths: string[]): Promise<void> {
  for (const file of paths) {
    if (file === path) continue;
    if (pristine()) await load(file);
    else await invoke('new_window', { path: file });
  }
}

async function openDialog(): Promise<void> {
  const picked = await open({ multiple: true, directory: false, filters: filter() });
  if (picked?.length) await openPaths(picked);
}

async function saveTo(file: string): Promise<boolean> {
  try {
    await writeFile(file, new TextEncoder().encode(serializeDeck(studio.deck)));
    path = file;
    saved = studio.deck;
    showTitle();
    return true;
  } catch (error) {
    await failed(say('No se pudo guardar', 'Could not save'), error);
    return false;
  }
}

async function saveAs(): Promise<boolean> {
  const picked = await save({ defaultPath: path ?? `${studio.deck.title}.reboslides`, filters: filter() });
  if (!picked) return false;
  return saveTo(/\.reboslides$/i.test(picked) ? picked : `${picked}.reboslides`);
}

const saveDeck = () => (path ? saveTo(path) : saveAs());

// What the studio makes (the PDF, a picture, a zip of them) goes where the person says, not to a folder of downloads.
setDownloader(({ name, blob }) => {
  void (async () => {
    const extension = name.split('.').pop() ?? '';
    const picked = await save({ defaultPath: name, filters: [{ name: extension.toUpperCase(), extensions: [extension] }] });
    if (picked) await writeFile(picked, new Uint8Array(await blob.arrayBuffer())).catch((error) => failed(say('No se pudo guardar', 'Could not save'), error));
  })();
});

// Closing a window with changes asks first, also when the whole application is quit.
void win.onCloseRequested(async (event) => {
  if (!dirty()) return;
  const close = await ask(say(`«${title()}» tiene cambios sin guardar. ¿Cerrar de todos modos?`, `“${title()}” has changes not saved. Close anyway?`), {
    title: 'ReboSlides',
    kind: 'warning',
    okLabel: say('Cerrar sin guardar', 'Close without saving'),
    cancelLabel: say('Cancelar', 'Cancel'),
  });
  if (!close) event.preventDefault();
});

// The decks the system asks to open: the one this window was made for, and those that come while it is in front.
const takeOpened = async () => openPaths(await invoke<string[]>('take_opened'));
void win.listen('documents-opened', () => void takeOpened());

// What is dropped on the window: decks are opened, pictures go on the slide.
void getCurrentWebview().onDragDropEvent(async (event) => {
  if (event.payload.type !== 'drop') return;
  const decks = event.payload.paths.filter((file) => /\.reboslides$/i.test(file));
  if (decks.length) await openPaths(decks);
  const pictures: File[] = [];
  for (const file of event.payload.paths) {
    const extension = (file.split('.').pop() ?? '').toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) continue;
    const type = extension === 'svg' ? 'image/svg+xml' : `image/${extension.replace('jpg', 'jpeg')}`;
    pictures.push(new File([(await readFile(file)) as BlobPart], file.split(/[\\/]/).pop() ?? 'image', { type }));
  }
  if (pictures.length) await studio.addImageFiles(pictures);
});

// --- The language -------------------------------------------------------------

/** The studio and the menus in another language, kept; the deck goes on as it was, saved or not. */
function setLocale(next: 'es' | 'en'): void {
  if (next === locale) return;
  locale = next;
  try {
    localStorage.setItem(LOCALE_KEY, next);
  } catch {
    // Not kept: it lasts until the window is closed.
  }
  const deck = studio.deck;
  const wasSaved = !dirty();
  studio.destroy();
  mountStudio(deck);
  if (wasSaved) saved = studio.deck;
  shown = '';
  showTitle();
  void installMenu();
}

// --- Native menu ----------------------------------------------------------------
// On a Mac there is one menu bar for the application: the window in front puts
// its own there. On Windows and Linux each window has its menu.

async function buildMenu(): Promise<Menu> {
  const item = (id: string, text: string, action: () => unknown, accelerator?: string) => MenuItem.new({ id, text, accelerator, action: () => void action() });
  const separator = () => PredefinedMenuItem.new({ item: 'Separator' });
  const app = IS_MAC
    ? [
        await Submenu.new({
          text: 'ReboSlides',
          items: [
            await PredefinedMenuItem.new({ item: { About: { name: 'ReboSlides', version: '0.7.0' } }, text: say('Acerca de ReboSlides', 'About ReboSlides') }),
            await separator(),
            await PredefinedMenuItem.new({ item: 'Hide', text: say('Ocultar ReboSlides', 'Hide ReboSlides') }),
            await PredefinedMenuItem.new({ item: 'HideOthers', text: say('Ocultar otros', 'Hide Others') }),
            await PredefinedMenuItem.new({ item: 'ShowAll', text: say('Mostrar todo', 'Show All') }),
            await separator(),
            await item('quit', say('Salir de ReboSlides', 'Quit ReboSlides'), () => invoke('quit'), 'CmdOrCtrl+Q'),
          ],
        }),
      ]
    : [];
  const file = await Submenu.new({
    text: say('Archivo', 'File'),
    items: [
      await item('new', say('Presentación nueva', 'New presentation'), () => invoke('new_window', { path: null }), 'CmdOrCtrl+N'),
      await item('open', say('Abrir…', 'Open…'), openDialog, 'CmdOrCtrl+O'),
      await separator(),
      await item('save', say('Guardar', 'Save'), saveDeck, 'CmdOrCtrl+S'),
      await item('saveAs', say('Guardar como…', 'Save As…'), saveAs, 'CmdOrCtrl+Shift+S'),
      await item('pdf', say('Exportar como PDF…', 'Export as PDF…'), () => studio.exportPdf()),
      await item('png', say('Exportar diapositiva como PNG…', 'Export slide as PNG…'), () => studio.exportPng()),
      await separator(),
      await item('present', say('Presentar', 'Present'), () => studio.present(), 'CmdOrCtrl+Enter'),
      await separator(),
      await item('close', say('Cerrar ventana', 'Close Window'), () => win.close(), 'CmdOrCtrl+W'),
      ...(IS_MAC ? [] : [await item('quit', say('Salir', 'Quit'), () => invoke('quit'), 'CmdOrCtrl+Q')]),
    ],
  });
  // Cut, copy and paste are the system's on a Mac, which hands them to the page as the keys would.
  const clipboard = IS_MAC
    ? [
        await PredefinedMenuItem.new({ item: 'Cut', text: say('Cortar', 'Cut') }),
        await PredefinedMenuItem.new({ item: 'Copy', text: say('Copiar', 'Copy') }),
        await PredefinedMenuItem.new({ item: 'Paste', text: say('Pegar', 'Paste') }),
      ]
    : [];
  const edit = await Submenu.new({
    text: say('Edición', 'Edit'),
    items: [
      await item('undo', say('Deshacer', 'Undo'), () => studio.undo(), 'CmdOrCtrl+Z'),
      await item('redo', say('Rehacer', 'Redo'), () => studio.redo(), 'CmdOrCtrl+Shift+Z'),
      await separator(),
      ...clipboard,
      await item('duplicate', say('Duplicar', 'Duplicate'), () => studio.duplicate(), 'CmdOrCtrl+D'),
      await item('delete', say('Eliminar', 'Delete'), () => studio.remove()),
    ],
  });
  const view = await Submenu.new({
    text: say('Ver', 'View'),
    items: [
      await item('light', say('Tema claro', 'Light theme'), () => studio.setTheme('light')),
      await item('dark', say('Tema oscuro', 'Dark theme'), () => studio.setTheme('dark')),
      await separator(),
      await item('es', 'Español', () => setLocale('es')),
      await item('en', 'English', () => setLocale('en')),
      ...(IS_MAC ? [await separator(), await PredefinedMenuItem.new({ item: 'Fullscreen', text: say('Pantalla completa', 'Enter Full Screen') })] : []),
    ],
  });
  const window = IS_MAC
    ? [
        await Submenu.new({
          text: say('Ventana', 'Window'),
          items: [await PredefinedMenuItem.new({ item: 'Minimize', text: say('Minimizar', 'Minimize') }), await PredefinedMenuItem.new({ item: 'Maximize', text: 'Zoom' })],
        }),
      ]
    : [];
  return Menu.new({ items: [...app, file, edit, view, ...window] });
}

let menu: Menu | undefined;
async function installMenu(): Promise<void> {
  menu = await buildMenu();
  if (!IS_MAC) await menu.setAsWindowMenu(win);
  else if (await win.isFocused()) await menu.setAsAppMenu();
}
void win.onFocusChanged(({ payload: focused }) => {
  if (focused && IS_MAC) void menu?.setAsAppMenu();
});

showTitle();
void installMenu();
void takeOpened();
