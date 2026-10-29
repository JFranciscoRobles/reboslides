# Ponlo en tu aplicación

`Studio` es el editor completo: la barra, las herramientas, los paneles, la diapositiva, las propiedades y las páginas. No usa framework y se dibuja en el elemento que le das.

```ts
import { Studio } from '@reboslides/editor';

const studio = new Studio(contenedor, opciones);
```

## Opciones {#options}

| Opción | Tipo | Qué hace |
| --- | --- | --- |
| `deck` | `Deck` | La presentación que abre. Sin ella, la guardada en `storageKey`, o una nueva. |
| `storageKey` | `string \| null` | Dónde se guarda la presentación en `localStorage` entre visitas. `'reboslides:deck'` si no se dice; `null` no la guarda en ningún lado. |
| `embedded` | `boolean` | El estudio llena su contenedor en vez de la ventana. El contenedor tiene que estar posicionado y tener altura. Toma las teclas, copiar y pegar solo mientras el foco está dentro. |
| `theme` | `'light' \| 'dark'` | El tema claro o el oscuro. Sin él, el que la persona eligió la última vez, o el del sistema. |
| `onChange` | `(deck: Deck) => void` | Se llama con la presentación cuando los cambios se detienen un momento. Aquí es donde tu aplicación la guarda. |
| `chrome` | `boolean` | `false` para la diapositiva sola, sin la barra, los paneles, las propiedades ni las páginas: para una interfaz propia (mira [Headless](/docs/headless/#vanilla)). |
| `locale` | `'en' \| 'es'` | El idioma del estudio, y del texto de los diseños y temas. El del navegador si se omite. |
| `onLocale` | `(locale) => void` | Si se da, el menú (☰) tiene **Idioma**, y se llama con el elegido: vuelve a montar el estudio en él con la misma presentación. |

## Idiomas {#languages}

El estudio habla inglés y español: su barra, paneles, propiedades, diálogo de descarga y mensajes, y los nombres de temas, formas, tamaños y unidades. Los diseños que agrega también se escriben en el idioma ("Título de tu presentación", "¡Gracias!"). Una presentación ya hecha conserva su propio texto.

```ts
let studio: Studio;
function mount(locale: string, deck?: Deck) {
  studio = new Studio(parent, {
    deck,
    locale,
    onLocale: (next) => {
      const now = studio.deck;
      studio.destroy();
      mount(next, now);
    },
  });
}
mount('es');
```

`studio.language` dice en cuál está, y `studio.t` lo que dice.

## Dentro de una página {#inside-a-page}

Con `embedded`, el estudio es una caja más de tu página:

```html
<div id="studio" style="position: relative; height: 640px"></div>
```

```ts
const studio = new Studio(document.getElementById('studio')!, { embedded: true, storageKey: null });
```

Teclas como Suprimir, las flechas y ⌘Z solo actúan sobre la diapositiva mientras el estudio tiene el foco, así que el resto de la página se desplaza y se escribe como siempre.

## En React {#in-react}

`@reboslides/react` da el estudio como componente, y hooks headless para una interfaz propia: mira [Componente de React](/docs/react/) y [Headless](/docs/headless/).

```tsx
<SlideStudio deck={deck} onChange={save} />
```

## Fuentes {#fonts}

Los temas usan familias de Google Fonts. `googleFontsUrl()` es la hoja de estilos de todas; el estudio mide el texto con una fuente cuando el navegador ya la tiene, y vuelve a maquetarlo cuando una fuente llega tarde.

```ts
import { FONTS, googleFontsUrl } from '@reboslides/editor';
```

Para su propia interfaz el estudio usa la fuente del sistema: no hay nada que cargar.

## Trabajar con él desde código {#working-with-it-from-code}

La presentación del estudio es `studio.deck`. Cámbiala con el motor y devuélvesela con `commit`, que guarda el paso para deshacer:

```ts
import { setBackground, solid } from '@reboslides/core';

studio.commit(setBackground(studio.deck, studio.slide.id, solid('0F172A')));
```

Otras cosas que puedes llamar:

| Miembro | Qué hace |
| --- | --- |
| `deck`, `slide`, `picked` | La presentación, la diapositiva a la vista, los elementos elegidos. |
| `goTo(index)` | Muestra otra diapositiva. |
| `select(ids)` | Elige elementos de la diapositiva a la vista. |
| `undo()`, `redo()` | Un paso atrás o adelante. |
| `present(from?)` | Presenta a pantalla completa. |
| `exportPdf()`, `exportPng()`, `saveFile()` | Descarga el PDF, la diapositiva en PNG o el archivo `.reboslides`. |
| `openFile(file)` | Abre un archivo `.reboslides`. |
| `setTheme(theme)` | Claro u oscuro. |
| `canUndo`, `canRedo` | Si hay un paso que deshacer o rehacer. |
| `on('change' \| 'state', fn)` | Avisa tras cada cambio de la presentación, o de lo que se ve; devuelve con qué detenerlo. |
| `applyRemote(deck)` | Muestra una presentación cambiada por otra persona, sin paso en el historial de esta. |
| `setPeers(peers)` | Dibuja lo que los demás tienen elegido, en sus colores. [Colaboración](/docs/collaboration/) hace ambas cosas. |
| `destroy()` | Saca el estudio de la página. |

## Su aspecto {#its-look}

El estudio se ve como el resto de la suite Rebo, islas sobre un lienzo cálido como en Rebodocs, con un CSS que pone en la página una vez, bajo las clases `rs-` y `sp-`. Sus colores son propiedades personalizadas de `.rs-app`; sobrescríbelas para hacerlo tuyo:

```css
.rs-app,
.rs-app[data-theme='dark'] {
  --accent: #0b57d0;
  --accent-hover: #08398a;
  --accent-subtle: #e8f0fd;
}
```

El tema oscuro pone sus propios valores bajo `.rs-app[data-theme='dark']`, así que una sobrescritura para ambos nombra a los dos.
