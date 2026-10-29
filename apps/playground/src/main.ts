// The studio on a page of its own, the deck kept in the browser between visits.
// In Spanish or English, as chosen in its menu (or `?lang=en`), and kept.

import { Studio, googleFontsUrl } from '@reboslides/editor';

const LOCALE_KEY = 'reboslides:locale';
const host = document.getElementById('app')!;

function storedLocale(): string | undefined {
  try {
    return localStorage.getItem(LOCALE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

(document.getElementById('fonts') as HTMLLinkElement).href = googleFontsUrl();

let studio: Studio;

/** The studio in a language; mounted again in the one chosen in its menu, with the same deck. */
function mount(locale: string | undefined, deck?: Studio['deck']): void {
  studio = new Studio(host, {
    deck,
    locale,
    onLocale: (next) => {
      try {
        localStorage.setItem(LOCALE_KEY, next);
      } catch {
        // Not kept: it lasts until the page is closed.
      }
      const now = studio.deck;
      studio.destroy();
      mount(next, now);
    },
  });
  document.documentElement.lang = studio.language;
  // Within reach of the console, to try things by hand.
  Object.assign(window, { studio });
}

mount(new URLSearchParams(location.search).get('lang') ?? storedLocale());
