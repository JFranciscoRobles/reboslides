# Primeros pasos

Los paquetes aún no están publicados en npm, así que ReboSlides se corre desde su repositorio. Necesita Node 22.12 o más nuevo, y el repositorio de [Rebodocs](https://rebodocs.com) al lado, en una carpeta llamada `docs`: de ahí se toma el motor.

## Corre el estudio {#run-the-studio}

```bash
git clone https://github.com/JFranciscoRobles/rebodocs docs
(cd docs && npm install)
git clone https://github.com/JFranciscoRobles/reboslides slides
cd slides
npm install
npm run dev
```

`npm run dev` arranca el playground, el estudio en una página propia, en `http://localhost:5173`. Guarda tu presentación en el navegador entre visitas.

## Los demás comandos {#the-other-commands}

| Comando | Qué hace |
| --- | --- |
| `npm test` | Las pruebas del motor. |
| `npm run typecheck` | TypeScript sobre todos los paquetes. |
| `npm run lint` | Biome sobre los paquetes y las apps. |
| `npm run build` | El playground como archivos estáticos. |
| `npm run site` | Este sitio, en `http://localhost:5198`. |

Y una aplicación para cada forma de usarlo:

| Comando | Qué muestra |
| --- | --- |
| `npm run demo` | El componente de React, y una interfaz propia sobre los hooks headless. |
| `npm run realtime` | Varias personas en una presentación: un backend que guarda las presentaciones y firma tickets, y el servidor de salas. |
| `npm run assistant` | Lo mismo, con Claude en un chat cambiando la presentación compartida mediante las herramientas MCP. |
| `npm run viewer` | Un estante de presentaciones con sus miniaturas, y una abierta para verla, presentarla o imprimirla. |
| `npm run storage` | Presentaciones guardadas en S3 (o una carpeta que hace de bucket), con sus versiones. |
| `npm run desktop` | ReboSlides como aplicación de escritorio con Tauri: `.reboslides` desde el Finder o el Explorador. |

Cada una habla inglés o español: el selector de su barra, o `?lang=en`.

## Ponlo en tu página {#put-it-in-your-page}

El estudio es una clase. Dale un elemento con altura y lo llena:

```ts
import { Studio, googleFontsUrl } from '@reboslides/editor';

const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = googleFontsUrl();
document.head.append(fonts);

const studio = new Studio(document.getElementById('studio')!, {
  embedded: true,
  storageKey: null,
  onChange: (deck) => guardar(deck),
});
```

[Ponlo en tu aplicación](/docs/studio/) recorre cada opción.

## Haz una presentación en código {#make-a-deck-in-code}

El motor son funciones simples sobre datos simples:

```ts
import { addElements, createText, themedDeck, THEMES, DEFAULT_SIZE } from '@reboslides/core';

let deck = themedDeck(THEMES[0], DEFAULT_SIZE, 'Reporte semanal');
const nota = createText('Generado el lunes', { x: 72, y: 470, width: 400 }, { run: { fontSize: 14 } });
deck = addElements(deck, deck.slides[0].id, [nota]);
```

Ábrela en el estudio con `new Studio(elemento, { deck })`.
