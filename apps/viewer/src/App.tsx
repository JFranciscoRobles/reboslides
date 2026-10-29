// @reboslides/viewer as an application uses it: decks only to look at.
//
// - A shelf: the decks, each with its first slide as a thumbnail, made in the
//   page with `slidePicture`.
// - A viewer: one of them opened in `SlidesViewer`, its slides one under
//   another or as a grid, presented full screen or printed.

import { type Deck, THEMES, themedDeck } from '@reboslides/core';
import { slidePicture } from '@reboslides/viewer';
import { SlidesViewer } from '@reboslides/viewer/react';
import { useEffect, useMemo, useState } from 'react';
import { type Locale, LocalePicker, say, useLocale } from '../../demo/src/locale';

const SIZE = { width: 960, height: 540 };
const TITLES = {
  es: ['Plan del trimestre', 'Lanzamiento de otoño', 'Informe anual', 'Noche de producto', 'Taller de verano', 'Cartel del festival'],
  en: ['Plan for the quarter', 'Autumn launch', 'Annual report', 'Product night', 'Summer workshop', 'Festival poster'],
};

function Card({ deck, onOpen, locale }: { deck: Deck; onOpen: () => void; locale: Locale }) {
  const [picture, setPicture] = useState<string>();
  useEffect(() => {
    let gone = false;
    void slidePicture(deck, 0, 360).then((url) => !gone && setPicture(url));
    return () => {
      gone = true;
    };
  }, [deck]);
  return (
    <button type="button" className="card" onClick={onOpen}>
      <span className="thumb">{picture ? <img src={picture} alt="" /> : null}</span>
      <b>{deck.title}</b>
      <small>
        {deck.slides.length} {say(locale, 'diapositivas', 'slides')}
      </small>
    </button>
  );
}

export function App() {
  const [locale, setLocale] = useLocale();
  const t = (es: string, en: string) => say(locale, es, en);
  const shelf = useMemo(() => THEMES.map((theme, i) => themedDeck(theme, SIZE, TITLES[locale][i] ?? theme.name, locale)), [locale]);
  const [own, setOwn] = useState<Deck[]>([]);
  const [open, setOpen] = useState<Deck>();
  const [layout, setLayout] = useState<'slides' | 'grid'>('slides');

  const pick = async (files: FileList | null) => {
    const { parseDeck } = await import('@reboslides/core');
    const read = await Promise.all([...(files ?? [])].map(async (file) => parseDeck(await file.text())));
    setOwn((before) => [...read, ...before]);
    if (read[0]) setOpen(read[0]);
  };

  if (open)
    return (
      <div className="app">
        <header className="bar">
          <button type="button" className="back" onClick={() => setOpen(undefined)}>
            {t('← Estante', '← Shelf')}
          </button>
          <b>{open.title}</b>
          <span className="spacer" />
          <div className="tabs">
            <button type="button" aria-pressed={layout === 'slides'} onClick={() => setLayout('slides')}>
              {t('Una bajo otra', 'One under another')}
            </button>
            <button type="button" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}>
              {t('Todas', 'All')}
            </button>
          </div>
          <LocalePicker locale={locale} onChange={setLocale} />
        </header>
        <main className="stage">
          <SlidesViewer deck={open} layout={layout} locale={locale} />
        </main>
      </div>
    );

  return (
    <div className="app">
      <header className="bar">
        <img src="/logo.svg" alt="" width={24} height={24} />
        <b>ReboSlides</b>
        <span className="badge">{t('Visor', 'Viewer')}</span>
        <span className="spacer" />
        <LocalePicker locale={locale} onChange={setLocale} />
        <label className="open">
          {t('Abrir un .reboslides', 'Open a .reboslides')}
          <input type="file" accept=".reboslides,application/json" multiple hidden onChange={(e) => void pick(e.target.files)} />
        </label>
      </header>
      <main className="shelf">
        {[...own, ...shelf].map((deck, i) => (
          <Card key={`${deck.title}-${i}`} deck={deck} onOpen={() => setOpen(deck)} locale={locale} />
        ))}
      </main>
    </div>
  );
}
