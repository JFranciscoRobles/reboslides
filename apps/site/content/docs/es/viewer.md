# Visor y miniaturas

`@reboslides/viewer` muestra una presentación solo para verla: sus diapositivas una bajo otra o en cuadrícula, con una barra para presentar a pantalla completa e imprimir, una diapositiva por página. Y una diapositiva como imagen, para una miniatura. Para un gestor de archivos, una vista previa, una página que muestra una presentación: donde se ve y no se hace.

## Sin framework {#vanilla}

```ts
import { createViewer } from '@reboslides/viewer';

const viewer = createViewer(element, deck, { layout: 'slides', locale: 'es' }); // una presentación, o un .reboslides como texto o bytes
viewer.setLayout('grid');
viewer.present(0);
viewer.print();
viewer.destroy();
```

`bar: false` quita su barra, cuando presentar e imprimir son de tu aplicación.

## En React {#react}

```tsx
import { SlidesViewer } from '@reboslides/viewer/react';

<SlidesViewer deck={deck} layout="grid" locale="es" style={{ height: 520 }} />
```

## Miniaturas {#thumbnails}

```ts
import { slideCanvas, slidePicture } from '@reboslides/viewer';

const url = await slidePicture(deck, 0, 320);   // la primera diapositiva, un data URL PNG de 320 px de ancho
const canvas = await slideCanvas(deck, 2, 640); // la tercera, en un canvas
```

Esperan a las imágenes de la diapositiva y a sus fuentes, así que una miniatura se dibuja con las familias de la propia presentación. ReboFiles dibuja con él sus miniaturas de presentaciones.
