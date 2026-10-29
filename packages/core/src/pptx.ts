// A deck as a PowerPoint file, and a PowerPoint file as a deck.
//
// Written, a slide is its background and a shape for each element, in the
// order they are drawn: text as a text box with no insets whose paragraphs and
// runs are those of its document, shapes as the preset geometry PowerPoint has
// for each, pictures cut as the slide shows them. One master and one blank
// layout carry nothing, so that what is on a slide is all on it.
//
// Read, a slide is what PowerPoint shows of it: the shapes of its master and
// its layout under its own, placeholders where their layout puts them and in
// the formatting their master gives them, the colours of the theme, groups
// undone into the elements they hold. What a deck of ReboSlides has no
// element for (tables, charts, SmartArt, video) is counted, not drawn.

import {
  type Doc,
  type Paragraph,
  type RunProps,
  type XmlNode,
  createParagraph,
  escapeXml,
  jpegSize,
  listKindAt,
  parseXml,
  resolveParagraph,
  resolveRun,
  setParagraphProps,
  toggleList,
} from '@rebodocs/core/internal';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { type Deck, type Element, type Fill, type ImageElement, type ShapeElement, type ShapeKind, type Slide, type TextElement, type VerticalAlign, createDeck, newId, solid } from './model';
import { boundsOf } from './ops';

/** English Metric Units to the point. */
const EMU = 12700;
const emu = (pt: number) => Math.round(pt * EMU);
const pt = (value: string | undefined, fallback = 0) => (value === undefined || value === '' ? fallback : Number(value) / EMU);

const NS = {
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
};
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const ROOT_NS = `xmlns:a="${NS.a}" xmlns:r="${NS.r}" xmlns:p="${NS.p}"`;

// —— Writing ——

export interface PptxOptions {
  /** The bytes of a picture of the deck and its kind, PNG, JPEG or GIF; the editor makes any other kind one of these. Data URLs of those kinds are read without it. */
  image?(src: string): { bytes: Uint8Array; type: 'image/png' | 'image/jpeg' | 'image/gif' } | undefined;
}

const IMAGE_EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/gif': 'gif' } as const;

/** The bytes and kind of a data: URL of a picture PowerPoint shows. */
function dataUrlImage(src: string): { bytes: Uint8Array; type: keyof typeof IMAGE_EXTENSIONS } | undefined {
  const m = /^data:(image\/(?:png|jpeg|gif));base64,/.exec(src);
  if (!m) return undefined;
  const binary = atob(src.slice(m[0].length));
  return { bytes: Uint8Array.from(binary, (c) => c.charCodeAt(0)), type: m[1] as keyof typeof IMAGE_EXTENSIONS };
}

const alpha = (opacity: number) => (opacity < 1 ? `<a:alpha val="${Math.round(Math.max(0, opacity) * 100000)}"/>` : '');
const srgb = (color: string, opacity = 1) => `<a:srgbClr val="${color}">${alpha(opacity)}</a:srgbClr>`.replace('></a:srgbClr>', '/>');

function fillXml(fill: Fill | undefined, opacity = 1): string {
  if (!fill) return '<a:noFill/>';
  if (fill.kind === 'solid') return `<a:solidFill>${srgb(fill.color, opacity)}</a:solidFill>`;
  const angle = ((Math.round(fill.angle * 60000) % 21600000) + 21600000) % 21600000;
  return `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0">${srgb(fill.from, opacity)}</a:gs><a:gs pos="100000">${srgb(fill.to, opacity)}</a:gs></a:gsLst><a:lin ang="${angle}" scaled="0"/></a:gradFill>`;
}

function xfrm(e: Pick<Element, 'x' | 'y' | 'width' | 'height' | 'rotation'>, tag = 'a:xfrm'): string {
  const rot = Math.round((((e.rotation % 360) + 360) % 360) * 60000);
  return `<${tag}${rot ? ` rot="${rot}"` : ''}><a:off x="${emu(e.x)}" y="${emu(e.y)}"/><a:ext cx="${emu(e.width)}" cy="${emu(e.height)}"/></${tag}>`;
}

const PRESETS: Record<ShapeKind, string> = {
  rect: 'rect',
  roundRect: 'roundRect',
  ellipse: 'ellipse',
  triangle: 'triangle',
  diamond: 'diamond',
  pentagon: 'pentagon',
  hexagon: 'hexagon',
  star: 'star5',
  arrow: 'rightArrow',
  heart: 'heart',
  line: 'line',
};

