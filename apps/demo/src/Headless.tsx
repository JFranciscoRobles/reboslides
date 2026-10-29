// An interface of one's own, dark and laid out another way, on the headless
// hooks: a column of tools on the left, the slide, the pages below, and the
// properties of what is picked on the right. Nothing of the studio's look.

import { type Deck, type Element, SlideThumbnail, SlidesProvider, SlidesSurface, useSlides } from '@reboslides/react';
import { useState } from 'react';
import { type Locale, say } from './locale';

export function Headless({ deck, onChange, locale }: { deck: Deck; onChange: (deck: Deck) => void; locale: Locale }) {
  const [opened] = useState(deck);
  return (
    <SlidesProvider deck={opened} onChange={onChange} theme="dark" locale={locale}>
      <div className="own">
        <Tools locale={locale} />
        <div className="own-middle">
          <SlidesSurface className="own-surface" />
          <Pages />
        </div>
        <Properties locale={locale} />
      </div>
    </SlidesProvider>
  );
}

function Tools({ locale }: { locale: Locale }) {
  const { state, commands } = useSlides();
  const t = (es: string, en: string) => say(locale, es, en);
  const tools: [string, string, () => void, boolean?][] = [
    ['↶', t('Deshacer', 'Undo'), commands.undo, !state.canUndo],
    ['↷', t('Rehacer', 'Redo'), commands.redo, !state.canRedo],
    ['T', t('Texto', 'Text'), () => commands.addText(t('Una idea', 'An idea'), 40)],
    ['▢', t('Rectángulo', 'Rectangle'), () => commands.addShape('roundRect')],
    ['◯', t('Círculo', 'Circle'), () => commands.addShape('ellipse')],
    ['☆', t('Estrella', 'Star'), () => commands.addShape('star')],
    ['→', t('Flecha', 'Arrow'), () => commands.addShape('arrow')],
    ['⧉', t('Duplicar', 'Duplicate'), commands.duplicate, !state.selection.length],
    ['✕', t('Eliminar', 'Delete'), commands.remove, !state.selection.length],
    ['▶', t('Presentar', 'Present'), commands.present],
  ];
  return (
    <div className="own-tools">
      {tools.map(([glyph, label, run, disabled]) => (
        <button key={label} type="button" title={label} aria-label={label} disabled={disabled} onClick={run}>
          {glyph}
        </button>
      ))}
    </div>
  );
}

function Pages() {
  const { state, commands } = useSlides();
  return (
    <div className="own-pages">
      {state.deck.slides.map((slide, i) => (
        <button key={slide.id} type="button" aria-current={i === state.current} onClick={() => commands.goTo(i)}>
          <SlideThumbnail slide={slide} width={120} />
          <span>{i + 1}</span>
        </button>
      ))}
      <button type="button" className="own-add" onClick={() => commands.addSlide()}>
        +
      </button>
    </div>
  );
}

const COLORS = ['F8FAFC', 'FDE047', '22D3EE', 'A78BFA', 'F472B6', '0F172A'];

/** What is picked: where it is, and for a shape its colour; with nothing picked, the slide's background. */
function Properties({ locale }: { locale: Locale }) {
  const { state, commands } = useSlides();
  const t = (es: string, en: string) => say(locale, es, en);
  const one: Element | undefined = state.picked.length === 1 ? state.picked[0] : undefined;
  const move = (key: 'x' | 'y' | 'width' | 'height', value: number) => commands.change((e) => ({ ...e, [key]: value }));
  return (
    <aside className="own-props">
      <h2>
        {one
          ? one.type === 'text'
            ? t('Texto', 'Text')
            : one.type === 'shape'
              ? t('Forma', 'Shape')
              : t('Imagen', 'Picture')
          : state.picked.length
            ? t(`${state.picked.length} elementos`, `${state.picked.length} elements`)
            : t('Diapositiva', 'Slide')}
      </h2>
      {one && (
        <div className="own-fields">
          {(['x', 'y', 'width', 'height'] as const).map((key) => (
            <label key={key}>
              {key}
              <input type="number" value={Math.round(one[key])} onChange={(event) => move(key, Number(event.target.value))} />
            </label>
          ))}
        </div>
      )}
      <h3>{one?.type === 'shape' ? t('Relleno', 'Fill') : t('Fondo', 'Background')}</h3>
      <div className="own-swatches">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`#${color}`}
            style={{ background: `#${color}` }}
            onClick={() => (one?.type === 'shape' ? commands.change((e) => (e.type === 'shape' ? { ...e, fill: { kind: 'solid', color } } : e)) : commands.setBackground({ kind: 'solid', color }))}
          />
        ))}
      </div>
      <h3>{t('Alinear', 'Align')}</h3>
      <div className="own-row">
        {(['left', 'center', 'right', 'top', 'middle', 'bottom'] as const).map((how) => (
          <button key={how} type="button" disabled={!state.selection.length} onClick={() => commands.align(how)}>
            {how}
          </button>
        ))}
      </div>
      <p className="own-hint">{t('Doble clic en un texto para escribir. Arrastra para mover; las esquinas escalan.', 'Double click a text to write. Drag to move; the corners scale.')}</p>
    </aside>
  );
}
