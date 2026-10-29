# El archivo .reboslides

Una presentación guardada es un archivo JSON con la extensión `.reboslides`. Sus imágenes van dentro como URL `data:`, así que un archivo es la presentación completa: mándalo, guárdalo en una base de datos, ábrelo otra vez.

```json
{
  "format": "reboslides",
  "version": 1,
  "deck": { "title": "…", "size": { "width": 960, "height": 540 }, "slides": [] }
}
```

## Leer y escribir {#reading-and-writing}

```ts
import { parseDeck, serializeDeck } from '@reboslides/core';

const texto = serializeDeck(deck);
const otraVez = parseDeck(texto); // lanza un error que dice por qué, cuando el texto no es una presentación
```

`parseDeck` rechaza un archivo de una versión del formato más nueva de la que conoce el motor, y completa una presentación sin diapositivas o sin tamaño.

## Guardar presentaciones en tu aplicación {#keeping-decks-in-your-app}

El estudio te entrega la presentación en `onChange`; guárdala como guardas lo demás:

```ts
new Studio(elemento, {
  deck: await api.cargarPresentacion(id),
  storageKey: null,
  onChange: (deck) => api.guardarPresentacion(id, serializeDeck(deck)),
});
```

`FILE_FORMAT`, `FILE_VERSION` y `FILE_EXTENSION` son las tres constantes del formato.
