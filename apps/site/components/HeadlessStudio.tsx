'use client';

// An interface of one's own around the slide, made with the headless hooks of
// @reboslides/react and nothing of the studio's look: a bar, the pages down
// the left, the slide. What a page that wants ReboSlides to look like itself
// writes; its source is the example the documentation gives.

import { type SlidesCollab, SlideThumbnail, SlidesProvider, SlidesSurface, THEMES, themedDeck, useSlides } from '@reboslides/react';
import { useMemo } from 'react';
import { useLocale, useT } from '@/components/i18n';

const SWATCHES = ['FFFFFF', 'F7F6F3', 'FDE047', 'A7F3D0', 'C7D2FE', '0F172A'];

const tool = 'flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink transition-colors hover:bg-hover disabled:cursor-default disabled:opacity-40';

function Bar() {
  const { state, commands } = useSlides();
  const t = useT();
  const picked = state.selection.length > 0;
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-white p-1.5 shadow-[0_1px_2px_rgba(47,46,43,0.05)]">
      <button type="button" className={tool} disabled={!state.canUndo} onClick={commands.undo} title={t({ en: 'Undo', es: 'Deshacer' })}>
        ↶
      </button>
      <button type="button" className={tool} disabled={!state.canRedo} onClick={commands.redo} title={t({ en: 'Redo', es: 'Rehacer' })}>
        ↷
      </button>
      <i className="mx-1 h-5 w-px bg-border" />
      <button type="button" className={tool} onClick={() => commands.addText(t({ en: 'Your idea here', es: 'Tu idea aquí' }), 40)}>
        T {t({ en: 'Text', es: 'Texto' })}
      </button>
      <button type="button" className={tool} onClick={() => commands.addShape('roundRect')}>
        ▢
      </button>
      <button type="button" className={tool} onClick={() => commands.addShape('ellipse')}>
        ◯
      </button>
      <button type="button" className={tool} onClick={() => commands.addShape('star')}>
        ☆
      </button>
      <i className="mx-1 h-5 w-px bg-border" />
      <button type="button" className={tool} disabled={!picked} onClick={() => commands.reorder('front')}>
        {t({ en: 'To front', es: 'Al frente' })}
      </button>
      <button type="button" className={tool} disabled={!picked} onClick={commands.remove}>
        {t({ en: 'Delete', es: 'Eliminar' })}
      </button>
      <i className="mx-1 h-5 w-px bg-border" />
      {SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`#${color}`}
          onClick={() => commands.setBackground({ kind: 'solid', color })}
          className="size-6 cursor-pointer rounded-full border border-border-strong transition-transform hover:scale-110"
          style={{ background: `#${color}` }}
        />
      ))}
      <span className="ml-auto flex items-center gap-2 pr-1">
        {state.collab && <People />}
        <button type="button" className={`${tool} bg-brand text-white hover:bg-brand-hover`} onClick={commands.present}>
          ▶ {t({ en: 'Present', es: 'Presentar' })}
        </button>
      </span>
    </div>
  );
}

/** Who else is in the room, by the colours the server gave out. */
function People() {
  const { state } = useSlides();
  const collab = state.collab!;
  return (
    <span className="flex items-center" title={collab.state}>
      {[{ name: collab.name, color: collab.color, client: 'me' }, ...collab.peers].map((peer) => (
        <span
          key={peer.client}
          title={peer.name}
          className="-ml-1.5 inline-flex size-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white first:ml-0"
          style={{ background: `#${peer.color || '9B9890'}` }}
        >
          {peer.name.slice(0, 1).toUpperCase()}
        </span>
      ))}
    </span>
  );
}

function Pages() {
  const { state, commands } = useSlides();
  const t = useT();
  return (
    <ol className="m-0 flex w-44 flex-none list-none flex-col gap-2 overflow-y-auto p-0">
      {state.deck.slides.map((slide, i) => (
        <li key={slide.id}>
          <button
            type="button"
            onClick={() => commands.goTo(i)}
            className={`flex w-full cursor-pointer items-start gap-2 rounded-xl p-1.5 text-left text-xs text-muted transition-colors ${i === state.current ? 'bg-brand-light text-brand' : 'hover:bg-hover'}`}
          >
            <span className="w-4 pt-1 text-right font-semibold">{i + 1}</span>
            <SlideThumbnail slide={slide} width={132} className="rounded-md shadow-[0_0_0_1px_var(--color-border)]" />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() => commands.addSlide()}
          className="w-full cursor-pointer rounded-xl border border-dashed border-border-strong py-3 text-sm text-muted hover:border-brand hover:text-brand"
        >
          + {t({ en: 'Slide', es: 'Diapositiva' })}
        </button>
      </li>
    </ol>
  );
}

export function HeadlessStudio({ collab }: { collab?: SlidesCollab }) {
  const t = useT();
  const locale = useLocale();
  // A deck of the "Vibrante" theme to start, in the language of the page; in a room, the room's.
  const deck = useMemo(() => themedDeck(THEMES[1], { width: 960, height: 540 }, t({ en: 'My presentation', es: 'Mi presentación' }), locale), [t, locale]);
  return (
    <SlidesProvider deck={deck} theme="light" collab={collab} locale={locale}>
      <div className="flex h-full min-h-0 flex-col gap-3 p-3">
        <Bar />
        <div className="flex min-h-0 flex-1 gap-3">
          <Pages />
          <SlidesSurface className="flex-1 overflow-hidden rounded-2xl border border-border" />
        </div>
      </div>
    </SlidesProvider>
  );
}
