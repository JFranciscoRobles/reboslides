// A slide drawn on a canvas: its background, then each element, last on top,
// turned about its centre. The same drawing is the slide in the studio, its
// thumbnail in the strip, the slide presented and the picture exported.
// Lengths are points: the canvas is scaled to the pixels it has.

import { type Layout, type LayoutCache, type TextMeasurer, cssFontFamily, type FontSpec, type Fragment, type Line } from './engine';
import {
  type Element,
  type Fill,
  type ImageElement,
  type PathCommand,
  type ShapeElement,
  type Slide,
  type SlideSize,
  type TextElement,
  roundedRect,
  shapePath,
  textLayout,
  textOffset,
} from '@reboslides/core';

/** The canvas font of `font`, sized in the units of a canvas scaled to points. */
export function canvasFont(font: FontSpec): string {
  return `${font.italic ? 'italic ' : ''}${font.bold ? 'bold ' : ''}${font.size}px ${cssFontFamily(font.family, font.eastAsia)}`;
}

/** The pictures of a deck, decoded once each; `onLoad` is called when one has come, to draw again. */
export class ImageStore {
  private images = new Map<string, HTMLImageElement>();
  constructor(private onLoad: () => void) {}

  get(src: string): HTMLImageElement | undefined {
    let image = this.images.get(src);
    if (!image) {
      image = new Image();
      image.onload = () => this.onLoad();
      image.src = src;
      this.images.set(src, image);
    }
    return image.complete && image.naturalWidth ? image : undefined;
  }

  /** Settles when every picture of the slides is ready to draw. */
  async ready(slides: Slide[]): Promise<void> {
    const sources = slides.flatMap((s) => s.elements.filter((e): e is ImageElement => e.type === 'image').map((e) => e.src));
    await Promise.all(
      sources.map((src) => {
        this.get(src);
        return this.images
          .get(src)!
          .decode()
          .catch(() => undefined);
      }),
    );
  }
}

export interface DrawContext {
  measurer: TextMeasurer;
  images: ImageStore;
  cache?: LayoutCache;
  /** Layouts already made for text elements, by element: the editing one's, kept by the studio. */
  layoutOf?: (element: TextElement) => Layout;
  /** An element not drawn: one being edited in a way the canvas is not the place for. */
  skip?: string;
  /** The slide drawn without its background: a PNG that lets what is under it show. */
  transparent?: boolean;
}

export function fillStyle(ctx: CanvasRenderingContext2D, fill: Fill, width: number, height: number): string | CanvasGradient {
  if (fill.kind === 'solid') return `#${fill.color}`;
  const turn = (fill.angle * Math.PI) / 180;
  // The gradient runs across the whole box at its angle: from corner to corner when it is diagonal.
  const half = (Math.abs(Math.cos(turn)) * width + Math.abs(Math.sin(turn)) * height) / 2;
  const dx = Math.cos(turn) * half;
  const dy = Math.sin(turn) * half;
  const gradient = ctx.createLinearGradient(width / 2 - dx, height / 2 - dy, width / 2 + dx, height / 2 + dy);
  gradient.addColorStop(0, `#${fill.from}`);
  gradient.addColorStop(1, `#${fill.to}`);
  return gradient;
}

/** A CSS background for a fill: what a swatch shows. */
export function cssFill(fill: Fill): string {
  return fill.kind === 'solid' ? `#${fill.color}` : `linear-gradient(${fill.angle + 90}deg, #${fill.from}, #${fill.to})`;
}

function tracePath(ctx: CanvasRenderingContext2D, commands: PathCommand[]): void {
  ctx.beginPath();
  for (const c of commands) {
    if (c.op === 'M') ctx.moveTo(c.x, c.y);
    else if (c.op === 'L') ctx.lineTo(c.x, c.y);
    else if (c.op === 'C') ctx.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else ctx.closePath();
  }
}

