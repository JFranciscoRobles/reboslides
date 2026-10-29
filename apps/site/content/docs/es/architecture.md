# Cómo funciona

## Tres capas {#three-layers}

1. **El motor de rebodocs** maqueta el texto: dados unos párrafos, un ancho y un medidor, da líneas, cada palabra donde va. También lee y recorta archivos de fuente para el PDF.
2. **El motor de ReboSlides** (`@reboslides/core`) es la presentación: diapositivas de cajas colocadas libremente, cada cambio una función de una presentación a una nueva, los contornos de las formas, los temas, el archivo y el PDF. Una caja de texto contiene un `Doc` de rebodocs.
3. **El estudio** (`@reboslides/editor`) dibuja una presentación y deja que la gente la cambie a mano.

## Un solo dibujo {#one-drawing}

Una diapositiva se dibuja en un canvas con una función, `drawSlide`: su fondo, luego cada elemento en orden, trasladado a su centro y girado. La diapositiva del estudio, las miniaturas, presentar y el PNG son esa función a distintos tamaños. El PDF dibuja lo mismo con los operadores propios de PDF, así que los dos coinciden.

## Lo que va sobre el canvas {#what-goes-over-the-canvas}

Sobre el canvas, en la página, el estudio pone lo que no es parte de la diapositiva: los recuadros de lo elegido, sus tiradores, las guías, el recuadro que se arrastra, el cursor y la selección. Se rehacen cada vez que algo cambia, lo cual es barato: son pocos.

## Cambios y deshacer {#changes-and-undo}

Cada cambio pasa por `commit(next)`, que guarda la presentación anterior. Un gesto (arrastrar, redimensionar, girar) muestra sus presentaciones mientras ocurre y guarda solo aquella de la que partió, así que es un paso. Los cambios del mismo tipo cercanos en el tiempo (letras escritas, un color recorrido) también se juntan en un paso.

Como un cambio nunca toca la presentación que recibe, una diapositiva que no cambió es el mismo objeto. Las miniaturas lo usan para dibujar solo las diapositivas que cambiaron.

## Texto en el sitio {#text-in-place}

Una caja en la que se escribe guarda un cursor y un ancla, posiciones en su `Doc`. Las teclas se vuelven operaciones de rebodocs (`insertText`, `splitParagraph`, `deleteRange`…), y la caja se vuelve a maquetar; su altura sigue a su texto cuando así está configurada. Lo escrito entra en un área de texto oculta, así que los acentos y los métodos de entrada de otros idiomas funcionan como en cualquier lado. El cursor y la selección se dibujan desde el maquetado con `caretRect` y `selectionRects`, y un clic se vuelve una posición con `hitTest`.

## Fuentes {#fonts}

El estudio mide el texto con un canvas, con las fuentes de la página. Una fuente que llega tarde dejaría texto medido con otra, así que el estudio pide cada familia que ofrece y vuelve a maquetar cada caja cuando llega cada una.
