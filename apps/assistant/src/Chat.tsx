// The chat beside the deck. It keeps the conversation; the backend takes it to
// Claude, who answers by changing the deck in the room: the studio shows it as
// it shows anyone's changes.

import { useEffect, useRef, useState } from 'react';
import { type Locale, say } from '../../demo/src/locale';

interface Line {
  role: 'user' | 'assistant';
  text: string;
  tools?: string[];
}

const IDEAS = {
  es: ['Añade una diapositiva de cierre que dé las gracias', 'Pon todas las diapositivas con fondo azul oscuro', 'Resume la presentación en una diapositiva de agenda al principio'],
  en: ['Add a closing slide that says thank you', 'Give every slide a dark blue background', 'Sum the presentation up in an agenda slide at the start'],
};

export function Chat({ room, locale }: { room: string; locale: Locale }) {
  const t = (es: string, en: string) => say(locale, es, en);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => setLines([]), [room]);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [lines, busy]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const next = [...lines, { role: 'user' as const, text: question.trim() }];
    setLines(next);
    setText('');
    setBusy(true);
    try {
      const response = await fetch('/api/assistant', { method: 'POST', body: JSON.stringify({ room, messages: next.map(({ role, text: said }) => ({ role, text: said })) }) });
      const answer = (await response.json()) as { text: string; tools: string[] };
      setLines([...next, { role: 'assistant', text: answer.text, tools: answer.tools }]);
    } catch (error) {
      setLines([...next, { role: 'assistant', text: `${t('No se pudo', 'It could not be done')}: ${(error as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="chat">
      <h2>Claude</h2>
      <div className="lines">
        {!lines.length && (
          <div className="ideas">
            <p>
              {t(
                'Pídele algo sobre la presentación. Lo que cambie lo verán todos los que están en la sala.',
                'Ask it something about the presentation. Everyone in the room will see what it changes.',
              )}
            </p>
            {IDEAS[locale].map((idea) => (
              <button key={idea} type="button" onClick={() => void ask(idea)}>
                {idea}
              </button>
            ))}
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} className={`line ${line.role}`}>
            {line.text}
            {line.tools && line.tools.length > 0 && <small>{[...new Set(line.tools)].join(' · ')}</small>}
          </div>
        ))}
        {busy && <div className="line assistant busy">{t('Trabajando en la presentación…', 'Working on the presentation…')}</div>}
        <div ref={end} />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(text);
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('Pide un cambio…', 'Ask for a change…')}
          rows={3}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void ask(text))}
        />
        <button type="submit" disabled={busy || !text.trim()}>
          {t('Enviar', 'Send')}
        </button>
      </form>
    </aside>
  );
}