function drawShape(ctx: CanvasRenderingContext2D, e: ShapeElement): void {
  tracePath(ctx, shapePath(e.shape, e.width, e.height));
  if (e.fill && e.shape !== 'line') {
    ctx.fillStyle = fillStyle(ctx, e.fill, e.width, e.height);
    ctx.fill();
  }
  if (e.stroke && e.strokeWidth > 0) {
    ctx.strokeStyle = `#${e.stroke}`;
    ctx.lineWidth = e.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function drawImage(ctx: CanvasRenderingContext2D, e: ImageElement, images: ImageStore): void {
  ctx.save();
  tracePath(ctx, roundedRect(0, 0, e.width, e.height, e.radius));
  ctx.clip();
  const image = images.get(e.src);
  if (image) {
    // The picture covers its box, as much of it cut off as its proportions do not fit.
    const scale = Math.max(e.width / image.naturalWidth, e.height / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    ctx.drawImage(image, (e.width - w) / 2, (e.height - h) / 2, w, h);
  } else {
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(0, 0, e.width, e.height);
  }
  ctx.restore();
}

function drawFragment(ctx: CanvasRenderingContext2D, f: Fragment, line: Line, measurer: TextMeasurer): void {
  if (f.kind !== 'text' || !f.text) return;
  const top = line.baseline - f.ascent;
  if (f.props.highlight) {
    ctx.fillStyle = `#${f.props.highlight}`;
    ctx.fillRect(f.x, top, f.width, f.ascent + f.descent);
  }
  ctx.font = canvasFont(f.font);
  ctx.fillStyle = `#${f.props.color}`;
  if (f.wordSpacing) {
    // A justified line: each word where the layout put it, the spaces between them wider.
    let x = f.x;
    for (const piece of f.text.split(/(?<= )/)) {
      ctx.fillText(piece, x, line.baseline);
      x += measurer.width(piece, f.font) + (piece.endsWith(' ') ? f.wordSpacing : 0);
    }
  } else ctx.fillText(f.text, f.x, line.baseline);
  const thick = Math.max(1, f.font.size / 16);
  ctx.strokeStyle = `#${f.props.color}`;
  ctx.lineWidth = thick;
  if (f.props.underline) {
    ctx.beginPath();
    ctx.moveTo(f.x, line.baseline + thick * 1.5);
    ctx.lineTo(f.x + f.width, line.baseline + thick * 1.5);
    ctx.stroke();
  }
  if (f.props.strike) {
    ctx.beginPath();
    ctx.moveTo(f.x, line.baseline - f.font.size * 0.3);
    ctx.lineTo(f.x + f.width, line.baseline - f.font.size * 0.3);
    ctx.stroke();
  }
}

export function drawText(ctx: CanvasRenderingContext2D, e: TextElement, layout: Layout, measurer: TextMeasurer): void {
  ctx.textBaseline = 'alphabetic';
  // Text is drawn kerned as it was measured: not at all.
  if ('fontKerning' in ctx) ctx.fontKerning = 'none';
  const dy = textOffset(e.verticalAlign, layout.page.height, e.height);
  ctx.translate(0, dy);
  for (const line of layout.lines) {
    if (line.label) drawFragment(ctx, { ...line.label, kind: 'text' }, line, measurer);
    for (const f of line.fragments) drawFragment(ctx, f, line, measurer);
  }
}

export function drawElement(ctx: CanvasRenderingContext2D, e: Element, dc: DrawContext): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, e.opacity));
  ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
  ctx.rotate((e.rotation * Math.PI) / 180);
  ctx.translate(-e.width / 2, -e.height / 2);
  if (e.type === 'shape') drawShape(ctx, e);
  else if (e.type === 'image') drawImage(ctx, e, dc.images);
  else drawText(ctx, e, dc.layoutOf?.(e) ?? textLayout(e, dc.measurer, dc.cache), dc.measurer);
  ctx.restore();
}

/** The slide drawn into the whole of `ctx`'s canvas, `scale` pixels to the point. */
export function drawSlide(ctx: CanvasRenderingContext2D, slide: Slide, size: SlideSize, scale: number, dc: DrawContext): void {
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, size.width, size.height);
  if (!dc.transparent) {
    ctx.fillStyle = fillStyle(ctx, slide.background, size.width, size.height);
    ctx.fillRect(0, 0, size.width, size.height);
  }
  ctx.beginPath();
  ctx.rect(0, 0, size.width, size.height);
  ctx.clip();
  for (const e of slide.elements) if (e.id !== dc.skip) drawElement(ctx, e, dc);
  ctx.restore();
}

/** A canvas with the slide drawn on it, `width` pixels wide. */
export function slideCanvas(slide: Slide, size: SlideSize, width: number, dc: DrawContext): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const scale = width / size.width;
  canvas.width = Math.round(width);
  canvas.height = Math.round(size.height * scale);
  drawSlide(canvas.getContext('2d')!, slide, size, scale, dc);
  return canvas;
}
