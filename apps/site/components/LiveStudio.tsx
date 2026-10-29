'use client';

// The studio itself, not a picture of it: loaded in the browser once the page
// is there, mounted in the box this draws, and taken down with the page. On
// the landing page it lives inside a box and keeps nothing; on /demo/ it has
// the window under the bar of the demo and keeps the deck for the next visit.
// It speaks the language of the page; on /demo/ its menu has the choice of
// language, which goes to the demo in the other one with the same deck.

import { useEffect, useRef } from 'react';
import { useLocale, useT } from '@/components/i18n';
import { localize } from '@/lib/i18n';

/** A stylesheet put in the page once. */
function stylesheet(href: string): void {
  if (document.querySelector(`link[href="${CSS.escape(href)}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}

export interface LiveRoom {
  url: string;
  room: string;
  name?: string;
}

/** With `room`, the deck of a room of the collaboration server, worked on with whoever else is in it. */
export function LiveStudio({ whole = false, className = '', room }: { whole?: boolean; className?: string; room?: LiveRoom }) {
  const box = useRef<HTMLDivElement>(null);
  const t = useT();
  const locale = useLocale();
  const title = t({ en: 'My presentation', es: 'Mi presentación' });

  useEffect(() => {
    let gone = false;
    let studio: { destroy(): void } | undefined;
    let leave: (() => void) | undefined;
    Promise.all([import('@reboslides/editor'), import('@reboslides/core'), import('@reboslides/collab/browser')]).then(([editor, core, collab]) => {
      if (gone || !box.current) return;
      stylesheet(editor.googleFontsUrl());
      // A room's deck is the server's to keep.
      const storageKey = whole && !room ? 'reboslides:deck' : null;
      let kept = false;
      try {
        kept = !!storageKey && !!localStorage.getItem(storageKey);
      } catch {
        // Nothing kept, or nowhere to keep it: a new deck.
      }
      const deck = kept ? undefined : core.themedDeck(core.THEMES[1], core.DEFAULT_SIZE, title, locale);
      const made = new editor.Studio(box.current, {
        deck,
        storageKey,
        embedded: true,
        theme: whole ? undefined : 'light',
        locale,
        onLocale: whole
          ? (next) => {
              // The deck as it is now, for the demo in the other language to open.
              if (storageKey)
                try {
                  localStorage.setItem(storageKey, core.serializeDeck(made.deck));
                } catch {
                  // Nowhere to keep it: the other page starts from its own deck.
                }
              window.location.assign(`${localize('/demo/', next)}${window.location.search}${window.location.hash}`);
            }
          : undefined,
      });
      studio = made;
      if (room) {
        const session = collab.joinRoom(room.room, collab.studioHost(made), { url: room.url, name: room.name });
        leave = () => session.leave();
      }
    });
    return () => {
      gone = true;
      leave?.();
      studio?.destroy();
    };
  }, [whole, title, locale, room?.url, room?.room, room?.name]);

  return (
    <div ref={box} className={`relative ${className}`}>
      <p className="absolute inset-0 m-0 flex items-center justify-center text-sm text-muted">{t({ en: 'Loading the studio…', es: 'Cargando el estudio…' })}</p>
    </div>
  );
}
