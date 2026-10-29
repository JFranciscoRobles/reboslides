# PDF

El PDF de una presentación se dibuja como lo dibuja el canvas, pero en vectores:

- fondos y degradados como rellenos y sombreados;
- cada forma como su contorno;
- imágenes recortadas a sus esquinas redondeadas;
- cada elemento girado y con la transparencia que tiene;
- **el texto como texto**, en sus fuentes, así que se puede seleccionar, buscar y copiar.

Las fuentes van dentro del archivo, reducidas a las letras que usa la presentación, con lo que representa cada letra. Las lee y las recorta el lector de TrueType de rebodocs (`parseTrueType`, `subsetTrueType`).

## Desde el estudio {#from-the-studio}

**Descargar → PDF** lo hace en el navegador. El estudio descarga de [Fontsource](https://fontsource.org) los archivos TrueType de las fuentes que usa la presentación y decodifica las imágenes. Una caja de texto con letras que ninguna de esas fuentes tiene (un emoji) entra como una imagen de sí misma, así se ve como en pantalla.

Desde código: `studio.exportPdf()` lo descarga; `deckPdf(deck, { measurer, images, layoutOf })` de `@reboslides/editor` devuelve sus bytes.

## Desde Node {#from-node}

`exportDeckPdf` de `@reboslides/core` no usa el DOM. Dale un medidor y los archivos de fuente:

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { FontMeasurer, readFont } from '@rebodocs/core';
import { exportDeckPdf } from '@reboslides/core';

const caras = await Promise.all(['Inter-Regular.ttf', 'Inter-Bold.ttf'].map(async (f) => readFont(await readFile(f))!));
const measurer = new FontMeasurer(caras);

const pdf = exportDeckPdf(deck, {
  measurer,
  font: ({ family, bold }) => caras.find((f) => f.family === family && f.bold === bold)?.bytes,
  title: deck.title,
});
await writeFile('presentacion.pdf', pdf);
```

## Opciones {#options}

| Opción | Qué es |
| --- | --- |
| `measurer` | El medidor con que se maquetó el texto: cada palabra va donde él dice. |
| `font(face)` | El archivo TrueType de `{ family, bold, italic }`. Sin él, la variante regular se engrosa o se inclina a mano; sin ninguna, el texto va en la fuente estándar más cercana que todo lector tiene (Helvetica, Times, Courier). |
| `image(src)` | Una imagen de la presentación, decodificada: `{ width, height, jpeg }` o `{ width, height, rgb, alpha }`. |
| `picture(box)` | Una caja de texto como imagen, para letras que ninguna fuente dada tiene. |
| `layoutOf(box)` | Maquetados ya hechos, para no hacerlos otra vez. |
| `title` | El título que muestran los lectores; el de la presentación si no se da. |
| `bleed` | Los puntos que el fondo se extiende más allá de cada borde, para cortarse; 3 mm son 8,5 puntos. |
| `cropMarks` | Líneas en un margen alrededor de cada diapositiva, donde hay que cortar. |

Con `bleed` o `cropMarks`, cada página se agranda para contenerlos y dice dónde se corta (`TrimBox`) y dónde termina su sangrado (`BleedBox`), como lo leen las imprentas.

Una página mide lo que una diapositiva, una página por diapositiva.
