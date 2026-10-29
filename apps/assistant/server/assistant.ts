// Claude in the room: a chat beside a shared deck, whose answers are made with
// the tools of @reboslides/mcp on the deck itself. For each room, the
// assistant comes in as one more person, "Claude", through the collaboration
// server; what its tools change is sent as anyone's changes are, so everyone
// in the room sees it happen. The API key stays here, in the backend.
//
//   POST /api/assistant   { room, messages: [{ role, text }] }  →  { text, tools: [names] }

import type { IncomingMessage, ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { type Session, joinRoom } from '@reboslides/collab/browser';
import { type Deck, createDeck } from '@reboslides/core';
import { TOOLS } from '@reboslides/mcp';

const MODEL = process.env.ASSISTANT_MODEL ?? 'claude-opus-5-5';
const EFFORT = (process.env.ASSISTANT_EFFORT ?? 'medium') as 'low' | 'medium' | 'high';

const SYSTEM = `You work on a slide deck that is open in the ReboSlides studio, beside the people who ask. Your tools read and change that deck, and what you change appears at once in the studio of everyone in the room.

Start from get_overview when you do not know the deck yet; read_slide gives the ids of the elements the other tools take. Slides go by number from 1; lengths are points from the top left corner of the slide (get_overview says its size); colours are hex as "2563EB". Keep the look of the deck: its fonts, colours and the way its slides are laid out. New slides can come from a layout of the deck's theme (add_slide), their texts replaced with set_text.

Answer in the language the person writes in. Say briefly what you did; do not describe the slides back.`;

/** The deck as Claude has it in a room, and the session that keeps it in step with the others'. */
interface Seat {
  deck: Deck;
  session: Session;
  listeners: Set<() => void>;
  ready: Promise<void>;
}

export interface AssistantOptions {
  /** Where the collaboration server is, from this process. */
  collabUrl: string;
  /** A ticket into a room, under a name: the backend's own. */
  ticket: (room: string, name: string) => string;
}

export function createAssistant(options: AssistantOptions) {
  const seats = new Map<string, Seat>();
  const client = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? new Anthropic() : undefined;

  /** Claude's seat in a room: joined the first time it is asked there, kept while the process runs. */
  function seat(room: string): Seat {
    const there = seats.get(room);
    if (there && there.session.state !== 'closed') return there;
    let resolve: () => void = () => {};
    const ready = new Promise<void>((done) => {
      resolve = done;
    });
    const made: Seat = { deck: createDeck(), session: undefined as unknown as Session, listeners: new Set(), ready };
    made.session = joinRoom(
      room,
      {
        deck: () => made.deck,
        setDeck: (deck) => {
          made.deck = deck;
          resolve();
        },
        onChange: (fn) => {
          made.listeners.add(fn);
          return () => made.listeners.delete(fn);
        },
      },
      { url: options.collabUrl, name: 'Claude', ticket: options.ticket(room, 'Claude'), batch: 0 },
    );
    seats.set(room, made);
    return made;
  }

  async function answer(room: string, messages: { role: 'user' | 'assistant'; text: string }[]): Promise<{ text: string; tools: string[] }> {
    if (!client) return { text: 'Falta la clave de la API de Claude: pon ANTHROPIC_API_KEY en apps/assistant/.env y arranca de nuevo.', tools: [] };
    const here = seat(room);
    await Promise.race([here.ready, new Promise((r) => setTimeout(r, 8000))]);
    const used: string[] = [];
    // Each tool of the MCP server, run on the room's deck: what it changes goes to the others at once.
    const tools = TOOLS.map((tool) =>
      betaTool({
        name: tool.name,
        description: tool.description,
        inputSchema: { type: 'object', properties: tool.properties, required: tool.required ?? [] } as { type: 'object' },
        run: (args) => {
          used.push(tool.name);
          try {
            const result = tool.run(here.deck, args as Record<string, unknown>);
            if (tool.writes && result.deck && result.deck !== here.deck) {
              here.deck = result.deck;
              for (const fn of here.listeners) fn();
            }
            return result.text;
          } catch (error) {
            return `Error: ${(error as Error).message}`;
          }
        },
      }),
    );
    const final = await client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: EFFORT },
      // A request a safeguard declines is run again on the model it routes to, in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      tools,
      messages: messages.map((m) => ({ role: m.role, content: m.text })),
      max_iterations: 30,
    });
    if (final.stop_reason === 'refusal') return { text: 'Claude no pudo ayudar con eso.', tools: used };
    const text = final.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
    return { text: text || 'Hecho.', tools: used };
  }

  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    if (request.url !== '/api/assistant' || request.method !== 'POST') return false;
    const parts: Buffer[] = [];
    for await (const part of request) parts.push(part as Buffer);
    try {
      const { room, messages } = JSON.parse(Buffer.concat(parts).toString('utf8')) as { room: string; messages: { role: 'user' | 'assistant'; text: string }[] };
      const result = await answer(room, messages);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(result));
    } catch (error) {
      const message = error instanceof Anthropic.APIError ? `La API de Claude dijo ${error.status}: ${error.message}` : (error as Error).message;
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ text: message, tools: [] }));
    }
    return true;
  };
}
