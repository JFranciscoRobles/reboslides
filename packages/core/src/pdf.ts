// A deck as a PDF drawn the way the canvas draws it, but in vectors: the
// backgrounds and their gradients, each shape as its outline, pictures cut to
// their corners, every element turned and as transparent as it is, and the
// text as text, in the fonts it is set in, put in the file cut down to the
// letters it uses and with what each one stands for, so that it can be
// selected, searched and copied. The fonts are read and cut by the engine of
// rebodocs; the rest of the file is written here, page by page, after the way
// rebodocs writes its own.
//
// The page is drawn upside down, from its top left corner as a slide is
// measured; text and pictures are turned back up where they are drawn.

import { type FontSpec, type Fragment, type Layout, type LayoutCache, type Line, type PdfImage, type TextMeasurer, type TrueType, parseTrueType, subsetTrueType } from '@rebodocs/core/internal';
import { zlibSync } from 'fflate';
import type { Deck, Element, Fill, ImageElement, ShapeElement, TextElement } from './model';
import { type PathCommand, roundedRect, shapePath } from './shapes';
import { textLayout, textOffset } from './text';

export interface DeckPdfOptions {
  /** The measurer the text was laid out with: each word goes where it says. */
  measurer: TextMeasurer;
  cache?: LayoutCache;
  /** The layouts already made of text elements: the editor's, so as not to make them again. */
  layoutOf?(element: TextElement): Layout;
  /** The TrueType file of a face, to put in the PDF; without one, the text is set in the nearest standard font every reader has. */
  font?(spec: { family: string; bold: boolean; italic: boolean }): Uint8Array | undefined;
  /** A picture of the deck, by its source, decoded. */
  image?(src: string): PdfImage | undefined;
  /** The element drawn as a picture as big as its box, for text with letters no font given has, such as emoji. */
  picture?(element: TextElement): PdfImage | undefined;
  title?: string;
  /**
   * For a print shop: how far, in points, the background runs past the edges
   * of each slide, to be cut off. Three millimetres (8.5 points) is the usual.
   */
  bleed?: number;
  /** Lines in the margin of each page where it is to be cut: the page is made larger to hold them. */
  cropMarks?: boolean;
}

/** The room crop marks take beyond the bleed, and how far from it they start. */
const MARK_ROOM = 18;
const MARK_GAP = 3;

const latin1 = (text: string) => Uint8Array.from(text, (ch) => ch.charCodeAt(0) & 0xff);
const num = (value: number) => (Math.round(value * 1000) / 1000).toString();
const hex = (value: number, digits: number) => value.toString(16).toUpperCase().padStart(digits, '0');
const rgb = (color: string) => [0, 2, 4].map((i) => num(parseInt(color.slice(i, i + 2), 16) / 255 || 0)).join(' ');

class Writer {
  private chunks: Uint8Array[] = [];
  private offsets: number[] = [];
  private length = 0;

  constructor() {
    this.push(latin1('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'));
  }

  private push(bytes: Uint8Array): void {
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  reserve(): number {
    this.offsets.push(0);
    return this.offsets.length;
  }

  write(id: number, dict: string, stream?: Uint8Array): number {
    this.offsets[id - 1] = this.length;
    if (stream) {
      this.push(latin1(`${id} 0 obj\n${dict.replace(/>>$/, ` /Length ${stream.length} >>`)}\nstream\n`));
      this.push(stream);
      this.push(latin1('\nendstream\nendobj\n'));
    } else this.push(latin1(`${id} 0 obj\n${dict}\nendobj\n`));
    return id;
  }

  add(dict: string, stream?: Uint8Array): number {
    return this.write(this.reserve(), dict, stream);
  }

  deflated(dict: string, data: Uint8Array): number {
    return this.add(dict.replace(/>>$/, ' /Filter /FlateDecode >>'), zlibSync(data));
  }

  finish(root: number, info: number): Uint8Array<ArrayBuffer> {
    const start = this.length;
    const count = this.offsets.length + 1;
    let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (const offset of this.offsets) xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    this.push(latin1(`${xref}trailer\n<< /Size ${count} /Root ${root} 0 R /Info ${info} 0 R >>\nstartxref\n${start}\n%%EOF\n`));
    const out = new Uint8Array(this.length);
    let at = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, at);
      at += chunk.length;
    }
    return out;
  }
}

function textString(text: string): string {
  let out = 'FEFF';
  for (let i = 0; i < text.length; i++) out += hex(text.charCodeAt(i), 4);
  return `<${out}>`;
}