function shapeXml(e: ShapeElement, id: number): string {
  const line = e.shape === 'line';
  // A line runs across the middle of its box: PowerPoint's from corner to corner of one with no height.
  const box = line ? { ...e, y: e.y + e.height / 2, height: 0 } : e;
  const adjust = e.shape === 'roundRect' ? '<a:gd name="adj" fmla="val 18000"/>' : e.shape === 'star' ? '<a:gd name="adj" fmla="val 22500"/>' : '';
  const outline = e.stroke && e.strokeWidth > 0 ? `<a:ln w="${emu(e.strokeWidth)}" cap="rnd"><a:solidFill>${srgb(e.stroke, e.opacity)}</a:solidFill><a:round/></a:ln>` : '<a:ln><a:noFill/></a:ln>';
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Forma ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr>${xfrm(box)}<a:prstGeom prst="${PRESETS[e.shape]}"><a:avLst>${adjust}</a:avLst></a:prstGeom>${line ? '<a:noFill/>' : fillXml(e.fill, e.opacity)}${outline}</p:spPr></p:sp>`
  );
}

const ALIGN_OUT = { left: 'l', center: 'ctr', right: 'r', justify: 'just' } as const;
const ANCHOR_OUT: Record<VerticalAlign, string> = { top: 't', middle: 'ctr', bottom: 'b' };

function runXml(text: string, props: RunProps, opacity: number, tag: 'a:rPr' | 'a:endParaRPr' = 'a:rPr'): string {
  const r = resolveRun(props);
  const attrs = [`lang="es-ES"`, `sz="${Math.round(r.fontSize * 100)}"`, r.bold && 'b="1"', r.italic && 'i="1"', r.underline && 'u="sng"', r.strike && 'strike="sngStrike"', 'dirty="0"']
    .filter(Boolean)
    .join(' ');
  const face = escapeXml(r.fontFamily);
  const inner = `<a:solidFill>${srgb(r.color, opacity)}</a:solidFill>${r.highlight ? `<a:highlight>${srgb(r.highlight)}</a:highlight>` : ''}<a:latin typeface="${face}"/><a:ea typeface="${face}"/><a:cs typeface="${face}"/>`;
  const rPr = `<${tag} ${attrs}>${inner}</${tag}>`;
  if (tag === 'a:endParaRPr') return rPr;
  // A line broken inside a paragraph is a break of its own between runs.
  return text
    .split('\n')
    .map((piece) => (piece ? `<a:r>${rPr}<a:t>${escapeXml(piece)}</a:t></a:r>` : ''))
    .join(`<a:br>${rPr}</a:br>`);
}

function textXml(e: TextElement, id: number): string {
  const { doc } = e;
  const paragraphs = doc.paragraphs.map((p, i) => {
    const props = resolveParagraph(p.props);
    const kind = listKindAt(doc, i);
    const size = resolveRun(p.runs.find((r) => r.text)?.props ?? p.runs[0]?.props ?? {}).fontSize;
    const level = p.props.listLevel ?? 0;
    const indent = emu(size * 1.1);
    const list = kind
      ? ` marL="${indent * (level + 1)}" indent="-${indent}"${level ? ` lvl="${level}"` : ''}`
      : props.indentLeft || props.indentFirstLine
        ? ` marL="${emu(props.indentLeft)}" indent="${emu(props.indentFirstLine)}"`
        : '';
    const bullet = kind === 'bullet' ? '<a:buFont typeface="Arial"/><a:buChar char="•"/>' : kind === 'number' ? '<a:buFont typeface="+mj-lt"/><a:buAutoNum type="arabicPeriod"/>' : '<a:buNone/>';
    const spacing =
      `<a:lnSpc><a:spcPct val="${Math.round(props.lineHeight * 100000)}"/></a:lnSpc>` +
      `<a:spcBef><a:spcPts val="${Math.round(props.spacingBefore * 100)}"/></a:spcBef><a:spcAft><a:spcPts val="${Math.round(props.spacingAfter * 100)}"/></a:spcAft>`;
    const runs = p.runs
      .filter((r) => r.text && !r.props.object)
      .map((r) => runXml(r.text, r.props, e.opacity))
      .join('');
    const last = p.runs.at(-1)?.props ?? {};
    return `<a:p><a:pPr algn="${ALIGN_OUT[props.align]}"${list}>${spacing}${bullet}</a:pPr>${runs}${runXml('', last, e.opacity, 'a:endParaRPr')}</a:p>`;
  });
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Texto ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr>${xfrm(e)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>` +
    `<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="${ANCHOR_OUT[e.verticalAlign]}" rtlCol="0">${e.autoHeight ? '<a:spAutoFit/>' : '<a:noAutofit/>'}</a:bodyPr><a:lstStyle/>${paragraphs.join('')}</p:txBody></p:sp>`
  );
}

function imageXml(e: ImageElement, id: number, rid: string): string {
  // The part of the picture the slide shows: as much cut off either side as its box is of other proportions.
  const picture = e.naturalWidth / Math.max(1, e.naturalHeight);
  const box = e.width / Math.max(1, e.height);
  const cut = (shown: number) => Math.round(((1 - shown) / 2) * 100000);
  const crop = picture > box ? `<a:srcRect l="${cut(box / picture)}" r="${cut(box / picture)}"/>` : picture < box ? `<a:srcRect t="${cut(picture / box)}" b="${cut(picture / box)}"/>` : '';
  const radius = Math.min(e.radius, Math.min(e.width, e.height) / 2);
  const geometry =
    radius > 0
      ? `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${Math.round((radius / Math.min(e.width, e.height)) * 100000)}"/></a:avLst></a:prstGeom>`
      : '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
  return (
    `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="Imagen ${id}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
    `<p:blipFill><a:blip r:embed="${rid}">${e.opacity < 1 ? `<a:alphaModFix amt="${Math.round(e.opacity * 100000)}"/>` : ''}</a:blip>${crop}<a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
    `<p:spPr>${xfrm(e)}${geometry}</p:spPr></p:pic>`
  );
}

const relsXml = (rels: [string, string, string][]) =>
  `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map(([id, type, target]) => `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('')}</Relationships>`;

const EMPTY_TREE =
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

const THEME = `${XML_HEAD}<a:theme xmlns:a="${NS.a}" name="ReboSlides"><a:themeElements><a:clrScheme name="ReboSlides"><a:dk1><a:srgbClr val="111827"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F2937"/></a:dk2><a:lt2><a:srgbClr val="F3F4F6"/></a:lt2><a:accent1><a:srgbClr val="7C3AED"/></a:accent1><a:accent2><a:srgbClr val="EC4899"/></a:accent2><a:accent3><a:srgbClr val="06B6D4"/></a:accent3><a:accent4><a:srgbClr val="10B981"/></a:accent4><a:accent5><a:srgbClr val="F59E0B"/></a:accent5><a:accent6><a:srgbClr val="EF4444"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="ReboSlides"><a:majorFont><a:latin typeface="Inter"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Inter"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="ReboSlides"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

