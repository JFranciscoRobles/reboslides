# Texto, maquetado por rebodocs

El texto de una caja no es una cadena: es un `Doc` de [`@rebodocs/core`](https://rebodocs.com/docs/packages/), los mismos párrafos y tramos que tiene un documento de Word. ReboSlides lo maqueta con el motor de rebodocs a lo ancho de la caja, como una página sin márgenes.

Por eso una caja de texto tiene párrafos de verdad, viñetas y números, interlineado, alineación y justificado, y por eso el cursor, la selección y el punto bajo el puntero coinciden con lo dibujado: todo sale de un mismo maquetado.

## Maquetarlo {#laying-it-out}

```ts
import { textLayout, textHeight, fitText } from '@reboslides/core';

const layout = textLayout(caja, measurer); // líneas, cada una con sus fragmentos, en coordenadas de la caja
const alto = textHeight(layout);
const ajustada = fitText(caja, measurer); // la caja tan alta como su texto, cuando autoHeight
```

Un **medidor** dice qué tan ancho es un texto y qué tan altas son sus líneas. En el navegador el estudio usa `CanvasMeasurer` de `@rebodocs/editor`, que mide con las fuentes de la página. En Node, `FontMeasurer` de `@rebodocs/core` mide con archivos de fuente:

```ts
import { FontMeasurer, readFont } from '@rebodocs/core';

const measurer = new FontMeasurer([readFont(await readFile('Inter-Regular.ttf'))!]);
```

## Formato {#formatting}

El formato es el de rebodocs: `RunProps` (`fontFamily`, `fontSize`, `bold`, `italic`, `underline`, `strike`, `color`, `highlight`…) y `ParagraphProps` (`align`, `lineHeight`, `spacingBefore`, `spacingAfter`, sangrías…).

| Función | Qué hace |
| --- | --- |
| `formatAllText(box, run?, paragraph?)` | Da el mismo formato a todo el texto de una caja, también a los párrafos vacíos. |
| `leadingRun(box)` | El formato de su primera letra. |
| `scaleText(doc, k)` | Cada tamaño del texto `k` veces mayor: tamaños, espaciado, sangrías. |
| `plainTextOf(box)` | Su texto, una línea por párrafo. |
| `wholeText(box)` | El rango de su inicio a su fin. |
| `textOffset(align, height, boxHeight)` | Qué tan abajo queda el texto en una caja más alta. |

Para una parte del texto, usa las operaciones de rebodocs sobre `box.doc`: `insertText`, `deleteRange`, `splitParagraph`, `applyRunProps`, `setParagraphProps`, `toggleList`. El estudio edita el texto exactamente con estas.

```ts
import { applyRunProps, toggleList } from '@rebodocs/core';

const doc = toggleList(applyRunProps(caja.doc, rango, { bold: true }), 0, caja.doc.paragraphs.length - 1, 'bullet');
```
