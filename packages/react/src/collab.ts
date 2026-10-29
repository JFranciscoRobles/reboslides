// Working with other people on the deck of a Studio, for the component and
// the hooks alike: a session joined while the options say so, left when they
// change or the studio goes.

import { type Session, joinRoom, studioHost } from '@reboslides/collab/browser';
import type { Studio } from '@reboslides/editor';

export interface SlidesCollab {
  /** Where the collaboration server is. */
  url: string;
  /** The room of the deck: what `createRoom` gave, or the id the system the deck belongs to keeps it by. */
  room: string;
  /** What the others see this person as. */
  name?: string;
  /** What the system the deck belongs to gave this person to show they may edit it. */
  ticket?: string;
}

/** Joins the room with `studio`; what it returns leaves it. `onChange` hears the state and the people in it. */
export function connect(studio: Studio, collab: SlidesCollab, onChange: (session: Session) => void): () => void {
  let session: Session | undefined;
  session = joinRoom(collab.room, studioHost(studio), { url: collab.url, name: collab.name, ticket: collab.ticket, onChange: () => session && onChange(session) });
  onChange(session);
  return () => session?.leave();
}
