// The studio as a React component: the whole of it, bar, panels, slide and
// pages, given a deck. It renders nothing on the server; it is mounted in the
// browser, after the first render.
//
//   <div style={{ height: 640, position: 'relative' }}>
//     <SlideStudio deck={deck} onChange={save} collab={{ url, room, name }} />
//   </div>

import type { Session } from '@reboslides/collab/browser';
import type { Deck } from '@reboslides/core';
import { Studio, type StudioOptions } from '@reboslides/editor';
import { type CSSProperties, createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { type SlidesCollab, connect } from './collab';

export interface SlideStudioProps extends Omit<StudioOptions, 'embedded' | 'onChange' | 'chrome'> {
  /** Called with the deck once changes to it have stopped for a moment: where an application saves it. */
  onChange?: (deck: Deck) => void;
  /** Called with the studio once it is there, and with nothing when it is gone. */
  onReady?: (studio: Studio | undefined) => void;
  /** Works on the deck with other people, in a room of the collaboration server. */
  collab?: SlidesCollab;
  /** Told the state of the collaboration and the people in the room, as they change. */
  onCollab?: (session: Session) => void;
  className?: string;
  /** The element takes the size of what it is in: something must give it a height. */
  style?: CSSProperties;
}

/**
 * The deck is opened again when the deck given is another one; the theme
 * follows its prop; another `locale` mounts the studio again in it, with the
 * deck as it is; the room is joined again when it changes. Without
 * `storageKey` the deck is kept nowhere but where `onChange` puts it.
 */
export const SlideStudio = forwardRef<Studio | undefined, SlideStudioProps>(function SlideStudio(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [studio, setStudio] = useState<Studio>();
  /** The deck given the last time the studio was made, and the one it had when it was taken down. */
  const given = useRef<{ deck: Deck | undefined; last?: Deck }>({ deck: undefined });

  useEffect(() => {
    if (!host.current) return;
    const { deck, storageKey = null, theme, locale, onLocale } = latest.current;
    // Mounted again for another language: the deck goes on as it was.
    const start = given.current.deck === deck && given.current.last ? given.current.last : deck;
    given.current = { deck };
    const made = new Studio(host.current, {
      deck: start,
      storageKey,
      theme,
      locale,
      onLocale: onLocale && ((next) => latest.current.onLocale?.(next)),
      embedded: true,
      onChange: (d) => latest.current.onChange?.(d),
    });
    setStudio(made);
    return () => {
      given.current.last = made.deck;
      made.destroy();
      setStudio(undefined);
    };
  }, [props.deck, props.locale]);

  useEffect(() => {
    if (studio && props.theme) studio.setTheme(props.theme);
  }, [studio, props.theme]);

  const { url, room, name, ticket } = props.collab ?? {};
  useEffect(() => {
    if (!studio || !url || !room) return;
    return connect(studio, { url, room, name, ticket }, (session) => latest.current.onCollab?.(session));
  }, [studio, url, room, name, ticket]);

  useImperativeHandle(ref, () => studio, [studio]);
  useEffect(() => {
    latest.current.onReady?.(studio);
  }, [studio]);

  return createElement('div', { ref: host, className: props.className, style: { position: 'relative', height: '100%', ...props.style } });
});
