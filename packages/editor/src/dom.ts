// Making elements of the page with less to say.

type Attrs = Record<string, string | number | boolean | undefined | EventListener>;

/** An element with its attributes, `on…` ones as listeners, and its children. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | undefined | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'html') el.innerHTML = String(value);
    else if (key === 'class') el.className = String(value);
    else if (key === 'style') el.style.cssText = String(value);
    else if (key in el && typeof value !== 'string') (el as unknown as Record<string, unknown>)[key] = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) if (child !== undefined && child !== false) el.append(child);
  return el;
}

/** A button that shows an icon and, when given, a word; its name is said to whoever cannot see the icon. */
export function button(icon: string, label: string, onclick: () => void, options: { text?: string; on?: boolean; disabled?: boolean; class?: string } = {}): HTMLButtonElement {
  const b = h('button', {
    type: 'button',
    class: `rsl-btn${options.on ? ' rsl-on' : ''}${options.class ? ` ${options.class}` : ''}`,
    title: label,
    'aria-label': label,
    disabled: options.disabled,
    onclick: () => onclick(),
  });
  b.innerHTML = icon;
  if (options.text) b.append(h('span', { class: 'rsl-btn-text' }, options.text));
  return b;
}

/** A hex colour without '#' as an <input type=color> wants it, and back. */
export const toInput = (color: string) => `#${color.length === 6 ? color : '000000'}`.toLowerCase();
export const fromInput = (value: string) => value.replace('#', '').toUpperCase();

let downloader: ((file: { name: string; blob: Blob }) => void) | undefined;

/**
 * Where the files the studio makes go (the PDF, a picture, the deck as a
 * file) in place of the browser's downloads: what an application with a disk
 * of its own gives, such as a desktop one. Nothing to go back to the browser's.
 */
export function setDownloader(fn: ((file: { name: string; blob: Blob }) => void) | undefined): void {
  downloader = fn;
}

export function download(blob: Blob, name: string): void {
  if (downloader) {
    downloader({ name, blob });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A file name made of a title: what a person reads, without what a file system refuses. */
export function fileName(title: string, extension: string): string {
  return `${title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'presentacion'}${extension}`;
}
