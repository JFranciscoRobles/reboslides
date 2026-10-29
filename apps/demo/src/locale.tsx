// The language of the example applications: Spanish or English, as chosen in
// their bar or in the studio's menu (or `?lang=en`), kept for the next visit.
// The demos take it from here, so that each says the same in the same way.

import { useEffect, useState } from 'react';

export type Locale = 'es' | 'en';

const KEY = 'reboslides:locale';

function first(): Locale {
  let kept: string | null = null;
  try {
    kept = localStorage.getItem(KEY);
  } catch {
    // Nowhere to keep it: the browser's language.
  }
  const asked = new URLSearchParams(location.search).get('lang') ?? kept ?? navigator.language;
  return asked.toLowerCase().startsWith('en') ? 'en' : 'es';
}

/** The language chosen, and how to choose another: kept, and set on the page. */
export function useLocale(): [Locale, (next: Locale) => void] {
  const [locale, setLocale] = useState<Locale>(first);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const choose = (next: Locale) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Not kept: it lasts until the page is closed.
    }
    setLocale(next);
  };
  return [locale, choose];
}

/** What to say in the language: `say(locale, 'Hola', 'Hello')`. */
export const say = (locale: Locale, es: string, en: string): string => (locale === 'en' ? en : es);

/** Two buttons, ES and EN, for the bar of a demo. */
export function LocalePicker({ locale, onChange }: { locale: Locale; onChange: (next: Locale) => void }) {
  return (
    <div role="radiogroup" aria-label={say(locale, 'Idioma', 'Language')} style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 11, background: '#f3f1ec' }}>
      {(['es', 'en'] as const).map((one) => (
        <button
          key={one}
          type="button"
          role="radio"
          aria-checked={locale === one}
          onClick={() => onChange(one)}
          style={{
            height: 26,
            padding: '0 10px',
            border: 0,
            borderRadius: 8,
            background: locale === one ? '#fff' : 'none',
            boxShadow: locale === one ? '0 1px 2px rgba(47,46,43,.14)' : 'none',
            font: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            color: locale === one ? '#6741d9' : '#5f5d58',
            cursor: 'pointer',
          }}
        >
          {one.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
