# Componente de React

`@reboslides/react` da el estudio como componente, `SlideStudio`: entero, barra, paneles, diapositiva y páginas, como lo muestra [la demo](/demo/). Para una interfaz propia alrededor de la diapositiva, mira [Headless](/docs/headless/).

```tsx
'use client';
import { SlideStudio, type Deck } from '@reboslides/react';

export function Editor({ deck, save }: { deck: Deck; save: (deck: Deck) => void }) {
  return (
    <div style={{ position: 'relative', height: 640 }}>
      <SlideStudio deck={deck} onChange={save} />
    </div>
  );
}
```

No dibuja nada en el servidor: en Next.js va en un componente de cliente, y se monta en el navegador después del primer render. Llena el elemento en que está, que tiene que tener una altura.

## Props {#props}

| Prop | Tipo | Qué hace |
| --- | --- | --- |
| `deck` | `Deck` | La presentación que abre. Una nueva si no se da. Si se da otra, la abre. |
| `onChange` | `(deck: Deck) => void` | Se llama con la presentación cuando los cambios se detienen un momento: donde tu aplicación la guarda. |
| `theme` | `'light' \| 'dark'` | El tema claro u oscuro; sigue a la prop. |
| `locale` | `'en' \| 'es'` | El idioma del estudio. Otro lo vuelve a montar en él, con la presentación tal como está. |
| `onLocale` | `(locale) => void` | Si se da, el menú (☰) ofrece el idioma, y se llama con el elegido: pon `locale` en él. |
| `storageKey` | `string \| null` | Dónde guardar la presentación en `localStorage` entre visitas. En ningún lado si no se da. |
| `collab` | `{ url, room, name?, ticket? }` | Trabaja en la presentación con otras personas. Mira [Colaboración](/docs/collaboration/). |
| `onCollab` | `(session) => void` | Le dice cómo va la colaboración y quién está en la sala. |
| `onReady` | `(studio) => void` | El `Studio` una vez que está, y nada cuando se va. |
| `className`, `style` | | Del elemento que llena. |

La ref es el propio `Studio`, con todo lo que lista [Ponlo en tu aplicación](/docs/studio/#working-with-it-from-code):

```tsx
const studio = useRef<Studio>();
<SlideStudio ref={studio} deck={deck} />;
studio.current?.exportPdf();
```

## Fuentes {#fonts}

Los temas usan familias de Google Fonts. Pon su hoja de estilos en la página una vez:

```tsx
import { googleFontsUrl } from '@reboslides/react';

<link rel="stylesheet" href={googleFontsUrl()} />;
```
