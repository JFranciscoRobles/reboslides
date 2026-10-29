# Asistentes de IA (MCP)

`@reboslides/mcp` es un servidor del [Model Context Protocol](https://modelcontextprotocol.io): Claude, y cualquier otro asistente que lo hable, lee y edita presentaciones con él. En archivos `.reboslides`, o en vivo en una sala del [servidor de colaboración](/docs/collaboration/), donde quienes están ven cada cambio mientras se hace.

## Conéctalo {#connect-it}

Claude Code:

```bash
claude mcp add reboslides -- node /ruta/a/reboslides/packages/mcp/bin/reboslides-mcp.mjs --root ~/presentaciones
```

Claude Desktop, o cualquier cliente con un `.mcp.json`:

```json
{
  "mcpServers": {
    "reboslides": {
      "command": "node",
      "args": ["/ruta/a/reboslides/packages/mcp/bin/reboslides-mcp.mjs", "--root", "/Users/yo/presentaciones"]
    }
  }
}
```

`--root` es una carpeta donde el servidor puede leer y escribir; puede darse varias veces. Sin ninguna, en cualquier lado.

## Qué puede hacer {#what-it-can-do}

| Herramienta | Qué hace |
| --- | --- |
| `open_deck`, `new_deck`, `save_deck`, `close_deck`, `list_decks` | Archivos. Una presentación nueva puede empezar con las ocho diapositivas de un tema. No se escribe nada hasta `save_deck`, que no escribe sobre un archivo salvo que se le diga. |
| `join_room` | Trabaja en una presentación que alguien tiene abierta en el estudio, a través del servidor de colaboración. |
| `get_overview`, `read_slide`, `find_text` | Leer: cada diapositiva en una línea, cada elemento de una con su id, dónde está un texto. |
| `add_slide`, `duplicate_slide`, `delete_slide`, `move_slide` | Diapositivas, en blanco o desde un diseño de un tema. |
| `set_title`, `set_background`, `set_notes` | La presentación, el fondo de una diapositiva (liso o degradado), sus notas. |
| `add_text`, `add_shape`, `set_text`, `format_text` | Cajas de texto y formas. |
| `update_element`, `remove_elements`, `arrange`, `align` | Dónde están las cosas, su tamaño y aspecto, qué va encima, alinearlas. |
| `undo` | Quita los últimos cambios de las herramientas. |

Las diapositivas van por número o id, los elementos por el id que da `read_slide`; las medidas son puntos desde la esquina superior izquierda de la diapositiva, los colores hex.

## Con gente en la sala {#room}

Comparte la presentación desde el estudio (mira [Colaboración](/docs/collaboration/)) y pídele a Claude que entre: "únete a la sala `Ra0WTyPMqI0T` en `http://127.0.0.1:7430` y añade una diapositiva de cierre". Entra como **Claude**, con su propio color, y lo que hace aparece en el estudio de todos.

## En tu propio código {#in-your-own-code}

Las herramientas son funciones del motor, sin nada de Node: `TOOLS` de `@reboslides/mcp` las corre sobre cualquier presentación, como hace el servidor.

```ts
import { TOOLS } from '@reboslides/mcp';

const addText = TOOLS.find((tool) => tool.name === 'add_text')!;
const { deck: next, text } = addText.run(deck, { text: 'Hola', x: 80, y: 80, width: 400 });
```
