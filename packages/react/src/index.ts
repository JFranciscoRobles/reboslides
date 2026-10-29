// The API of @reboslides/react: the studio as a React component, or as
// headless hooks for an interface of one's own; collaboration in both.

export { SlideStudio, type SlideStudioProps } from './SlideStudio';
export { type SlidesCommands, SlidesProvider, type SlidesProviderProps, type SlidesState, SlidesSurface, type SlidesSurfaceProps, type UseSlides, useSlides, useSlidesValue } from './headless';
export { SlideThumbnail, type SlideThumbnailProps } from './SlideThumbnail';
export type { SlidesCollab } from './collab';
export { type CollabState, type ClosedReason, type Peer, type Session, createRoom } from '@reboslides/collab/browser';
export { type Deck, type Slide, type Element, type Change, createDeck, themedDeck, THEMES, LAYOUTS, layoutSlide, parseDeck, serializeDeck, diffDecks, applyChanges } from '@reboslides/core';
export { Studio, type StudioOptions, googleFontsUrl } from '@reboslides/editor';
