// @reboslides/react as an application uses it. The same deck two ways, in
// two tabs: the whole studio as it comes, in a few lines (StudioTab), and an
// interface of one's own built on the headless hooks (Headless.tsx).

import { type Deck, SlideStudio, THEMES, themedDeck } from '@reboslides/react';
import { useMemo, useState } from 'react';
import { Headless } from './Headless';
import { type Locale, LocalePicker, say, useLocale } from './locale';

type Tab = 'studio' | 'headless';

export function App() {
  const [tab, setTab] = useState<Tab>(location.hash === '#headless' ? 'headless' : 'studio');
  const [locale, setLocale] = useLocale();
  // One deck for both: what is changed in one tab is there in the other. In the language of when the page opened.
  const first = useMemo(() => themedDeck(THEMES[2], { width: 960, height: 540 }, say(locale, 'Plan del trimestre', 'Plan for the quarter'), locale), []);
  const [deck, setDeck] = useState<Deck>(first);
  const choose = (next: Tab) => {
    setTab(next);
    history.replaceState(null, '', next === 'headless' ? '#headless' : location.pathname);
  };
  return (
    <div className="app">
      <header className="bar">
        <img src="/logo.svg" alt="" width={24} height={24} />
        <b>ReboSlides</b>
        <span className="badge">React</span>
        <div className="tabs" role="tablist">
          {(
            [
              ['studio', 'SlideStudio'],
              ['headless', say(locale, 'Tu propia interfaz', 'Your own interface')],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => choose(id)}>
              {label}
            </button>
          ))}
        </div>
        <span className="note">
          {tab === 'studio'
            ? '<SlideStudio deck={deck} onChange={setDeck} />'
            : say(locale, 'SlidesProvider, useSlides, SlidesSurface y SlideThumbnail', 'SlidesProvider, useSlides, SlidesSurface and SlideThumbnail')}
        </span>
        <LocalePicker locale={locale} onChange={setLocale} />
      </header>
      <main className="stage">
        {tab === 'studio' ? <StudioTab deck={deck} onChange={setDeck} locale={locale} onLocale={setLocale} /> : <Headless deck={deck} onChange={setDeck} locale={locale} />}
      </main>
    </div>
  );
}

/** The whole studio: this is all an application writes. */
function StudioTab({ deck, onChange, locale, onLocale }: { deck: Deck; onChange: (deck: Deck) => void; locale: Locale; onLocale: (locale: Locale) => void }) {
  // The deck it opens is the one of when the tab was shown; what changes is told by onChange.
  const [opened] = useState(deck);
  return <SlideStudio deck={opened} onChange={onChange} theme="light" locale={locale} onLocale={onLocale} />;
}
