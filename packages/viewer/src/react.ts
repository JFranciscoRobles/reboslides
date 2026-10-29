// A deck to look at, as a component of React: an element, and the viewer
// mounted in it once the page is in the browser, again for another deck, and
// taken away with the component. On the server it draws the empty element.

import { type CSSProperties, type ReactNode, createElement, useEffect, useRef } from 'react';
import { type Viewer, type ViewerLayout, type ViewerSource, createViewer } from './viewer';

export interface SlidesViewerProps {
  /** The deck: one of the engine, the text of a .reboslides file, or its bytes. */
  deck: ViewerSource;
  layout?: ViewerLayout;
  /** False to leave out the bar floating over the slides. */
  bar?: boolean;
  locale?: string;
  className?: string;
  /** The element takes the height of what it is in: something must give it one. */
  style?: CSSProperties;
  /** Called with the viewer once it is there, to present or print, and with nothing when it is gone. */
  onReady?: (viewer: Viewer | undefined) => void;
}

export function SlidesViewer({ deck, layout, bar, locale, className, style, onReady }: SlidesViewerProps): ReactNode {
  const element = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | undefined>(undefined);
  const ready = useRef(onReady);
  ready.current = onReady;

  // biome-ignore lint/correctness/useExhaustiveDependencies: mounted again for another deck, bar or language; the layout follows below
  useEffect(() => {
    if (!element.current) return;
    const mounted = createViewer(element.current, deck, { layout, bar, locale });
    viewer.current = mounted;
    ready.current?.(mounted);
    return () => {
      ready.current?.(undefined);
      viewer.current = undefined;
      mounted.destroy();
    };
  }, [deck, bar, locale]);

  useEffect(() => {
    if (layout && viewer.current && viewer.current.layout !== layout) viewer.current.setLayout(layout);
  }, [layout]);

  return createElement('div', { ref: element, className, style: { height: '100%', overflow: 'auto', ...style } });
}
