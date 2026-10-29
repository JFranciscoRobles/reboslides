// What @reboslides/core promises: the deck, the changes made to it, the text of
// its boxes, the outlines of its shapes, its templates and its file.

export {
  DEFAULT_SIZE,
  type SlideSize,
  type Fill,
  type VerticalAlign,
  type TextElement,
  SHAPE_KINDS,
  type ShapeKind,
  type ShapeElement,
  type ImageElement,
  type Element,
  type Slide,
  type Deck,
  type TextOptions,
  newId,
  solid,
  createSlide,
  createDeck,
  createText,
  createShape,
  createImage,
  copyElement,
  copySlide,
} from './model';
export {
  type Rect,
  type Order,
  type Alignment,
  setTitle,
  setUnit,
  resizeDeck,
  addSlide,
  duplicateSlide,
  deleteSlide,
  moveSlide,
  setBackground,
  setNotes,
  addElements,
  updateElements,
  patchElements,
  removeElements,
  duplicateElements,
  reorderElements,
  alignElements,
  distributeElements,
  resizeGroup,
  boundsOf,
  unionOf,
  toSlide,
  toElement,
  elementAt,
} from './ops';
export { textLayout, textHeight, textOffset, fitText, wholeText, formatAllText, leadingRun, plainTextOf, scaleText } from './text';
export { type PathCommand, shapePath, roundedRect, svgPath, SHAPE_NAMES } from './shapes';
export { type Theme, THEMES, LAYOUTS, type LayoutKind, LAYOUT_NAMES, layoutSlide, themedDeck, untitledDeck, THEME_FONTS } from './templates';
export { type DeckPdfOptions, exportDeckPdf } from './pdf';
export { type SlideSvgOptions, slideSvg } from './svg';
export { type GifFrame, encodeGif } from './gif';
export { parsePages } from './pages';
export { UNITS, type Unit, DEFAULT_UNIT, UNIT_NAMES, UNIT_PRECISION, toUnit, fromUnit, formatLength, type SizePreset, SIZE_PRESETS, presetSize, presetOf } from './units';
export { type PptxOptions, type PptxImport, exportPptx, importPptx } from './pptx';
export { FILE_FORMAT, FILE_VERSION, FILE_EXTENSION, serializeDeck, parseDeck, toJson, fromJson } from './file';
export { type Change, diffDecks, applyChange, applyChanges } from './changes';
