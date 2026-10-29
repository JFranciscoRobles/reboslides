# Qué es ReboSlides

ReboSlides es un estudio de diseño de presentaciones que pones dentro de tu propia aplicación web. La gente coloca texto, formas e imágenes en cualquier parte de una diapositiva, empieza con temas, presenta a pantalla completa y descarga un PDF, sin salir de tu aplicación y sin servidor.

Es hermano de [Rebodocs](https://rebodocs.com): el texto de cada caja de una diapositiva es un documento del motor de rebodocs, maquetado por él. Los párrafos, los tramos, las listas, el interlineado, el cursor y la selección son los de un procesador de textos, medidos con las fuentes de la pantalla.

## Qué obtienes {#what-you-get}

- **Un estudio** (`@reboslides/editor`): la diapositiva dibujada en un canvas, elementos que se mueven, redimensionan y giran a mano con guías inteligentes, grupos que se escalan desde sus esquinas, texto editado en el sitio, paneles de temas, formas, texto y subidas, un panel de propiedades, las páginas abajo, deshacer, presentar y exportar. Sin framework; una clase.
- **Un motor** (`@reboslides/core`): la presentación como datos simples, cada cambio una función que devuelve una presentación nueva, el texto maquetado por `@rebodocs/core`, los contornos de las formas, los temas, el archivo `.reboslides` y un PDF vectorial. Sin DOM: también corre en Node.

## Para quién es {#who-it-is-for}

Aplicaciones donde la gente hace algo para mostrar: una herramienta de propuestas, un generador de reportes, una plataforma de cursos, un CRM que manda una presentación con una cotización. El estudio es el editor; tu aplicación decide dónde se guardan las presentaciones y quién las abre.

## Pruébalo {#try-it}

El [estudio en toda la ventana](/demo/) guarda tu presentación en el navegador. O lee [Primeros pasos](/docs/getting-started/) para correrlo desde el repositorio.

> ReboSlides es joven. Su interfaz está en español por ahora y sus paquetes aún no están en npm. [Estado y hoja de ruta](/docs/status/) dice qué funciona y qué falta.
