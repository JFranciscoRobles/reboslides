# Estado y hoja de ruta

ReboSlides está en la versión 0.1. Esta página dice qué funciona y qué no, sin rodeos.

## Funciona, con pruebas {#works-with-tests}

- Presentaciones, diapositivas y elementos; cada cambio como una presentación nueva; deshacer y rehacer.
- Mover, redimensionar y girar a mano, guías inteligentes, escalar y estirar un grupo.
- Texto maquetado por el motor de rebodocs, editado en el sitio: cursor, selección, viñetas y números, alineación, interlineado, negrita, cursiva, subrayado, tachado, colores, fuentes.
- Seis temas y ocho diseños; formas, stickers, imágenes con esquinas redondeadas, degradados, opacidad, capas y bloqueo.
- Cualquier tamaño de diapositiva, de una lista o escrito en px, pt, cm o pulgadas, con el contenido escalado para caber.
- Presentar a pantalla completa; descargar en PNG, JPG, PDF estándar o para impresión, SVG, GIF, video o el archivo `.reboslides`.
- Un PDF vectorial con texto seleccionable y sus fuentes dentro, hecho en el navegador o en Node.
- Temas claro y oscuro, con el aspecto de la suite Rebo.
- Un componente de React, y hooks headless para una interfaz propia.
- El estudio en inglés y español, con los diseños escritos en cualquiera de los dos.
- Un visor solo para ver, y miniaturas de diapositivas.
- Colaboración en tiempo real: un servidor de salas, la selección de cada persona dibujada para las demás, deshacer por persona.
- Un servidor MCP para asistentes de IA, en archivos o en vivo en una sala.

Las pruebas del motor corren con `npm test`; el estudio se prueba a mano y en un navegador manejado por Playwright.

## Todavía no {#not-yet}

- **npm.** Los paquetes se usan desde el repositorio.
- **Recortar y filtros** para imágenes; grupos que sigan agrupados; tablas y gráficos.
- **Notas del orador**: se guardan en la presentación, pero el estudio no las muestra ni las edita.
- **PowerPoint.** El motor tiene un lector y un escritor experimentales de `.pptx`; no están validados contra PowerPoint.

## Lo que podría seguir {#what-could-come-next}

1. Publicar los paquetes en npm.
2. Texto escrito por dos personas en la misma caja a la vez: hoy se queda con la caja el último que llega al servidor.
3. Notas del orador visibles y editables en el estudio.
