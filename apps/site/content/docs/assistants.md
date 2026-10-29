# AI assistants (MCP)

`@reboslides/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server: Claude, and any other assistant that speaks it, reads and edits decks with it. On `.reboslides` files, or live in a room of the [collaboration server](/docs/collaboration/), where the people in it see every change as it is made.

## Connect it

Claude Code:

```bash
claude mcp add reboslides -- node /path/to/reboslides/packages/mcp/bin/reboslides-mcp.mjs --root ~/decks
```

Claude Desktop, or any client with a `.mcp.json`:

```json
{
  "mcpServers": {
    "reboslides": {
      "command": "node",
      "args": ["/path/to/reboslides/packages/mcp/bin/reboslides-mcp.mjs", "--root", "/Users/me/decks"]
    }
  }
}
```

`--root` is a folder the server may read and write in; it can be given several times. Without one, anywhere.

## What it can do

| Tool | What it does |
| --- | --- |
| `open_deck`, `new_deck`, `save_deck`, `close_deck`, `list_decks` | Files. A new deck can start from the eight slides of a theme. Nothing is written until `save_deck`, which does not write over a file unless told. |
| `join_room` | Works on a deck people have open in the studio, through the collaboration server. |
| `get_overview`, `read_slide`, `find_text` | Reading: every slide in a line, every element of one with its id, where its text is. |
| `add_slide`, `duplicate_slide`, `delete_slide`, `move_slide` | Slides, blank or from a layout of a theme. |
| `set_title`, `set_background`, `set_notes` | The deck, a slide's background (flat or a gradient), its notes. |
| `add_text`, `add_shape`, `set_text`, `format_text` | Text boxes and shapes. |
| `update_element`, `remove_elements`, `arrange`, `align` | Where things are, their size and look, what is on top, lining them up. |
| `undo` | Takes back the tools' last changes. |

Slides go by number or id, elements by the id `read_slide` gives; lengths are points from the top left corner of the slide, colours hex.

## With people in the room {#room}

Share the deck from the studio (see [Collaboration](/docs/collaboration/)), and ask Claude to join: "join room `Ra0WTyPMqI0T` at `http://127.0.0.1:7430` and add a closing slide". It comes in as **Claude**, with its own colour, and what it does appears in everyone's studio.

## In your own code

The tools are plain functions of the engine, with nothing of Node: `TOOLS` from `@reboslides/mcp` runs them on any deck, as the server does.

```ts
import { TOOLS } from '@reboslides/mcp';

const addText = TOOLS.find((tool) => tool.name === 'add_text')!;
const { deck: next, text } = addText.run(deck, { text: 'Hola', x: 80, y: 80, width: 400 });
```
