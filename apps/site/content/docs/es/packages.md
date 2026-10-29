# Paquetes

ReboSlides son seis paquetes, en un repositorio con un playground y este sitio. Ninguno está en npm todavía; se usan desde el repositorio (ver [Primeros pasos](/docs/getting-started/)).

## @reboslides/core {#reboslides-core}

El motor. Sin DOM: corre en el navegador y en Node.

| Parte | Qué exporta |
| --- | --- |
| La presentación | `Deck`, `Slide`, `Element`, `TextElement`, `ShapeElement`, `ImageElement`, `Fill`, `DEFAULT_SIZE`, `SHAPE_KINDS`, `createDeck`, `createSlide`, `createText`, `createShape`, `createImage`, `copyElement`, `copySlide`, `newId`, `solid` |
| Unidades | `UNITS`, `Unit`, `DEFAULT_UNIT`, `UNIT_NAMES`, `toUnit`, `fromUnit`, `formatLength`, `SIZE_PRESETS`, `presetSize`, `presetOf` |
| Cambios | `setTitle`, `setUnit`, `resizeDeck`, `addSlide`, `duplicateSlide`, `deleteSlide`, `moveSlide`, `setBackground`, `setNotes`, `addElements`, `updateElements`, `patchElements`, `removeElements`, `duplicateElements`, `reorderElements`, `alignElements`, `distributeElements`, `resizeGroup`; y como piezas de datos, `diffDecks`, `applyChanges`, `Change` |
| Geometría | `boundsOf`, `unionOf`, `toSlide`, `toElement`, `elementAt` |
| Texto | `textLayout`, `textHeight`, `textOffset`, `fitText`, `formatAllText`, `leadingRun`, `plainTextOf`, `scaleText`, `wholeText` |
| Formas | `shapePath`, `roundedRect`, `svgPath`, `SHAPE_NAMES` |
| Plantillas | `THEMES`, `LAYOUTS`, `LAYOUT_NAMES`, `THEME_FONTS`, `layoutSlide`, `themedDeck`, `untitledDeck` (cada una con un `locale`) |
| Salida | `exportDeckPdf`, `slideSvg`, `encodeGif`, `parsePages`, `serializeDeck`, `parseDeck`, `FILE_FORMAT`, `FILE_VERSION`, `FILE_EXTENSION` |

Depende de `@rebodocs/core` y `fflate`.

## @reboslides/editor {#reboslides-editor}

El estudio para el navegador. Sin framework.

| Exportación | Qué es |
| --- | --- |
| `Studio`, `StudioOptions` | El estudio. Ver [Ponlo en tu aplicación](/docs/studio/). |
| `drawSlide`, `drawElement`, `drawText`, `slideCanvas`, `ImageStore` | El dibujo de una diapositiva en un canvas: lo que usan el estudio, sus miniaturas, presentar y el PNG. |
| `deckPdf` | El PDF de una presentación en el navegador, con sus fuentes descargadas. |
| `FONTS`, `googleFontsUrl`, `loadFonts`, `fontSheets`, `fontFileOf` | Las familias que ofrece, su hoja de estilos, su carga (una vez llegada la hoja de estilos), sus archivos TrueType. |
| `EN`, `ES`, `stringsFor`, `languageOf` | Lo que dice el estudio, en inglés y español. |
| `injectStyles` | Su CSS, puesto en la página una vez. |

Depende de `@reboslides/core`, `@rebodocs/core` y, por su `CanvasMeasurer`, de `@rebodocs/editor`.

## @reboslides/react {#reboslides-react}

El estudio para React. Mira [Componente de React](/docs/react/) y [Headless](/docs/headless/).

| Exporta | Qué es |
| --- | --- |
| `SlideStudio` | El estudio entero como componente. |
| `SlidesProvider`, `SlidesSurface`, `useSlides`, `useSlidesValue`, `SlideThumbnail` | Los hooks headless, para una interfaz propia. |
| `createRoom` y los tipos de una sesión | Para compartir una presentación. |

Depende de `@reboslides/editor`, `@reboslides/collab` y, como peer, de `react` 18 o posterior.

## @reboslides/viewer {#reboslides-viewer}

Una presentación solo para verla, y una diapositiva como imagen. Ver [Visor y miniaturas](/docs/viewer/).

| Entrada | Qué exporta |
| --- | --- |
| `@reboslides/viewer` | `createViewer`, `slidePicture`, `slideCanvas`, `deckOf` |
| `@reboslides/viewer/react` | `SlidesViewer` |

Depende de `@reboslides/core` y `@reboslides/editor`.

## @reboslides/collab {#reboslides-collab}

Trabajar juntos. Mira [Colaboración](/docs/collaboration/).

| Entrada | Qué exporta |
| --- | --- |
| `@reboslides/collab/server` | `createCollabServer`: el servidor de salas, para correrlo solo (`bin/reboslides-collab.mjs`) o dentro de tu servidor de Node. |
| `@reboslides/collab/storage` | `memoryStorage`, `folderStorage`, `backendStorage`: dónde se guardan las presentaciones de las salas. |
| `@reboslides/collab/browser` | `createRoom`, `joinRoom`, `studioHost`: el cliente, en el navegador o en Node. |
| `@reboslides/collab` | El protocolo entre ambos. |

## @reboslides/mcp {#reboslides-mcp}

El servidor para asistentes de IA, `bin/reboslides-mcp.mjs`, y `TOOLS`, sus herramientas como funciones de una presentación. Mira [Asistentes de IA](/docs/assistants/).
