# Headless: tu propia interfaz

El estudio tiene su propia barra, paneles y páginas. Cuando tu aplicación debe verse como ella misma, `@reboslides/react` da la diapositiva sola y hooks con qué mostrar y qué hacer: tú dibujas el resto. [La demo](/demo/#headless) tiene una interfaz hecha así, en unas cien líneas.

```tsx
'use client';
import { SlideThumbnail, SlidesProvider, SlidesSurface, useSlides } from '@reboslides/react';

export function MiEditor({ deck, save }) {
  return (
    <SlidesProvider deck={deck} onChange={save}>
      <MiBarra />
      <div style={{ display: 'flex', height: 600 }}>
        <MisPaginas />
        <SlidesSurface style={{ flex: 1 }} />
      </div>
    </SlidesProvider>
  );
}

function MiBarra() {
  const { state, commands } = useSlides();
  return (
    <div>
      <button onClick={commands.undo} disabled={!state.canUndo}>Deshacer</button>
      <button onClick={() => commands.addText('Tu idea aquí', 40)}>Texto</button>
      <button onClick={() => commands.addShape('star')}>Estrella</button>
      <button onClick={commands.remove} disabled={!state.selection.length}>Eliminar</button>
      <button onClick={commands.present}>Presentar</button>
    </div>
  );
}

function MisPaginas() {
  const { state, commands } = useSlides();
  return state.deck.slides.map((slide, i) => (
    <button key={slide.id} onClick={() => commands.goTo(i)} aria-current={i === state.current}>
      <SlideThumbnail slide={slide} width={140} />
    </button>
  ));
}
```

La diapositiva de la superficie se sigue editando a mano: los elementos se mueven, se redimensionan, giran y se eligen con el puntero, el texto se escribe en su sitio, y las teclas del estudio funcionan mientras tiene el foco.

## SlidesProvider {#provider}

Guarda la presentación. Todo lo que usa los hooks va dentro.

| Prop | Tipo | Qué hace |
| --- | --- | --- |
| `deck` | `Deck` | La presentación con que empieza; si se da otra, la abre. |
| `onChange` | `(deck: Deck) => void` | Se llama con la presentación cuando los cambios se detienen un momento. |
| `theme` | `'light' \| 'dark'` | Los colores de la superficie alrededor de la diapositiva. |
| `locale` | `'en' \| 'es'` | El idioma de los diseños que agrega y de lo que dice. |
| `collab` | `{ url, room, name?, ticket? }` | Trabaja en la presentación con otras personas. Mira [Colaboración](/docs/collaboration/). |

## SlidesSurface {#surface}

Donde se dibuja y edita la diapositiva: una por proveedor. Acepta `className` y `style`, y el tamaño que le den: algo tiene que darle una altura. Hasta que está en la página, los hooks dan una presentación vacía y comandos que no hacen nada.

## useSlides {#use-slides}

`const { state, commands, studio } = useSlides()`. El componente se dibuja de nuevo cuando cambia el estado. `useSlidesValue((state) => state.canUndo)` toma un solo valor.

### state {#state}

| Campo | Qué es |
| --- | --- |
| `deck`, `slide`, `current` | La presentación, la diapositiva que se ve y su lugar. |
| `selection`, `picked` | Los ids elegidos en la diapositiva y los elementos que son. |
| `editing` | Si se está escribiendo en una caja de texto. |
| `canUndo`, `canRedo` | Si hay un paso que deshacer o rehacer. |
| `theme` | `'light'` o `'dark'`. |
| `collab` | Con `collab`: `state`, `peers`, `color`, `name` y los cambios `pending`. |

### commands {#commands}

| Comando | Qué hace |
| --- | --- |
| `undo()`, `redo()` | Un paso atrás o adelante: de esta persona, en una presentación compartida. |
| `goTo(index)`, `select(ids)` | Muestra una diapositiva; elige elementos en ella. |
| `addSlide(slide?)`, `duplicateSlide(id?)`, `deleteSlide(id?)`, `moveSlide(from, to)` | Las diapositivas. `layoutSlide` hace una desde un tema. |
| `setBackground(fill, everySlide?)`, `setTitle(title)` | La presentación. |
| `addText(text, size?)`, `addShape(kind)`, `addImages(files)` | Algo nuevo en medio de la diapositiva, elegido. |
| `remove()`, `duplicate()`, `reorder(order)`, `align(how)`, `distribute(axis)` | Lo elegido. |
| `change(fn)` | Cada elemento elegido convertido en `fn(element)`, como un paso del historial. |
| `present()`, `exportPdf()`, `exportPng()`, `saveFile()`, `openFile(file)` | Presentar y archivos. |
| `setTheme(theme)` | Claro u oscuro. |

`studio` es el propio `Studio`, para todo lo demás: `studio.commit(deck)` toma una presentación cambiada con el motor como un paso.

## SlideThumbnail {#thumbnail}

Una diapositiva en pequeño, como la dibuja el estudio, para una lista de páginas: `<SlideThumbnail slide={slide} width={140} />`. Dentro de un proveedor comparte las fuentes y las imágenes de la superficie, y se dibuja de nuevo cuando cambia su diapositiva.

## Sin React {#vanilla}

Lo mismo viene con la clase: `new Studio(parent, { chrome: false, embedded: true })` dibuja la diapositiva sola, `studio.on('state', fn)` avisa tras cada cambio de lo que se ve, y `studio.on('change', fn)` tras cada cambio de la presentación.
