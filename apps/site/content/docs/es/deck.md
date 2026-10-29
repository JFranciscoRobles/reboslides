# Presentaciones y elementos

Una presentación son datos simples: puedes guardarla como JSON, mandarla por la red y construirla en código. Toda longitud está en **puntos** (1/72 de pulgada), medida desde la esquina superior izquierda de la diapositiva. Los colores son RGB hexadecimal sin `#`.

## La presentación {#the-deck}

```ts
interface Deck {
  title: string;
  size: SlideSize; // { width, height }
  slides: Slide[];
}

interface Slide {
  id: string;
  background: Fill;
  elements: Element[]; // el último queda arriba
  notes?: string;
}
```

`DEFAULT_SIZE` es 16:9 al tamaño que le da PowerPoint: 960 × 540 puntos.

## Tamaño y unidades {#size-and-units}

Una presentación guarda toda longitud en puntos, pero dice en qué unidad se **muestra**: `deck.unit`, una de `'px'`, `'pt'`, `'cm'` o `'in'` (`'px'` si no se dice). Un píxel es 1/96 de pulgada, como en CSS. El estudio muestra y recibe cada posición y tamaño en esa unidad; los tamaños de letra y los grosores de borde siguen en puntos.

```ts
import { formatLength, fromUnit, toUnit, SIZE_PRESETS, presetSize, resizeDeck, setUnit } from '@reboslides/core';

toUnit(810, 'px'); // 1080
fromUnit(21, 'cm'); // 595.3 puntos
formatLength(810, 'px'); // "1080 px"

const historia = SIZE_PRESETS.find((p) => p.id === 'story')!; // 1080 × 1920 px
deck = setUnit(resizeDeck(deck, presetSize(historia)), historia.unit);
```

`SIZE_PRESETS` son las medidas que ofrece el estudio: presentaciones 16:9 y 4:3, Full HD, A4 y Carta en ambas orientaciones, publicaciones cuadrada, 4:5 y 9:16, un banner y una tarjeta de presentación, cada una en la unidad en que se conoce. `presetOf(size)` dice cuál es un tamaño.

## Elementos {#elements}

Todo elemento es una caja, girada sobre su centro:

| Campo | Qué es |
| --- | --- |
| `id` | Su nombre, único en la presentación. |
| `x`, `y`, `width`, `height` | Su caja antes de girarla. |
| `rotation` | Grados, en el sentido de las agujas del reloj. |
| `opacity` | De 0 a 1. |
| `locked` | No se elige desde la diapositiva; se cambia desde la lista de capas. |

Y luego uno de tres tipos:

```ts
interface TextElement {
  type: 'text';
  doc: Doc; // un documento de @rebodocs/core
  verticalAlign: 'top' | 'middle' | 'bottom';
  autoHeight: boolean; // la caja sigue a su texto
}

interface ShapeElement {
  type: 'shape';
  shape: ShapeKind; // 'rect', 'roundRect', 'ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'arrow', 'heart', 'line'
  fill?: Fill;
  stroke?: string;
  strokeWidth: number;
}

interface ImageElement {
  type: 'image';
  src: string; // una URL data:, para que la presentación esté completa en su archivo
  naturalWidth: number;
  naturalHeight: number;
  radius: number; // esquinas redondeadas, en puntos
}
```

Una imagen **cubre** su caja: cuando las proporciones difieren, lo que no cabe se recorta por los lados, como en Canva o Keynote.

## Rellenos {#fills}

```ts
type Fill =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number }; // 0 es de izquierda a derecha, 90 de arriba a abajo
```

`solid('FFFFFF')` hace el primero.

## Crearlos {#making-them}

| Función | Qué crea |
| --- | --- |
| `createDeck(title?, size?)` | Una presentación con una diapositiva blanca vacía. |
| `createSlide(background?, elements?)` | Una diapositiva. |
| `createText(text, box, options?)` | Una caja de texto, un párrafo por cada línea, tan alta como su texto una vez maquetado. `options.run` y `options.paragraph` son el formato de rebodocs; Inter 24 en gris oscuro si no se dice. |
| `createShape(kind, box, look?)` | Una forma; violeta si no se da relleno, una línea oscura para `'line'`. |
| `createImage(src, naturalWidth, naturalHeight, size, box?)` | Una imagen, centrada en una diapositiva de `size` y tan grande como la mitad de ella si no se da caja. |
| `copyElement(element, dx?, dy?)` · `copySlide(slide)` | Copias con nombres nuevos. |
| `newId(prefix?)` | Un nombre nuevo. |

```ts
import { createShape, createText, createSlide, solid } from '@reboslides/core';

const diapositiva = createSlide(solid('0F172A'), [
  createShape('ellipse', { x: 680, y: -80, width: 360, height: 360 }, { fill: solid('1E293B') }),
  createText('Hola', { x: 72, y: 200, width: 600 }, { run: { fontSize: 72, bold: true, color: 'F8FAFC' } }),
]);
```
