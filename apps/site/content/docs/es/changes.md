# Cambiar una presentación

Ninguna función del motor cambia la presentación que recibe. Cada una devuelve una **presentación nueva**, que comparte lo que no tocó. Así deshace el estudio: guarda la presentación anterior. Y una diapositiva que no cambió es el mismo objeto, así que sabes qué cambió con `===`.

```ts
const siguiente = addElements(deck, slideId, [estrella]);
siguiente === deck; // false
siguiente.slides[1] === deck.slides[1]; // true: solo cambió la primera diapositiva
```

## Diapositivas {#slides}

| Función | Qué hace |
| --- | --- |
| `setTitle(deck, title)` | Cambia el nombre de la presentación. |
| `resizeDeck(deck, size, fit?)` | Da a todas las diapositivas el tamaño `size`. Con `fit` (por defecto), lo que tienen se escala tanto como quepa completo, y se centra; sin él, todo queda donde estaba. |
| `setUnit(deck, unit)` | La unidad en que se muestran sus longitudes. Nada más cambia. |
| `addSlide(deck, index?, slide?)` | Pone una diapositiva en `index`, al final si no se dice; una vacía con el fondo de la anterior si no se da ninguna. |
| `duplicateSlide(deck, slideId)` | Una copia justo después. |
| `deleteSlide(deck, slideId)` | La elimina; la última diapositiva se vacía en su lugar. |
| `moveSlide(deck, from, to)` | Mueve una diapositiva. |
| `setBackground(deck, slideId, fill)` | Su fondo. |
| `setNotes(deck, slideId, notes)` | Sus notas del orador. |

## Elementos {#elements}

| Función | Qué hace |
| --- | --- |
| `addElements(deck, slideId, elements)` | Los pone arriba. |
| `updateElements(deck, slideId, ids, change)` | Cada uno nombrado, cambiado por `change(element)`. |
| `patchElements(deck, slideId, ids, patch)` | Cada uno nombrado, con los campos de `patch`. |
| `removeElements(deck, slideId, ids)` | Los quita. |
| `duplicateElements(deck, slideId, ids, offset?)` | Copias 16 puntos abajo y a la derecha, arriba de todo; devuelve `{ deck, ids }`. |
| `reorderElements(deck, slideId, ids, order)` | `'front'`, `'forward'`, `'backward'` o `'back'`. Una serie de elementos elegidos se mueve junta. |
| `alignElements(deck, slideId, ids, how)` | `'left'`, `'center'`, `'right'`, `'top'`, `'middle'`, `'bottom'`: respecto a la diapositiva para uno, respecto al recuadro que los rodea para varios. |
| `distributeElements(deck, slideId, ids, axis)` | El mismo espacio entre tres o más, a lo ancho (`'x'`) o a lo alto (`'y'`). |
| `resizeGroup(deck, slideId, ids, from, to)` | Cada elemento colocado y dimensionado como el recuadro `from` se vuelve `to`. |

## Escalar un grupo {#scaling-a-group}

`resizeGroup` es lo que hace el estudio cuando se arrastra por un tirador el recuadro de varios. Cada elemento conserva su lugar dentro del recuadro, y sus propios lados crecen tanto como el recuadro a lo largo de ellos; un elemento girado crece a lo largo de sus lados girados. Cuando el recuadro crece igual en ambos sentidos, el texto se agranda con él; si no, solo cambia su caja y el texto se vuelve a maquetar. Una línea conserva su grosor.

```ts
import { boundsOf, resizeGroup, unionOf } from '@reboslides/core';

const elegidos = slide.elements.filter((e) => ids.includes(e.id));
const from = unionOf(elegidos.map(boundsOf));
const mayor = resizeGroup(deck, slide.id, ids, from, { ...from, width: from.width * 2, height: from.height * 2 });
```

## Geometría {#geometry}

| Función | Qué da |
| --- | --- |
| `boundsOf(element)` | El recuadro recto más pequeño que lo contiene, girado como está. |
| `unionOf(rects)` | El recuadro que los contiene a todos. |
| `toSlide(element, x, y)` · `toElement(element, x, y)` | Un punto de la caja propia del elemento en la diapositiva, y de vuelta. |
| `elementAt(slide, x, y, slack?)` | El elemento más alto bajo un punto, sin contar los bloqueados. |
