# Temas y diseños

Un tema es una paleta y dos fuentes. Un diseño es un tipo de diapositiva. Cada diseño puede hacerse en cada tema, así que los seis temas y ocho diseños son 48 diapositivas listas para usar.

## Temas {#themes}

```ts
interface Theme {
  id: string;
  name: string;
  background: Fill;
  ink: string; // texto
  muted: string; // texto más suave
  accent: string; // lo que destaca
  surface: string; // más tranquilo, detrás de las cosas
  heading: string; // fuente de los títulos
  body: string; // fuente del resto
  headingBold: boolean;
}
```

| Tema | Fuentes | Aspecto |
| --- | --- | --- |
| Minimal | Inter | Blanco, acento azul |
| Vibrante | Poppins | Degradado de violeta a rosa, acento amarillo |
| Editorial | Playfair Display, Lora | Papel, acento café |
| Noche | Space Grotesk, Inter | Azul noche, acento cian |
| Fresco | Montserrat | Menta, acento verde |
| Póster | Bebas Neue, Inter | Amarillo, negro |

`THEME_FONTS` lista cada familia que usan los temas: las que una página tiene que cargar para mostrarlos.

## Diseños {#layouts}

`LAYOUTS` es `['cover', 'titleBody', 'section', 'columns', 'imageText', 'quote', 'bigNumber', 'closing']`: una portada, un título con viñetas, un número de sección, tres columnas, una imagen junto a texto, una cita, un número grande y una diapositiva de cierre.

```ts
import { layoutSlide, themedDeck, THEMES, DEFAULT_SIZE } from '@reboslides/core';

const noche = THEMES.find((t) => t.id === 'noche')!;
const cita = layoutSlide(noche, 'quote', DEFAULT_SIZE); // una diapositiva
const deck = themedDeck(noche, DEFAULT_SIZE, 'Plan de lanzamiento'); // una de cada diseño, en el orden de una charla
```

Una diapositiva hecha con una plantilla es una diapositiva común de elementos comunes: nada la ata a su tema.

## Los tuyos {#your-own}

Un tema son datos: escribe tu propio `Theme` y pásalo a `layoutSlide` o `themedDeck`. Sus fuentes tienen que estar cargadas en la página para que el estudio las mida y las muestre.
