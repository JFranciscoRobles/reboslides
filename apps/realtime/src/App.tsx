// Several people on one deck. The page asks the backend which decks there are
// and for a ticket into the room of one, and opens it in the studio with
// `collab`: the rest is the collaboration server's.

import { type Session, SlideStudio, type SlidesCollab } from '@reboslides/react';
import { useCallback, useEffect, useState } from 'react';
import { type Locale, LocalePicker, say, useLocale } from '../../demo/src/locale';

interface DeckRow {
  room: string;
  title: string;
  people: string[];
}

const NAMES = ['Ana', 'Luis', 'Marta', 'Diego', 'Sofía', 'Pablo'];

export function App({ aside }: { aside?: (room: string, name: string, locale: Locale) => React.ReactNode }) {
  const [locale, setLocale] = useLocale();
  const t = (es: string, en: string) => say(locale, es, en);
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [name, setName] = useState(() => localStorage.getItem('realtime:name') ?? NAMES[Math.floor(Math.random() * NAMES.length)]);
  const [collab, setCollab] = useState<SlidesCollab>();
  const [session, setSession] = useState<Session>();

  const refresh = useCallback(() => {
    fetch('/api/decks')
      .then((r) => r.json())
      .then(setDecks, () => {});
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => localStorage.setItem('realtime:name', name), [name]);

  const open = async (room: string) => {
    const answer = (await (await fetch('/api/room', { method: 'POST', body: JSON.stringify({ room, name }) })).json()) as { url: string; room: string; ticket: string };
    setCollab({ url: answer.url, room: answer.room, name, ticket: answer.ticket });
    history.replaceState(null, '', `#${room}`);
  };
  useEffect(() => {
    const room = location.hash.slice(1);
    if (room) void open(room);
    // Only once, with the deck in the address.
  }, []);

  const create = async () => {
    const title = prompt(t('Título de la presentación nueva', 'Title of the new presentation'), t('Presentación sin título', 'Untitled presentation'));
    if (!title) return;
    const { room } = (await (await fetch('/api/decks', { method: 'POST', body: JSON.stringify({ title }) })).json()) as { room: string };
    refresh();
    await open(room);
  };

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <img src="/logo.svg" alt="" width={24} height={24} />
          <b>ReboSlides</b>
          <span className="badge">{t('En vivo', 'Live')}</span>
        </div>
        <LocalePicker locale={locale} onChange={setLocale} />
        <label className="me">
          {t('Tu nombre', 'Your name')}
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <ul className="decks">
          {decks.map((deck) => (
            <li key={deck.room}>
              <button type="button" aria-current={collab?.room === deck.room} onClick={() => void open(deck.room)}>
                <span>{deck.title}</span>
                {deck.people.length > 0 && <small>{deck.people.join(', ')}</small>}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="new" onClick={() => void create()}>
          {t('+ Presentación nueva', '+ New presentation')}
        </button>
        {session && (
          <p className="status">
            {session.state === 'on' ? t('Conectado', 'Connected') : session.state === 'closed' ? `${t('Cerrado', 'Closed')}: ${session.reason}` : t('Conectando…', 'Connecting…')}
            {session.peers.length > 0 && ` · ${t('con', 'with')} ${session.peers.map((p) => p.name).join(', ')}`}
          </p>
        )}
        <p className="hint">
          {t('Abre esta página en otra ventana, con otro nombre, y elige la misma presentación.', 'Open this page in another window, with another name, and choose the same presentation.')}
        </p>
      </aside>
      <main className="main">
        {collab ? (
          <SlideStudio key={`${collab.room}:${collab.name}`} collab={collab} onCollab={(s) => setSession({ ...s } as Session)} theme="light" locale={locale} onLocale={setLocale} />
        ) : (
          <p className="empty">{t('Elige una presentación, o haz una nueva.', 'Choose a presentation, or make a new one.')}</p>
        )}
      </main>
      {collab && aside?.(collab.room, collab.name ?? name, locale)}
    </div>
  );
}