/** The letters of WinAnsi above Latin-1 that slides use: quotes, dashes, the bullet, the euro. */
const WIN_ANSI: Record<number, number> = { 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x20ac: 0x80, 0x2026: 0x85, 0x2122: 0x99 };

function winAnsi(code: number): number | undefined {
  if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) return code;
  return WIN_ANSI[code];
}

function standardFont(spec: FontSpec): string {
  const style = (bold: string, italic: string, both: string) => (spec.bold && spec.italic ? both : spec.bold ? bold : spec.italic ? italic : '');
  if (/courier|consolas|mono/i.test(spec.family)) return `Courier${style('-Bold', '-Oblique', '-BoldOblique')}`;
  if (/times|georgia|garamond|lora|playfair|serif/i.test(spec.family) && !/sans/i.test(spec.family)) return `Times${style('-Bold', '-Italic', '-BoldItalic') || '-Roman'}`;
  return `Helvetica${style('-Bold', '-Oblique', '-BoldOblique')}`;
}

interface PdfFont {
  name: string;
  id: number;
  file?: { bytes: Uint8Array; font: TrueType; used: Map<number, number> };
  standard?: string;
  /** The face the file lacks, drawn as a browser draws it: thicker, or slanted. */
  fake: { bold: boolean; italic: boolean };
  has(code: number): boolean;
  encode(text: string): string;
}

const isSpace = (code: number) => code === 0x20 || code === 0xa0 || code === 0x09 || code === 0x200b;

function tracePath(commands: PathCommand[]): string {
  return commands
    .map((c) => (c.op === 'Z' ? 'h' : c.op === 'C' ? `${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)} c` : `${num(c.x)} ${num(c.y)} ${c.op === 'M' ? 'm' : 'l'}`))
    .join(' ');
}

