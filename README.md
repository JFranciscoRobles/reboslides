# ReboSlides

Un estudio de diseño de presentaciones en el navegador, con la interfaz de
la suite Rebo (claro y oscuro): diapositivas con texto, formas e imágenes
colocadas libremente, temas y plantillas, presentación a pantalla completa y
exportación a PDF vectorial y PNG.

El texto de cada caja lo maqueta **el motor de [rebodocs](../docs)**: los
mismos párrafos, listas, fuentes y medidas que un DOCX, puestos al ancho de la
caja con `layoutContinuous`. El cursor, la selección y el punto bajo el puntero
salen de ese mismo maquetado (`caretRect`, `selectionRects`, `hitTest`), y la
edición usa sus operaciones (`insertText`, `splitParagraph`, `deleteRange`,
`applyRunProps`, `toggleList`…). Lo propio de las diapositivas (posiciones,
giros, formas, imágenes, capas, plantillas) es de ReboSlides.

## Paquetes

| Paquete | Qué es |
| --- | --- |
| `@reboslides/core` | El motor, sin DOM: la presentación y sus diapositivas, los elementos y sus cambios (inmutables, incluido escalar un grupo), el texto maquetado por `@rebodocs/core`, el contorno de las formas, los temas, el PDF vectorial y el archivo `.reboslides`. |
| `@reboslides/editor` | El estudio, sin framework: la diapositiva dibujada en canvas, mover, redimensionar (también en grupo) y girar con guías de alineación, edición de texto en el sitio, panel de recursos, panel de propiedades, tira de páginas, deshacer, presentar y exportar. |
| `@reboslides/react` | El estudio como componente de React (`SlideStudio`), o hooks headless para una interfaz propia (`SlidesProvider`, `useSlides`, `SlidesSurface`, `SlideThumbnail`). |
| `@reboslides/collab` | Colaboración en tiempo real: el servidor de salas (`bin/reboslides-collab.mjs`), su cliente y los cambios entre ambos (`diffDecks`/`applyChanges` del core). Cada quien ve la selección de los demás y deshace solo lo suyo. |
| `@reboslides/mcp` | Un servidor MCP (`bin/reboslides-mcp.mjs`) para que Claude y otros asistentes lean y editen presentaciones, en archivos o en vivo en una sala. |
| `@reboslides/playground` | La aplicación donde se prueba todo. |

Y las aplicaciones de ejemplo que usan esos paquetes:

| App | Qué muestra | |
| --- | --- | --- |
| `apps/demo` | El paquete de React: `SlideStudio`, y una interfaz propia hecha con los hooks headless. | `npm run demo` · :5191 |
| `apps/realtime` | Varias personas en una presentación: la página, un backend que guarda las presentaciones y firma tickets, y el servidor de salas. | `npm run realtime` · :5192 |
| `apps/assistant` | Lo mismo con Claude en un chat, que edita con las herramientas del MCP y todos lo ven. Pide `ANTHROPIC_API_KEY`. | `npm run assistant` · :5193 |

`@rebodocs/core` y `@rebodocs/editor` (de este último solo su `CanvasMeasurer`)
se enlazan desde `../docs` con `file:`; todo lo que el editor usa de rebodocs
pasa por `packages/editor/src/engine.ts`.

## PDF

El PDF es vectorial: fondos, degradados, formas, giros y transparencias como
dibujo, y el texto como texto, seleccionable y buscable. Las fuentes van dentro,
reducidas a las letras usadas, leídas y recortadas con `parseTrueType` y
`subsetTrueType` de rebodocs; el editor descarga sus `.ttf` de Fontsource. Una
caja con letras que ninguna fuente tiene (un emoji) va como imagen.

## Uso

```sh
npm install
npm run dev        # el playground
npm test           # pruebas del core
npm run typecheck
npm run lint
```

```ts
import { Studio, googleFontsUrl } from '@reboslides/editor';

document.querySelector<HTMLLinkElement>('#fonts')!.href = googleFontsUrl();
new Studio(document.getElementById('app')!, { storageKey: 'mi-app:deck' });
```

## Colaboración

```sh
node packages/collab/bin/reboslides-collab.mjs --port 7430   # salas guardadas en ./rooms
```

```tsx
<SlideStudio deck={deck} collab={{ url: 'http://127.0.0.1:7430', room, name: 'Ana' }} />
```

En el sitio: `/demo/?collab=http://127.0.0.1:7430`, **Compartir**, y la dirección que da en otra ventana.

## Asistentes (MCP)

```sh
claude mcp add reboslides -- node /ruta/a/slides/packages/mcp/bin/reboslides-mcp.mjs --root ~/presentaciones
```

## Atajos

| | |
| --- | --- |
| Doble clic / Enter | Editar el texto |
| Esc | Salir del texto · deseleccionar |
| ⌘Z · ⇧⌘Z | Deshacer · rehacer |
| ⌘D | Duplicar |
| ⌘C · ⌘X · ⌘V | Copiar, cortar, pegar (también imágenes y texto de fuera) |
| Flechas (⇧ ×10) | Mover |
| ⌘B · ⌘I · ⌘U | Negrita, cursiva, subrayado |
| Alt al arrastrar | Sin guías |
| ⇧ al girar | De 15 en 15 grados |
| Esquina de un grupo | Escalarlo entero (⇧ para estirarlo) |
| ⌘ + rueda | Zoom |