/** The deck as the bytes of a .pptx file. */
export function exportPptx(deck: Deck, options: PptxOptions = {}): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const put = (path: string, xml: string) => (files[path] = strToU8(xml));
  const media = new Map<string, string>();
  const kinds = new Set<string>();

  deck.slides.forEach((slide, index) => {
    const n = index + 1;
    const rels: [string, string, string][] = [['rId1', `${REL}/slideLayout`, '../slideLayouts/slideLayout1.xml']];
    const shapes: string[] = [];
    slide.elements.forEach((e, i) => {
      const id = i + 2;
      if (e.type === 'shape') shapes.push(shapeXml(e, id));
      else if (e.type === 'text') shapes.push(textXml(e, id));
      else {
        let path = media.get(e.src);
        if (!path) {
          const image = dataUrlImage(e.src) ?? options.image?.(e.src);
          if (!image) return;
          const extension = IMAGE_EXTENSIONS[image.type];
          path = `media/image${media.size + 1}.${extension}`;
          kinds.add(extension);
          files[`ppt/${path}`] = image.bytes;
          media.set(e.src, path);
        }
        const rid = `rId${rels.length + 1}`;
        rels.push([rid, `${REL}/image`, `../${path}`]);
        shapes.push(imageXml(e, id, rid));
      }
    });
    put(
      `ppt/slides/slide${n}.xml`,
      `${XML_HEAD}<p:sld ${ROOT_NS}><p:cSld><p:bg><p:bgPr>${fillXml(slide.background)}<a:effectLst/></p:bgPr></p:bg><p:spTree>${EMPTY_TREE}${shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
    );
    put(`ppt/slides/_rels/slide${n}.xml.rels`, relsXml(rels));
  });

  const slideRels = deck.slides.map((_, i): [string, string, string] => [`rId${i + 3}`, `${REL}/slide`, `slides/slide${i + 1}.xml`]);
  put(
    'ppt/presentation.xml',
    `${XML_HEAD}<p:presentation ${ROOT_NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>` +
      `<p:sldIdLst>${deck.slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join('')}</p:sldIdLst>` +
      `<p:sldSz cx="${emu(deck.size.width)}" cy="${emu(deck.size.height)}"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`,
  );
  put('ppt/_rels/presentation.xml.rels', relsXml([['rId1', `${REL}/slideMaster`, 'slideMasters/slideMaster1.xml'], ['rId2', `${REL}/theme`, 'theme/theme1.xml'], ...slideRels]));
  put(
    'ppt/slideMasters/slideMaster1.xml',
    `${XML_HEAD}<p:sldMaster ${ROOT_NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${EMPTY_TREE}</p:spTree></p:cSld>` +
      '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
      '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>',
  );
  put(
    'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    relsXml([
      ['rId1', `${REL}/slideLayout`, '../slideLayouts/slideLayout1.xml'],
      ['rId2', `${REL}/theme`, '../theme/theme1.xml'],
    ]),
  );
  put(
    'ppt/slideLayouts/slideLayout1.xml',
    `${XML_HEAD}<p:sldLayout ${ROOT_NS} type="blank" preserve="1"><p:cSld name="En blanco"><p:spTree>${EMPTY_TREE}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
  );
  put('ppt/slideLayouts/_rels/slideLayout1.xml.rels', relsXml([['rId1', `${REL}/slideMaster`, '../slideMasters/slideMaster1.xml']]));
  put('ppt/theme/theme1.xml', THEME);
  put(
    'docProps/core.xml',
    `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(deck.title)}</dc:title><dc:creator>ReboSlides</dc:creator></cp:coreProperties>`,
  );
  put(
    'docProps/app.xml',
    `${XML_HEAD}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>ReboSlides</Application><Slides>${deck.slides.length}</Slides></Properties>`,
  );
  put(
    '_rels/.rels',
    relsXml([
      ['rId1', `${REL}/officeDocument`, 'ppt/presentation.xml'],
      ['rId2', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml'],
      ['rId3', `${REL}/extended-properties`, 'docProps/app.xml'],
    ]),
  );
  const pml = 'application/vnd.openxmlformats-officedocument.presentationml';
  const media_types = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif' } as const;
  put(
    '[Content_Types].xml',
    `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
      [...kinds].map((k) => `<Default Extension="${k}" ContentType="${media_types[k as keyof typeof media_types]}"/>`).join('') +
      `<Override PartName="/ppt/presentation.xml" ContentType="${pml}.presentation.main+xml"/>` +
      `<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${pml}.slideMaster+xml"/>` +
      `<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${pml}.slideLayout+xml"/>` +
      deck.slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="${pml}.slide+xml"/>`).join('') +
      '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>',
  );
  // The parts are in the order a reader expects them: the list of kinds first.
  const ordered: Record<string, Uint8Array> = { '[Content_Types].xml': files['[Content_Types].xml'] };
  for (const [path, bytes] of Object.entries(files)) if (path !== '[Content_Types].xml') ordered[path] = bytes;
  return zipSync(ordered, { level: 6 });
}

// —— Reading ——

export interface PptxImport {
  deck: Deck;
  /** How many things on the slides had no element to be made into: tables, charts, SmartArt, video, pictures of kinds a browser does not show. */
  skipped: number;
}

const kid = (node: XmlNode | undefined, name: string) => node?.children.find((c) => c.name === name);
const kids = (node: XmlNode | undefined, name: string) => node?.children.filter((c) => c.name === name) ?? [];
const at = (node: XmlNode | undefined, ...names: string[]) => names.reduce<XmlNode | undefined>((n, name) => kid(n, name), node);
const textIn = (node: XmlNode): string => node.children.map((c) => (c.name === '#text' ? c.text : '')).join('');
const elementOf = (root: XmlNode) => root.children.find((c) => c.name !== '#text');

interface Part {
  path: string;
  xml: XmlNode;
  rels: Map<string, { type: string; target: string }>;
}

interface Theme {
  colors: Map<string, string>;
  major: string;
  minor: string;
}

/** The style a paragraph of a level is set in, from the master down to the paragraph. */
interface Style {
  align?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  /** Points of an exact line height, made a multiple once the size of the text is known. */
  linePoints?: number;
  before?: number;
  after?: number;
  bullet?: 'bullet' | 'number' | 'none';
  run: RunProps;
}

const ALIGN_IN: Record<string, Style['align']> = { l: 'left', ctr: 'center', r: 'right', just: 'justify', dist: 'justify' };
const ANCHOR_IN: Record<string, VerticalAlign> = { t: 'top', ctr: 'middle', b: 'bottom' };

const PRESET_IN: Record<string, ShapeKind> = {
  rect: 'rect',
  roundRect: 'roundRect',
  round1Rect: 'roundRect',
  round2SameRect: 'roundRect',
  snipRoundRect: 'roundRect',
  flowChartAlternateProcess: 'roundRect',
  ellipse: 'ellipse',
  flowChartConnector: 'ellipse',
  triangle: 'triangle',
  rtTriangle: 'triangle',
  diamond: 'diamond',
  flowChartDecision: 'diamond',
  pentagon: 'pentagon',
  hexagon: 'hexagon',
  octagon: 'hexagon',
  star4: 'star',
  star5: 'star',
  star6: 'star',
  star7: 'star',
  star8: 'star',
  star10: 'star',
  star12: 'star',
  star16: 'star',
  star24: 'star',
  star32: 'star',
  rightArrow: 'arrow',
  leftArrow: 'arrow',
  upArrow: 'arrow',
  downArrow: 'arrow',
  homePlate: 'arrow',
  chevron: 'arrow',
  notchedRightArrow: 'arrow',
  heart: 'heart',
  line: 'line',
  straightConnector1: 'line',
  bentConnector2: 'line',
  bentConnector3: 'line',
  curvedConnector3: 'line',
};

/** How far each kind of arrow is turned from the one that points right. */
const ARROW_TURN: Record<string, number> = { leftArrow: 180, upArrow: -90, downArrow: 90 };

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return [f(0), f(8), f(4)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

const PRESET_COLORS: Record<string, string> = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080', orange: 'FFA500' };

/** The colour a node holding one says, with its changes, and how opaque it is. */
function colorIn(node: XmlNode | undefined, theme: Theme): { color: string; alpha: number } | undefined {
  const c = node?.children.find((n) => ['a:srgbClr', 'a:schemeClr', 'a:sysClr', 'a:prstClr', 'a:scrgbClr'].includes(n.name));
  if (!c) return undefined;
  let color: string | undefined;
  if (c.name === 'a:srgbClr') color = c.attrs.val;
  else if (c.name === 'a:sysClr') color = c.attrs.lastClr ?? (c.attrs.val === 'window' ? 'FFFFFF' : '000000');
  else if (c.name === 'a:prstClr') color = PRESET_COLORS[c.attrs.val];
  else if (c.name === 'a:scrgbClr')
    color = ['r', 'g', 'b']
      .map((k) =>
        Math.round((Number(c.attrs[k]) / 100000) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  else color = theme.colors.get({ bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' }[c.attrs.val] ?? c.attrs.val);
  if (!color) return undefined;
  color = color.toUpperCase();
  let opacity = 1;
  let [h, s, l] = hexToHsl(color);
  let touched = false;
  for (const m of c.children) {
    const v = Number(m.attrs.val) / 100000;
    if (m.name === 'a:alpha') opacity = v;
    else if (m.name === 'a:lumMod') (l *= v), (touched = true);
    else if (m.name === 'a:lumOff') (l += v), (touched = true);
    else if (m.name === 'a:shade') (l *= v), (touched = true);
    else if (m.name === 'a:tint') (l = l * v + (1 - v)), (touched = true);
    else if (m.name === 'a:satMod') (s *= v), (touched = true);
  }
  if (touched) color = hslToHex(h, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l)));
  return { color, alpha: opacity };
}

/** A fill of DrawingML as a fill of the deck: undefined for none or one it cannot draw. */
function fillIn(node: XmlNode | undefined, theme: Theme): { fill?: Fill; alpha: number } | undefined {
  if (!node) return undefined;
  if (node.name === 'a:noFill') return { alpha: 1 };
  if (node.name === 'a:solidFill') {
    const c = colorIn(node, theme);
    return c && { fill: solid(c.color), alpha: c.alpha };
  }
  if (node.name === 'a:gradFill') {
    const stops = kids(kid(node, 'a:gsLst'), 'a:gs').sort((a, b) => Number(a.attrs.pos) - Number(b.attrs.pos));
    const from = colorIn(stops[0], theme);
    const to = colorIn(stops.at(-1), theme);
    if (!from || !to) return undefined;
    const lin = kid(node, 'a:lin');
    return { fill: { kind: 'gradient', from: from.color, to: to.color, angle: lin ? Number(lin.attrs.ang ?? 0) / 60000 : 90 }, alpha: from.alpha };
  }
  return undefined;
}

const FILLS = ['a:noFill', 'a:solidFill', 'a:gradFill', 'a:blipFill', 'a:pattFill', 'a:grpFill'];
const fillNode = (spPr: XmlNode | undefined) => spPr?.children.find((c) => FILLS.includes(c.name));

function pictureSize(bytes: Uint8Array, type: string): { width: number; height: number } | undefined {
  if (type === 'image/png' && bytes.length > 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (type === 'image/jpeg') return jpegSize(bytes);
  if (type === 'image/gif' && bytes.length > 10) return { width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8) };
  return undefined;
}

function imageType(bytes: Uint8Array): string | undefined {
  const starts = (...head: number[]) => head.every((b, i) => bytes[i] === b);
  if (starts(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (starts(0x47, 0x49, 0x46, 0x38)) return 'image/gif';
  return undefined;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Where a box of a group goes on the slide: scaled from the group's own coordinates to where the group is. */
interface Frame {
  sx: number;
  sy: number;
  dx: number;
  dy: number;
}
const IDENTITY: Frame = { sx: 1, sy: 1, dx: 0, dy: 0 };

/** The deck in the bytes of a .pptx file. */
export function importPptx(bytes: Uint8Array): PptxImport {
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(bytes);
  } catch {
    throw new Error('El archivo no es una presentación de PowerPoint.');
  }
  const parts = new Map<string, Part | undefined>();
  const partAt = (path: string): Part | undefined => {
    if (parts.has(path)) return parts.get(path);
    const data = zip[path];
    let part: Part | undefined;
    if (data) {
      const dir = path.slice(0, path.lastIndexOf('/') + 1);
      const relsData = zip[`${dir}_rels/${path.slice(dir.length)}.rels`];
      const rels = new Map<string, { type: string; target: string }>();
      if (relsData)
        for (const r of kids(elementOf(parseXml(strFromU8(relsData))), 'Relationship')) {
          if (r.attrs.TargetMode === 'External') continue;
          rels.set(r.attrs.Id, { type: r.attrs.Type.slice(r.attrs.Type.lastIndexOf('/') + 1), target: resolvePath(dir, r.attrs.Target) });
        }
      part = { path, xml: elementOf(parseXml(strFromU8(data)))!, rels };
    }
    parts.set(path, part);
    return part;
  };
  const related = (part: Part | undefined, type: string) => {
    for (const r of part?.rels.values() ?? []) if (r.type === type) return partAt(r.target);
    return undefined;
  };

  const presentation = partAt('ppt/presentation.xml');
  if (!presentation) throw new Error('El archivo no es una presentación de PowerPoint.');
  const size = at(presentation.xml, 'p:sldSz');
  const deck = createDeck('Presentación importada', size ? { width: pt(size.attrs.cx, 960), height: pt(size.attrs.cy, 540) } : undefined);
  const title = zip['docProps/core.xml'] && /<dc:title>([^<]*)<\/dc:title>/.exec(strFromU8(zip['docProps/core.xml']))?.[1];
  if (title)
    deck.title =
      parseXml(title)
        .children.map((c) => c.text)
        .join('') || deck.title;

  const themePart = related(presentation, 'theme') ?? related(related(related(presentation, 'slideMaster'), 'slideMaster'), 'theme');
  const theme: Theme = { colors: new Map(), major: 'Calibri Light', minor: 'Calibri' };
  const scheme = at(themePart?.xml, 'a:themeElements', 'a:clrScheme');
  for (const c of scheme?.children ?? []) {
    const color = colorIn(c, theme);
    if (color) theme.colors.set(c.name.slice(2), color.color);
  }
  const fontScheme = at(themePart?.xml, 'a:themeElements', 'a:fontScheme');
  theme.major = at(fontScheme, 'a:majorFont', 'a:latin')?.attrs.typeface || theme.major;
  theme.minor = at(fontScheme, 'a:minorFont', 'a:latin')?.attrs.typeface || theme.minor;
  const face = (typeface: string | undefined) => (typeface === '+mj-lt' ? theme.major : typeface === '+mn-lt' ? theme.minor : typeface || undefined);

  let skipped = 0;

  /** The paragraph style a level node (a:lvl1pPr, a:pPr, a:defRPr inside) gives, over `base`. */
  const styleOf = (p: XmlNode | undefined, base: Style): Style => {
    if (!p) return base;
    const out: Style = { ...base, run: { ...base.run } };
    if (p.attrs.algn) out.align = ALIGN_IN[p.attrs.algn] ?? out.align;
    const spcPct = at(p, 'a:lnSpc', 'a:spcPct');
    const spcPts = at(p, 'a:lnSpc', 'a:spcPts');
    if (spcPct) (out.lineHeight = Number(spcPct.attrs.val) / 100000), (out.linePoints = undefined);
    if (spcPts) (out.linePoints = Number(spcPts.attrs.val) / 100), (out.lineHeight = undefined);
    const before = at(p, 'a:spcBef', 'a:spcPts');
    const after = at(p, 'a:spcAft', 'a:spcPts');
    if (before) out.before = Number(before.attrs.val) / 100;
    if (after) out.after = Number(after.attrs.val) / 100;
    if (kid(p, 'a:buNone')) out.bullet = 'none';
    if (kid(p, 'a:buChar')) out.bullet = 'bullet';
    if (kid(p, 'a:buAutoNum')) out.bullet = 'number';
    out.run = runOf(kid(p, 'a:defRPr'), out.run);
    return out;
  };
  const runOf = (r: XmlNode | undefined, base: RunProps): RunProps => {
    if (!r) return base;
    const out: RunProps = { ...base };
    if (r.attrs.sz) out.fontSize = Number(r.attrs.sz) / 100;
    if (r.attrs.b) out.bold = r.attrs.b === '1' || r.attrs.b === 'true';
    if (r.attrs.i) out.italic = r.attrs.i === '1' || r.attrs.i === 'true';
    if (r.attrs.u) out.underline = r.attrs.u !== 'none';
    if (r.attrs.strike) out.strike = r.attrs.strike !== 'noStrike';
    const fill = kid(r, 'a:solidFill');
    const color = fill && colorIn(fill, theme);
    if (color) out.color = color.color;
    const highlight = colorIn(kid(r, 'a:highlight'), theme);
    if (highlight) out.highlight = highlight.color;
    const latin = face(kid(r, 'a:latin')?.attrs.typeface);
    if (latin) out.fontFamily = latin;
    return out;
  };
  const levelName = (level: number) => `a:lvl${level + 1}pPr`;

  /** The placeholder of a layout or master a placeholder of the slide stands for: by its number, or by its kind. */
  const placeholderIn = (part: Part | undefined, ph: XmlNode): XmlNode | undefined => {
    const shapes = (at(part?.xml, 'p:cSld', 'p:spTree')?.children ?? []).filter((c) => c.name === 'p:sp');
    const phOf = (sp: XmlNode) => at(sp, 'p:nvSpPr', 'p:nvPr', 'p:ph');
    const type = ph.attrs.type ?? 'body';
    const sameType = (t: string | undefined) => {
      const other = t ?? 'body';
      return other === type || (['title', 'ctrTitle'].includes(other) && ['title', 'ctrTitle'].includes(type)) || (other === 'body' && ['subTitle', 'obj'].includes(type));
    };
    return shapes.find((sp) => ph.attrs.idx !== undefined && phOf(sp)?.attrs.idx === ph.attrs.idx && sameType(phOf(sp)?.attrs.type)) ?? shapes.find((sp) => phOf(sp) && sameType(phOf(sp)!.attrs.type));
  };

  /** The text of a shape as an element: in the box it is in, styled by what it inherits. */
  const textElement = (
    sp: XmlNode,
    box: { x: number; y: number; width: number; height: number; rotation: number },
    chain: XmlNode[],
    styleName: 'titleStyle' | 'bodyStyle' | 'otherStyle',
    master: Part | undefined,
    defaultColor?: string,
  ): TextElement | undefined => {
    const body = kid(sp, 'p:txBody');
    const paragraphsXml = kids(body, 'a:p');
    if (!paragraphsXml.some((p) => kids(p, 'a:r').some((r) => textIn(kid(r, 'a:t') ?? r).trim()) || kids(p, 'a:fld').length)) return undefined;
    // The bodies from the master down: their settings and their list styles, each over the one before.
    const bodies = [...chain.map((s) => kid(s, 'p:txBody')), body];
    let bodyPr: Record<string, string> = {};
    let autoFit: XmlNode | undefined;
    for (const b of bodies) {
      const pr = kid(b, 'a:bodyPr');
      if (!pr) continue;
      bodyPr = { ...bodyPr, ...pr.attrs };
      autoFit = pr.children.find((c) => ['a:spAutoFit', 'a:normAutofit', 'a:noAutofit'].includes(c.name)) ?? autoFit;
    }
    const scale = autoFit?.name === 'a:normAutofit' && autoFit.attrs.fontScale ? Number(autoFit.attrs.fontScale) / 100000 : 1;
    const levels: Style[] = [];
    const masterStyles = at(master?.xml, 'p:txStyles', `p:${styleName}`);
    for (let level = 0; level < 9; level++) {
      let style: Style = { run: { fontFamily: theme.minor, fontSize: 18, color: defaultColor ?? theme.colors.get('dk1') ?? '000000', kern: 0 } };
      style = styleOf(kid(masterStyles, levelName(level)), style);
      for (const b of bodies) style = styleOf(kid(kid(b, 'a:lstStyle'), levelName(level)), style);
      levels.push(style);
    }
    const paragraphs: Paragraph[] = [];
    const kinds: (Style['bullet'] | undefined)[] = [];
    const listLevels: number[] = [];
    for (const p of paragraphsXml) {
      const pPr = kid(p, 'a:pPr');
      const level = Math.min(8, Number(pPr?.attrs.lvl ?? 0));
      const style = styleOf(pPr, levels[level]);
      const runs: { text: string; props: RunProps }[] = [];
      for (const r of p.children) {
        if (r.name === 'a:r' || r.name === 'a:fld') runs.push({ text: textIn(kid(r, 'a:t') ?? r), props: runOf(kid(r, 'a:rPr'), style.run) });
        else if (r.name === 'a:br') runs.push({ text: '\n', props: runOf(kid(r, 'a:rPr'), style.run) });
      }
      const end = runOf(kid(p, 'a:endParaRPr'), style.run);
      const sized = (props: RunProps): RunProps => ({ ...props, kern: 0, fontSize: Math.round((props.fontSize ?? 18) * scale * 10) / 10 });
      const first = sized(runs[0]?.props ?? end);
      const lineHeight = style.linePoints ? style.linePoints / ((first.fontSize ?? 18) * 1.2) : (style.lineHeight ?? 1);
      const paragraph = createParagraph('', sized(end), { align: style.align ?? 'left', lineHeight: Math.max(0.5, lineHeight), spacingBefore: style.before ?? 0, spacingAfter: style.after ?? 0 });
      if (runs.length) paragraph.runs = runs.map((r) => ({ text: r.text, props: sized(r.props) }));
      paragraphs.push(paragraph);
      kinds.push(runs.some((r) => r.text.trim()) ? style.bullet : undefined);
      listLevels.push(level);
    }
    let doc: Doc = { page: { width: box.width, height: 0, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 }, paragraphs };
    // Lists: each run of paragraphs of one kind made one list, so that its numbers follow on.
    for (let i = 0; i < kinds.length; ) {
      const kind = kinds[i];
      let j = i;
      while (j + 1 < kinds.length && kinds[j + 1] === kind) j++;
      if (kind === 'bullet' || kind === 'number') {
        doc = toggleList(doc, i, j, kind);
        for (let k = i; k <= j; k++) if (listLevels[k]) doc = setParagraphProps(doc, k, k, { listLevel: listLevels[k] });
      }
      i = j + 1;
    }
    const inset = (name: string, fallback: number) => pt(bodyPr[name], fallback);
    const left = inset('lIns', 7.2);
    const right = inset('rIns', 7.2);
    const top = inset('tIns', 3.6);
    const bottom = inset('bIns', 3.6);
    return {
      id: newId(),
      type: 'text',
      x: box.x + left,
      y: box.y + top,
      width: Math.max(8, box.width - left - right),
      height: Math.max(8, box.height - top - bottom),
      rotation: box.rotation,
      opacity: 1,
      doc,
      verticalAlign: ANCHOR_IN[bodyPr.anchor ?? 't'] ?? 'top',
      autoHeight: autoFit?.name === 'a:spAutoFit',
    };
  };

  /** The elements of a tree of shapes, those of its groups among them, in the order they are drawn. */
  const elementsOf = (tree: XmlNode | undefined, part: Part, chainOf: (ph: XmlNode) => XmlNode[], master: Part | undefined, frame: Frame, placeholders: boolean): Element[] => {
    const out: Element[] = [];
    for (const node of tree?.children ?? []) {
      if (node.name === 'p:grpSp') {
        const x = at(node, 'p:grpSpPr', 'a:xfrm');
        const off = kid(x, 'a:off');
        const ext = kid(x, 'a:ext');
        const chOff = kid(x, 'a:chOff');
        const chExt = kid(x, 'a:chExt');
        const sx = chExt && Number(chExt.attrs.cx) ? Number(ext?.attrs.cx) / Number(chExt.attrs.cx) : 1;
        const sy = chExt && Number(chExt.attrs.cy) ? Number(ext?.attrs.cy) / Number(chExt.attrs.cy) : 1;
        // A point of the group is put at off + (point - chOff) * scale, and then where the group's own frame puts it.
        const inner: Frame = {
          sx: frame.sx * sx,
          sy: frame.sy * sy,
          dx: frame.dx + frame.sx * (pt(off?.attrs.x) - pt(chOff?.attrs.x) * sx),
          dy: frame.dy + frame.sy * (pt(off?.attrs.y) - pt(chOff?.attrs.y) * sy),
        };
        out.push(...elementsOf(node, part, chainOf, master, inner, placeholders));
        continue;
      }
      if (node.name === 'p:graphicFrame' || node.name === 'mc:AlternateContent' || node.name === 'p:contentPart') {
        skipped++;
        continue;
      }
      if (node.name !== 'p:sp' && node.name !== 'p:pic' && node.name !== 'p:cxnSp') continue;
      const nv = node.children.find((c) => c.name.startsWith('p:nv'));
      const ph = at(nv, 'p:nvPr', 'p:ph');
      if (ph && !placeholders) continue;
      if (at(nv, 'p:cNvPr')?.attrs.hidden === '1') continue;
      const chain = ph ? chainOf(ph) : [];
      const spPr = kid(node, 'p:spPr');
      const xfrmNode = [spPr, ...chain.map((s) => kid(s, 'p:spPr')).reverse()].map((s) => kid(s, 'a:xfrm')).find((x) => x && kid(x, 'a:off'));
      if (!xfrmNode) continue;
      const off = kid(xfrmNode, 'a:off')!;
      const ext = kid(xfrmNode, 'a:ext');
      const rawW = pt(ext?.attrs.cx) * frame.sx;
      const rawH = pt(ext?.attrs.cy) * frame.sy;
      const box = {
        x: pt(off.attrs.x) * frame.sx + frame.dx,
        y: pt(off.attrs.y) * frame.sy + frame.dy,
        width: rawW,
        height: rawH,
        rotation: Number(xfrmNode.attrs.rot ?? 0) / 60000,
      };
      const flipH = xfrmNode.attrs.flipH === '1';
      const flipV = xfrmNode.attrs.flipV === '1';
      const style = kid(node, 'p:style');
      const geometry = [spPr, ...chain.map((s) => kid(s, 'p:spPr')).reverse()].map((s) => kid(s, 'a:prstGeom')).find(Boolean);
      const preset = geometry?.attrs.prst ?? (kid(spPr, 'a:custGeom') ? 'rect' : node.name === 'p:cxnSp' ? 'line' : 'rect');

      if (node.name === 'p:pic') {
        const blip = at(node, 'p:blipFill', 'a:blip');
        const target = blip && part.rels.get(blip.attrs['r:embed'])?.target;
        const data = target && zip[target];
        const type = data && imageType(data);
        const natural = data && type && pictureSize(data, type);
        if (!data || !type || !natural) {
          skipped++;
          continue;
        }
        const amt = kid(blip, 'a:alphaModFix')?.attrs.amt;
        const adj = kid(kid(geometry, 'a:avLst'), 'a:gd')?.attrs.fmla?.match(/val (\d+)/)?.[1];
        const radius = preset === 'roundRect' ? (Math.min(box.width, box.height) * Number(adj ?? 16667)) / 100000 : preset === 'ellipse' ? Math.min(box.width, box.height) / 2 : 0;
        out.push({
          id: newId(),
          type: 'image',
          ...box,
          opacity: amt ? Number(amt) / 100000 : 1,
          src: `data:${type};base64,${toBase64(data)}`,
          naturalWidth: natural.width,
          naturalHeight: natural.height,
          radius,
        });
        continue;
      }

      const kind = PRESET_IN[preset] ?? 'rect';
      // The fill and the outline: the shape's own, its placeholder's, or what its style refers to in the theme.
      const fillXmlNode = [spPr, ...chain.map((s) => kid(s, 'p:spPr')).reverse()].map(fillNode).find(Boolean);
      let fill = fillIn(fillXmlNode, theme);
      if (!fillXmlNode && style && Number(kid(style, 'a:fillRef')?.attrs.idx) > 0) {
        const c = colorIn(kid(style, 'a:fillRef'), theme);
        if (c) fill = { fill: solid(c.color), alpha: c.alpha };
      }
      if (fillXmlNode?.name === 'a:blipFill') {
        const target = part.rels.get(kid(fillXmlNode, 'a:blip')?.attrs['r:embed'] ?? '')?.target;
        const data = target && zip[target];
        const type = data && imageType(data);
        const natural = data && type && pictureSize(data, type);
        if (data && type && natural)
          out.push({ id: newId(), type: 'image', ...box, opacity: 1, src: `data:${type};base64,${toBase64(data)}`, naturalWidth: natural.width, naturalHeight: natural.height, radius: 0 });
      }
      const lnNode = [spPr, ...chain.map((s) => kid(s, 'p:spPr')).reverse()].map((s) => kid(s, 'a:ln')).find(Boolean);
      let stroke: string | undefined;
      let strokeWidth = 0;
      if (lnNode && !kid(lnNode, 'a:noFill')) {
        stroke = colorIn(kid(lnNode, 'a:solidFill'), theme)?.color;
        strokeWidth = pt(lnNode.attrs.w, 0.75);
      }
      if (!stroke && !kid(lnNode, 'a:noFill') && style && Number(kid(style, 'a:lnRef')?.attrs.idx) > 0) {
        stroke = colorIn(kid(style, 'a:lnRef'), theme)?.color;
        strokeWidth = strokeWidth || 0.75;
      }

      if (kind === 'line') {
        // From one end to the other, as the flips say, turned about the middle.
        const x1 = flipH ? box.width : 0;
        const y1 = flipV ? box.height : 0;
        const dx = (flipH ? 0 : box.width) - x1;
        const dy = (flipV ? 0 : box.height) - y1;
        const length = Math.max(1, Math.hypot(dx, dy));
        const thick = Math.max(strokeWidth, 4);
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        if (stroke)
          out.push({
            id: newId(),
            type: 'shape',
            shape: 'line',
            x: cx - length / 2,
            y: cy - thick / 2,
            width: length,
            height: thick,
            rotation: box.rotation + (Math.atan2(dy, dx) * 180) / Math.PI,
            opacity: 1,
            stroke,
            strokeWidth: strokeWidth || 1,
          });
        continue;
      }

      const turn = (flipH && flipV ? 180 : kind === 'arrow' && flipH ? 180 : kind === 'triangle' && flipV ? 180 : 0) + (ARROW_TURN[preset] ?? 0);
      // An arrow drawn pointing up or down: the box it is drawn in is turned with it.
      const sideways = Math.abs(ARROW_TURN[preset] ?? 0) === 90;
      const shapeBox = sideways ? { ...box, x: box.x + (box.width - box.height) / 2, y: box.y + (box.height - box.width) / 2, width: box.height, height: box.width } : box;
      if (fill?.fill || (stroke && strokeWidth > 0)) {
        out.push({
          id: newId(),
          type: 'shape',
          shape: kind,
          ...shapeBox,
          rotation: box.rotation + turn,
          opacity: fill?.fill ? fill.alpha : 1,
          fill: fill?.fill,
          stroke,
          strokeWidth: stroke ? strokeWidth : 0,
        });
      }

      const phType = ph?.attrs.type;
      const styleName = phType === 'title' || phType === 'ctrTitle' ? 'titleStyle' : ph ? 'bodyStyle' : 'otherStyle';
      const fontColor = style && colorIn(kid(style, 'a:fontRef'), theme)?.color;
      const text = textElement(node, box, chain, styleName, master, fontColor);
      if (text) out.push(text);
    }
    return out;
  };

  const backgroundOf = (part: Part | undefined): Fill | Element | undefined => {
    const bg = at(part?.xml, 'p:cSld', 'p:bg');
    if (!bg) return undefined;
    const bgPr = kid(bg, 'p:bgPr');
    if (bgPr) {
      const node = fillNode(bgPr);
      if (node?.name === 'a:blipFill') {
        const target = part!.rels.get(kid(node, 'a:blip')?.attrs['r:embed'] ?? '')?.target;
        const data = target && zip[target];
        const type = data && imageType(data);
        const natural = data && type && pictureSize(data, type);
        if (data && type && natural)
          return {
            id: newId(),
            type: 'image',
            x: 0,
            y: 0,
            width: deck.size.width,
            height: deck.size.height,
            rotation: 0,
            opacity: 1,
            src: `data:${type};base64,${toBase64(data)}`,
            naturalWidth: natural.width,
            naturalHeight: natural.height,
            radius: 0,
            locked: true,
          };
      }
      return fillIn(node, theme)?.fill;
    }
    const ref = kid(bg, 'p:bgRef');
    const c = colorIn(ref, theme);
    return c ? solid(c.color) : undefined;
  };

  const slides: Slide[] = [];
  for (const id of kids(at(presentation.xml, 'p:sldIdLst'), 'p:sldId')) {
    const target = presentation.rels.get(id.attrs['r:id'])?.target;
    const slidePart = target ? partAt(target) : undefined;
    if (!slidePart) continue;
    if (slidePart.xml.attrs.show === '0') continue;
    const layout = related(slidePart, 'slideLayout');
    const master = related(layout, 'slideMaster');
    const chainOf = (ph: XmlNode) => [placeholderIn(master, ph), placeholderIn(layout, ph)].filter((x): x is XmlNode => !!x);
    const layoutChain = (ph: XmlNode) => [placeholderIn(master, ph)].filter((x): x is XmlNode => !!x);
    const elements: Element[] = [];
    const hidesMaster = (part: Part | undefined) => part?.xml.attrs.showMasterSp === '0';
    if (master && !hidesMaster(slidePart) && !hidesMaster(layout)) elements.push(...elementsOf(at(master.xml, 'p:cSld', 'p:spTree'), master, () => [], master, IDENTITY, false));
    if (layout && !hidesMaster(slidePart)) elements.push(...elementsOf(at(layout.xml, 'p:cSld', 'p:spTree'), layout, layoutChain, master, IDENTITY, false));
    elements.push(...elementsOf(at(slidePart.xml, 'p:cSld', 'p:spTree'), slidePart, chainOf, master, IDENTITY, true));
    let background: Fill = solid(theme.colors.get('lt1') ?? 'FFFFFF');
    for (const part of [slidePart, layout, master]) {
      const bg = backgroundOf(part);
      if (!bg) continue;
      if ('kind' in bg) background = bg;
      else elements.unshift(bg);
      break;
    }
    const notesPart = related(slidePart, 'notesSlide');
    const notesBody = (at(notesPart?.xml, 'p:cSld', 'p:spTree')?.children ?? []).find((sp) => sp.name === 'p:sp' && at(sp, 'p:nvSpPr', 'p:nvPr', 'p:ph')?.attrs.type === 'body');
    const notes = kids(kid(notesBody, 'p:txBody'), 'a:p')
      .map((p) =>
        kids(p, 'a:r')
          .map((r) => textIn(kid(r, 'a:t') ?? r))
          .join(''),
      )
      .join('\n')
      .trim();
    // Elements far off the slide are not on it.
    const onSlide = elements.filter((e) => {
      const b = boundsOf(e);
      return b.x < deck.size.width && b.y < deck.size.height && b.x + b.width > 0 && b.y + b.height > 0;
    });
    slides.push({ id: newId('s'), background, elements: onSlide, ...(notes ? { notes } : {}) });
  }
  if (slides.length) deck.slides = slides;
  return { deck, skipped };
}

/** A path of the package from a target relative to `dir`. */
function resolvePath(dir: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = `${dir}${target}`.split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.' && p !== '') out.push(p);
  }
  return out.join('/');
}