/** The deck as a PDF, a page to each slide, of the size of the slides. */
export function exportDeckPdf(deck: Deck, options: DeckPdfOptions): Uint8Array<ArrayBuffer> {
  const out = new Writer();
  const { width: W, height: H } = deck.size;
  const fonts = new Map<string, PdfFont>();
  const images = new Map<string, { name: string; id: number } | null>();
  const states = new Map<number, string>();
  const shadings: string[] = [];
  const layoutOf = (e: TextElement) => options.layoutOf?.(e) ?? textLayout(e, options.measurer, options.cache);

  const fontFor = (spec: FontSpec): PdfFont => {
    const key = `${spec.family}|${spec.bold}|${spec.italic}`;
    let font = fonts.get(key);
    if (font) return font;
    const name = `F${fonts.size + 1}`;
    const face = { family: spec.family, bold: spec.bold, italic: spec.italic };
    // The face asked for, or the regular one of the family, made bold or slanted by hand.
    const own = options.font?.(face);
    const bytes = own ?? options.font?.({ ...face, bold: false, italic: false });
    const parsed = bytes && parseTrueType(bytes);
    if (bytes && parsed && !parsed.cff) {
      const used = new Map<number, number>();
      font = {
        name,
        id: out.reserve(),
        file: { bytes, font: parsed, used },
        fake: { bold: spec.bold && !own && !parsed.bold, italic: spec.italic && !own && !parsed.italicAngle },
        has: (code) => isSpace(code) || parsed.glyph(code) !== 0,
        encode(text) {
          let codes = '';
          for (const ch of text) {
            const code = ch.codePointAt(0)!;
            const glyph = parsed.glyph(code) || parsed.glyph(0x20);
            if (!used.has(glyph)) used.set(glyph, code);
            codes += hex(glyph, 4);
          }
          return `<${codes}>`;
        },
      };
    } else {
      font = {
        name,
        id: out.reserve(),
        standard: standardFont(spec),
        fake: { bold: false, italic: false },
        has: (code) => isSpace(code) || winAnsi(code) !== undefined,
        encode(text) {
          let codes = '';
          for (const ch of text) codes += hex(winAnsi(ch.codePointAt(0)!) ?? 0x3f, 2);
          return `<${codes}>`;
        },
      };
    }
    fonts.set(key, font);
    return font;
  };

  const imageFor = (key: string, image: PdfImage | undefined) => {
    let entry = images.get(key);
    if (entry !== undefined) return entry;
    entry = null;
    if (image && image.width > 0 && image.height > 0) {
      const name = `I${images.size + 1}`;
      const size = `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /BitsPerComponent 8`;
      if (image.jpeg) entry = { name, id: out.add(`<< ${size} /ColorSpace /DeviceRGB /Filter /DCTDecode >>`, image.jpeg) };
      else if (image.rgb) {
        const mask = image.alpha?.some((a) => a !== 255) ? out.deflated(`<< ${size} /ColorSpace /DeviceGray >>`, image.alpha) : 0;
        entry = { name, id: out.deflated(`<< ${size} /ColorSpace /DeviceRGB${mask ? ` /SMask ${mask} 0 R` : ''} >>`, image.rgb) };
      }
    }
    images.set(key, entry);
    return entry;
  };

  const opacity = (value: number) => {
    const v = Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
    let name = states.get(v);
    if (!name) states.set(v, (name = `G${states.size + 1}`));
    return `/${name} gs`;
  };

  /** A gradient across a box `w` by `h`, as `canvas` lays it: its name, to paint a clipped path with. */
  const shading = (fill: Extract<Fill, { kind: 'gradient' }>, w: number, h: number) => {
    const turn = (fill.angle * Math.PI) / 180;
    const half = (Math.abs(Math.cos(turn)) * w + Math.abs(Math.sin(turn)) * h) / 2;
    const dx = Math.cos(turn) * half;
    const dy = Math.sin(turn) * half;
    const name = `Sh${shadings.length + 1}`;
    shadings.push(
      `/${name} << /ShadingType 2 /ColorSpace /DeviceRGB /Coords [${num(w / 2 - dx)} ${num(h / 2 - dy)} ${num(w / 2 + dx)} ${num(h / 2 + dy)}] /Extend [true true]` +
        ` /Function << /FunctionType 2 /Domain [0 1] /C0 [${rgb(fill.from)}] /C1 [${rgb(fill.to)}] /N 1 >> >>`,
    );
    return name;
  };

  /** The path filled with `fill`, a colour or a gradient over the box. */
  const fillPath = (path: string, fill: Fill, w: number, h: number) => (fill.kind === 'solid' ? `${rgb(fill.color)} rg ${path} f` : `q ${path} W n /${shading(fill, w, h)} sh Q`);

  const drawShape = (e: ShapeElement): string => {
    const path = tracePath(shapePath(e.shape, e.width, e.height));
    const ops: string[] = [];
    if (e.fill && e.shape !== 'line') ops.push(fillPath(path, e.fill, e.width, e.height));
    if (e.stroke && e.strokeWidth > 0) ops.push(`${rgb(e.stroke)} RG ${num(e.strokeWidth)} w 1 J 1 j ${path} S`);
    return ops.join('\n');
  };

  /** A picture covering a box `w` by `h`, as much of it cut off as does not fit, its corners rounded `radius`. */
  const drawPicture = (entry: { name: string } | null, image: PdfImage | undefined, w: number, h: number, radius: number): string => {
    if (!entry || !image) return `0.898 0.906 0.922 rg 0 0 ${num(w)} ${num(h)} re f`;
    const scale = Math.max(w / image.width, h / image.height);
    const dw = image.width * scale;
    const dh = image.height * scale;
    return `q ${tracePath(roundedRect(0, 0, w, h, radius))} W n ${num(dw)} 0 0 ${num(-dh)} ${num((w - dw) / 2)} ${num((h - dh) / 2 + dh)} cm /${entry.name} Do Q`;
  };

  const drawImage = (e: ImageElement): string => {
    const image = options.image?.(e.src);
    return drawPicture(imageFor(`src:${e.src}`, image), image, e.width, e.height, e.radius);
  };

  const fragmentOps = (f: Fragment, line: Line, measurer: TextMeasurer): string[] => {
    if (f.kind !== 'text' || !f.text) return [];
    const ops: string[] = [];
    const top = line.baseline - f.ascent;
    if (f.props.highlight) ops.push(`${rgb(f.props.highlight)} rg ${num(f.x)} ${num(top)} ${num(f.width)} ${num(f.ascent + f.descent)} re f`);
    const font = fontFor(f.font);
    const size = f.font.size;
    const color = rgb(f.props.color);
    const style = font.fake.bold ? `2 Tr ${num(size * 0.03)} w ${color} RG` : '0 Tr';
    const slant = font.fake.italic ? 0.2 : 0;
    // A justified line: each word where the layout put it, the spaces between them wider.
    const pieces = f.wordSpacing ? f.text.split(/(?<= )/) : [f.text];
    let x = f.x;
    for (const piece of pieces) {
      ops.push(`BT /${font.name} ${num(size)} Tf ${color} rg ${style} 1 0 ${slant} -1 ${num(x)} ${num(line.baseline)} Tm ${font.encode(piece)} Tj ET`);
      x += measurer.width(piece, f.font) + (piece.endsWith(' ') ? f.wordSpacing : 0);
    }
    const thick = Math.max(1, size / 16);
    if (f.props.underline) ops.push(`${color} rg ${num(f.x)} ${num(line.baseline + thick)} ${num(f.width)} ${num(thick)} re f`);
    if (f.props.strike) ops.push(`${color} rg ${num(f.x)} ${num(line.baseline - size * 0.3 - thick / 2)} ${num(f.width)} ${num(thick)} re f`);
    return ops;
  };

  const drawText = (e: TextElement): string => {
    const layout = layoutOf(e);
    const fragments = layout.lines.flatMap((line) => [...(line.label ? [{ ...line.label, kind: 'text' as const }] : []), ...line.fragments].map((f) => ({ f, line })));
    // Letters none of the fonts has are drawn as the browser draws them: the box as a picture.
    const drawable = fragments.every(({ f }) => f.kind !== 'text' || [...f.text].every((ch) => fontFor(f.font).has(ch.codePointAt(0)!)));
    if (!drawable && options.picture) {
      const picture = options.picture(e);
      if (picture) return drawPicture(imageFor(`text:${e.id}`, picture), picture, e.width, e.height, 0);
    }
    const dy = textOffset(e.verticalAlign, layout.page.height, e.height);
    return [`1 0 0 1 0 ${num(dy)} cm`, ...fragments.flatMap(({ f, line }) => fragmentOps(f, line, options.measurer))].join('\n');
  };

  const drawElement = (e: Element): string => {
    const turn = (e.rotation * Math.PI) / 180;
    const ops = [
      'q',
      e.opacity < 1 ? opacity(e.opacity) : '',
      `1 0 0 1 ${num(e.x + e.width / 2)} ${num(e.y + e.height / 2)} cm`,
      e.rotation ? `${num(Math.cos(turn))} ${num(Math.sin(turn))} ${num(-Math.sin(turn))} ${num(Math.cos(turn))} 0 0 cm` : '',
      `1 0 0 1 ${num(-e.width / 2)} ${num(-e.height / 2)} cm`,
      e.type === 'shape' ? drawShape(e) : e.type === 'image' ? drawImage(e) : drawText(e),
      'Q',
    ];
    return ops.filter(Boolean).join('\n');
  };

  const pagesId = out.reserve();
  const resourcesId = out.reserve();
  const pageIds: number[] = [];
  const bleed = Math.max(0, options.bleed ?? 0);
  // The slide sits `edge` in from each side of the page: its bleed, and the room for the marks round it.
  const edge = bleed + (options.cropMarks ? MARK_ROOM : 0);
  const pageW = W + 2 * edge;
  const pageH = H + 2 * edge;
  const marks = (): string => {
    if (!options.cropMarks) return '';
    const lines: string[] = [];
    // At each corner of the slide, one line out along each side, outside the bleed.
    for (const [x, dx] of [
      [0, -1],
      [W, 1],
    ])
      for (const [y, dy] of [
        [0, -1],
        [H, 1],
      ]) {
        const from = bleed + MARK_GAP;
        lines.push(`${num(x + dx * from)} ${num(y)} m ${num(x + dx * edge)} ${num(y)} l`, `${num(x)} ${num(y + dy * from)} m ${num(x)} ${num(y + dy * edge)} l`);
      }
    return `q 0 0 0 RG 0.25 w ${lines.join(' ')} S Q`;
  };
  for (const slide of deck.slides) {
    const box = `${num(-bleed)} ${num(-bleed)} ${num(W + 2 * bleed)} ${num(H + 2 * bleed)} re`;
    const ops = [
      `1 0 0 -1 ${num(edge)} ${num(pageH - edge)} cm`,
      marks(),
      `q 1 0 0 1 ${num(-bleed)} ${num(-bleed)} cm ${fillPath(`0 0 ${num(W + 2 * bleed)} ${num(H + 2 * bleed)} re`, slide.background, W + 2 * bleed, H + 2 * bleed)} Q`,
      `${box} W n`,
    ];
    for (const e of slide.elements) ops.push(drawElement(e));
    const content = out.deflated('<< >>', latin1(ops.filter(Boolean).join('\n')));
    // Where the page is cut, and where its bleed ends, for the printer.
    const trim = `[${num(edge)} ${num(edge)} ${num(edge + W)} ${num(edge + H)}]`;
    const bleedBox = `[${num(edge - bleed)} ${num(edge - bleed)} ${num(edge + W + bleed)} ${num(edge + H + bleed)}]`;
    const boxes = edge ? ` /TrimBox ${trim} /BleedBox ${bleedBox}` : '';
    pageIds.push(out.add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${num(pageW)} ${num(pageH)}]${boxes} /Resources ${resourcesId} 0 R /Contents ${content} 0 R >>`));
  }

  for (const font of fonts.values()) {
    // A face asked about but not drawn with, its text drawn as a picture: no file goes in for it.
    if (!font.file?.used.size) {
      out.write(font.id, `<< /Type /Font /Subtype /Type1 /BaseFont /${font.standard ?? 'Helvetica'} /Encoding /WinAnsiEncoding >>`);
      continue;
    }
    const { bytes, font: tt, used } = font.file;
    const scale = 1000 / tt.unitsPerEm;
    const units = (value: number) => Math.round(value * scale);
    // A subset is named by six capitals before its family's name: readers tell it from the whole font by them.
    const n = Number(font.name.slice(1));
    const tag = `RSL${String.fromCharCode(65 + (((n / 676) | 0) % 26), 65 + (((n / 26) | 0) % 26), 65 + (n % 26))}`;
    const base = `${tag}+${tt.family.replace(/[^A-Za-z0-9]/g, '') || 'Embedded'}`;
    // Only the letters the deck uses go in.
    const cut = subsetTrueType(bytes, used.keys()) ?? bytes;
    const file = out.deflated(`<< /Length1 ${cut.length} >>`, cut);
    const descriptor = out.add(
      `<< /Type /FontDescriptor /FontName /${base} /Flags ${tt.italicAngle ? 68 : 4} /FontBBox [${tt.bbox.map(units).join(' ')}] /ItalicAngle ${num(tt.italicAngle)}` +
        ` /Ascent ${units(tt.ascent)} /Descent ${units(tt.descent)} /CapHeight ${units(tt.capHeight)} /StemV 80 /FontFile2 ${file} 0 R >>`,
    );
    const glyphs = [...used.keys()].sort((a, b) => a - b);
    const widths = glyphs.map((glyph) => `${glyph} [${units(tt.advance(glyph))}]`).join(' ');
    const cid = out.add(
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${base} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >>` +
        ` /FontDescriptor ${descriptor} 0 R /DW 1000 /W [${widths}] /CIDToGIDMap /Identity >>`,
    );
    // What each glyph stands for, so the text can be searched and copied.
    const pairs = glyphs.map((glyph) => {
      const code = used.get(glyph)!;
      const utf16 = code > 0xffff ? hex(0xd800 + ((code - 0x10000) >> 10), 4) + hex(0xdc00 + ((code - 0x10000) & 0x3ff), 4) : hex(code, 4);
      return `<${hex(glyph, 4)}> <${utf16}>`;
    });
    let map =
      '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
    for (let i = 0; i < pairs.length; i += 100) {
      const group = pairs.slice(i, i + 100);
      map += `${group.length} beginbfchar\n${group.join('\n')}\nendbfchar\n`;
    }
    map += 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
    const toUnicode = out.deflated('<< >>', latin1(map));
    out.write(font.id, `<< /Type /Font /Subtype /Type0 /BaseFont /${base} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${toUnicode} 0 R >>`);
  }

  const list = (entries: string[]) => entries.join(' ');
  const fontList = list([...fonts.values()].map((f) => `/${f.name} ${f.id} 0 R`));
  const imageList = list([...images.values()].filter((i) => i !== null).map((i) => `/${i.name} ${i.id} 0 R`));
  const stateList = list([...states].map(([v, name]) => `/${name} << /Type /ExtGState /ca ${num(v)} /CA ${num(v)} >>`));
  out.write(resourcesId, `<< /Font << ${fontList} >> /XObject << ${imageList} >> /ExtGState << ${stateList} >> /Shading << ${list(shadings)} >> >>`);
  out.write(pagesId, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  const catalog = out.add(`<< /Type /Catalog /Pages ${pagesId} 0 R /ViewerPreferences << /DisplayDocTitle true >> >>`);
  const info = out.add(`<< /Title ${textString(options.title ?? deck.title)} /Producer (ReboSlides) >>`);
  return out.finish(catalog, info);
}
