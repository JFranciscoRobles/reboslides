'use client';

// The studio on the whole window, under the bar Rebodocs' demo has: the name,
// back to the site, the two ways of putting it in a page (the Studio as it
// comes, or an interface of one's own on the headless hooks), what each is,
// and the way to the guide.
//
// With ?collab=<server> it works with other people: Share starts a room on
// that server with the deck, and the address it gives (…&room=<id>) is the
// one to send. Both tabs join the same room.

import { useEffect, useState } from 'react';
import { HeadlessStudio } from '@/components/HeadlessStudio';
import { type LiveRoom, LiveStudio } from '@/components/LiveStudio';
import { LocalLink as Link, useT } from '@/components/i18n';
import type { L } from '@/lib/i18n';

type Tab = 'studio' | 'headless';

const TABS: { id: Tab; label: L; note: L; dot: string }[] = [
  {
    id: 'studio',
    label: { en: 'The included one', es: 'El incluido' },
    note: {
      en: 'The Studio as it comes: the bar, the rail and its panels, the slide, its properties and the pages. The deck is kept in your browser.',
      es: 'El Studio tal cual viene: la barra, el riel y sus paneles, la diapositiva, sus propiedades y las páginas. La presentación se guarda en tu navegador.',
    },
    dot: 'bg-brand',
  },
  {
    id: 'headless',
    label: { en: 'Your own interface', es: 'Tu propia interfaz' },
    note: {
      en: 'Built on the headless hooks of @reboslides/react: SlidesProvider, useSlides, SlidesSurface and SlideThumbnail, with a look of its own.',
      es: 'Hecha con los hooks headless de @reboslides/react: SlidesProvider, useSlides, SlidesSurface y SlideThumbnail, con un aspecto propio.',
    },
    dot: 'bg-pastel-pink-fg',
  },
];

/** The room in the address, when there is one: what the demo works on with the others. */
function roomOfAddress(): { server?: string; room?: LiveRoom } {
  const query = new URLSearchParams(window.location.search);
  const server = query.get('collab') ?? undefined;
  const room = query.get('room') ?? undefined;
  return { server, room: server && room ? { url: server, room, name: query.get('name') ?? undefined } : undefined };
}

export function DemoApp() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('studio');
  const [server, setServer] = useState<string>();
  const [room, setRoom] = useState<LiveRoom>();
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (window.location.hash === '#headless') setTab('headless');
    const found = roomOfAddress();
    setServer(found.server);
    setRoom(found.room);
  }, []);

  const choose = (next: Tab) => {
    setTab(next);
    history.replaceState(null, '', next === 'headless' ? '#headless' : window.location.pathname + window.location.search);
  };

  /** A room on the server with the deck kept here, and its address to send. */
  const share = async () => {
    if (!server) return;
    setSharing(true);
    try {
      const [{ createRoom }, core] = await Promise.all([import('@reboslides/collab/browser'), import('@reboslides/core')]);
      let deck = core.themedDeck(core.THEMES[1], core.DEFAULT_SIZE, t({ en: 'My presentation', es: 'Mi presentación' }));
      try {
        const kept = localStorage.getItem('reboslides:deck');
        if (kept) deck = core.parseDeck(kept);
      } catch {
        // Nothing kept: the deck of the theme.
      }
      const id = await createRoom(server, deck, deck.title);
      const query = new URLSearchParams(window.location.search);
      query.set('room', id);
      history.replaceState(null, '', `${window.location.pathname}?${query}${window.location.hash}`);
      setRoom({ url: server, room: id, name: query.get('name') ?? undefined });
      await navigator.clipboard?.writeText(window.location.href).catch(() => {});
    } finally {
      setSharing(false);
    }
  };

  const current = TABS.find((one) => one.id === tab)!;
  return (
    <div className="flex h-dvh min-h-[560px] flex-col bg-surface text-ink">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-white px-3 py-2 sm:px-4">
        <Link href="/" title={t({ en: 'Back to the site', es: 'Volver al sitio' })} className="flex items-center gap-2 rounded-lg py-1 pr-1 font-display text-[17px] font-bold tracking-tight text-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={24} height={24} />
          <span className="hidden sm:inline">ReboSlides</span>
          <span className="rounded-md bg-hover px-1.5 py-0.5 font-text text-xs font-semibold text-ink-soft">Demo</span>
        </Link>

        {/* The tabs, as a segmented control. */}
        <div role="tablist" aria-label={t({ en: 'Which interface', es: 'Qué interfaz' })} className="order-3 flex w-full rounded-xl bg-surface p-1 sm:order-none sm:w-auto">
          {TABS.map(({ id, label, dot }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => choose(id)}
              className={`flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors sm:flex-none ${
                tab === id ? 'bg-white text-ink shadow-[0_1px_3px_rgba(47,46,43,0.14)]' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <span aria-hidden="true" className={`size-2 rounded-full ${tab === id ? dot : 'bg-border-strong'}`} />
              {t(label)}
            </button>
          ))}
        </div>

        <p className="hidden min-w-0 flex-1 truncate text-sm text-muted lg:block">
          {room ? t({ en: `Shared in room ${room.room}: send this address to work together.`, es: `Compartida en la sala ${room.room}: manda esta dirección para trabajar juntos.` }) : t(current.note)}
        </p>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/docs/" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-hover hover:text-ink md:block">
            {t({ en: 'Docs', es: 'Documentación' })}
          </Link>
          {server && !room ? (
            <button
              type="button"
              onClick={() => void share()}
              disabled={sharing}
              className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              {sharing ? t({ en: 'Sharing…', es: 'Compartiendo…' }) : t({ en: 'Share', es: 'Compartir' })}
            </button>
          ) : (
            <Link href="/docs/getting-started/" className="flex min-h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
              {t({ en: 'Get started', es: 'Empezar' })}
            </Link>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1">{tab === 'studio' ? <LiveStudio whole room={room} className="h-full" /> : <HeadlessStudio collab={room} />}</div>
    </div>
  );
}
