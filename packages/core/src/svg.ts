// A slide as SVG: its background, its shapes as paths, its pictures cut to
// their corners and covering their boxes, and its text as text, each run
// where the engine of rebodocs set it. What is vector stays vector, and the
// text can be edited in any program that opens SVG, with the fonts it has.

import { escapeXml, type Fragment, type Layout, type LayoutCache, type Line, type TextMeasurer } from '@rebodocs/core/internal';
import type { Element, Fill, Slide, SlideSize, TextElement } from './model';
import { roundedRect, shapePath, svgPath } from './shapes';
import { textLayout, textOffset } from './text';
import { toUnit } from './units';

export interface SlideSvgOptions {
  measurer: TextMeasurer;
  cache?: LayoutCache;
  layoutOf?(element: TextElement): Layout;
  /** A stylesheet the SVG asks for its fonts from, such as one of Google Fonts. */
  fontsUrl?: string;
}

const n = (v: number) => String(Math.round(v * 100) / 100);
const attr = (v: string) => escapeXml(v).replace(/"/g, '&quot;');

/** The slide as the text of an SVG file, as wide in pixels as it is in the deck, its lengths in points. */
export function slideSvg(slide: Slide, size: SlideSize, options: SlideSvgOptions): string {
  const defs: string[] = [];
  let ids = 0;
  const id = (prefix: string) => `${prefix}${++ids}`;
  const layoutOf = (e: TextElement) => options.layoutOf?.(e) ?? textLayout(e, options.measurer, options.cache);

  /** A fill as an SVG paint: a colour, or a gradient across a box `w` by `h` laid as the canvas lays it. */
  const paint = (fill: Fill, w: number, h: number): string => {
    if (fill.kind === 'solid') return `#${fill.color}`;
    const turn = (fill.angle * Math.PI) / 180;
    const half = (Math.abs(Math.cos(turn)) * w + Math.abs(Math.sin(turn)) * h) / 2;
    const dx = Math.cos(turn) * half;
    const dy = Math.sin(turn) * half;
    const g = id('g');
    defs.push(
      `<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${n(w / 2 - dx)}" y1="${n(h / 2 - dy)}" x2="${n(w / 2 + dx)}" y2="${n(h / 2 + dy)}"><stop offset="0" stop-color="#${fill.from}"/><stop offset="1" stop-color="#${fill.to}"/></linearGradient>`,
    );
    return `url(#${g})`;
  };

  const fragment = (f: Fragment, line: Line): string => {
    if (f.kind !== 'text' || !f.text) return '';
    const parts: string[] = [];
    if (f.props.highlight) parts.push(`<rect x="${n(f.x)}" y="${n(line.baseline - f.ascent)}" width="${n(f.width)}" height="${n(f.ascent + f.descent)}" fill="#${f.props.highlight}"/>`);
    const decoration = [f.props.underline && 'underline', f.props.strike && 'line-through'].filter(Boolean).join(' ');
    parts.push(
      `<text x="${n(f.x)}" y="${n(line.baseline)}" font-family="${attr(f.font.family)}" font-size="${n(f.font.size)}"${f.font.bold ? ' font-weight="bold"' : ''}${f.font.italic ? ' font-style="italic"' : ''}` +
        `${decoration ? ` text-decoration="${decoration}"` : ''}${f.wordSpacing ? ` word-spacing="${n(f.wordSpacing)}"` : ''} fill="#${f.props.color}" xml:space="preserve">${escapeXml(f.text)}</text>`,
    );
    return parts.join('');
  };

  const content = (e: Element): string => {
    if (e.type === 'shape') {
      const d = svgPath(shapePath(e.shape, e.width, e.height));
      const fill = e.fill && e.shape !== 'line' ? paint(e.fill, e.width, e.height) : 'none';
      const stroke = e.stroke && e.strokeWidth > 0 ? ` stroke="#${e.stroke}" stroke-width="${n(e.strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"` : '';
      return `<path d="${d}" fill="${fill}"${stroke}/>`;
    }
    if (e.type === 'image') {
      const clip = id('c');
      defs.push(`<clipPath id="${clip}"><path d="${svgPath(roundedRect(0, 0, e.width, e.height, e.radius))}"/></clipPath>`);
      return `<image href="${attr(e.src)}" width="${n(e.width)}" height="${n(e.height)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>`;
    }
    const layout = layoutOf(e);
    const dy = textOffset(e.verticalAlign, layout.page.height, e.height);
    const runs = layout.lines.flatMap((line) => [line.label ? fragment({ ...line.label, kind: 'text' }, line) : '', ...line.fragments.map((f) => fragment(f, line))]);
    return `<g transform="translate(0 ${n(dy)})">${runs.join('')}</g>`;
  };

  const elements = slide.elements.map((e) => {
    const turn = e.rotation ? ` rotate(${n(e.rotation)} ${n(e.width / 2)} ${n(e.height / 2)})` : '';
    return `<g transform="translate(${n(e.x)} ${n(e.y)})${turn}"${e.opacity < 1 ? ` opacity="${n(e.opacity)}"` : ''}>${content(e)}</g>`;
  });
  const { width: W, height: H } = size;
  const background = `<rect width="${n(W)}" height="${n(H)}" fill="${paint(slide.background, W, H)}"/>`;
  const clip = id('c');
  defs.push(`<clipPath id="${clip}"><rect width="${n(W)}" height="${n(H)}"/></clipPath>`);
  const style = options.fontsUrl ? `<style>@import url("${attr(options.fontsUrl)}");</style>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(toUnit(W, 'px'))}" height="${n(toUnit(H, 'px'))}" viewBox="0 0 ${n(W)} ${n(H)}">` +
    `${style}<defs>${defs.join('')}</defs><g clip-path="url(#${clip})">${background}${elements.join('')}</g></svg>`
  );
}
