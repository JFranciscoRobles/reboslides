import { listKindAt } from '@rebodocs/core/internal';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SIZE, type Deck, type ShapeElement, type TextElement, THEMES, createImage, exportPptx, importPptx, plainTextOf, themedDeck } from '../src/index';

/** A PNG of one red pixel. */
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 0);

describe('a deck written as a .pptx', () => {
  const deck: Deck = themedDeck(THEMES[1], DEFAULT_SIZE, 'Mi charla');
  deck.slides[0].elements.push({ ...createImage(PIXEL, 1, 1, DEFAULT_SIZE, { x: 10, y: 20, width: 100, height: 50 }), radius: 10, opacity: 0.5 });
  const bytes = exportPptx(deck);
  const files = unzipSync(bytes);

  it('is a package PowerPoint opens: its parts, their kinds and their relations', () => {
    for (const part of [
      '[Content_Types].xml',
      '_rels/.rels',
      'ppt/presentation.xml',
      'ppt/slideMasters/slideMaster1.xml',
      'ppt/slideLayouts/slideLayout1.xml',
      'ppt/theme/theme1.xml',
      'ppt/media/image1.png',
    ])
      expect(files[part], part).toBeDefined();
    const types = strFromU8(files['[Content_Types].xml']);
    expect(types.match(/presentationml\.slide\+xml/g)).toHaveLength(deck.slides.length);
    expect(types).toContain('Extension="png"');
    expect(strFromU8(files['ppt/presentation.xml'])).toContain('<p:sldSz cx="12192000" cy="6858000"/>');
  });

  it('is read back as it was: slides, backgrounds, places, text, lists, shapes and pictures', () => {
    const { deck: back, skipped } = importPptx(bytes);
    expect(skipped).toBe(0);
    expect(back.title).toBe('Mi charla');
    expect(back.size).toEqual(DEFAULT_SIZE);
    expect(back.slides).toHaveLength(deck.slides.length);
    deck.slides.forEach((slide, i) => {
      const got = back.slides[i];
      expect(got.background).toEqual(slide.background);
      expect(got.elements.map((e) => e.type)).toEqual(slide.elements.map((e) => e.type));
      slide.elements.forEach((e, j) => {
        const g = got.elements[j];
        close(g.x, e.x);
        close(g.y, e.y);
        close(g.width, e.width);
        if (e.type !== 'text') close(g.height, e.height);
        close(g.opacity, e.opacity);
        if (e.type === 'text') {
          const t = g as TextElement;
          expect(plainTextOf(t)).toBe(plainTextOf(e));
          expect(t.verticalAlign).toBe(e.verticalAlign);
          const run = (x: TextElement) => x.doc.paragraphs[0].runs.find((r) => r.text)!.props;
          expect(run(t)).toMatchObject({ fontFamily: run(e).fontFamily, fontSize: run(e).fontSize, color: run(e).color });
          expect(!!run(t).bold).toBe(!!run(e).bold);
          expect(t.doc.paragraphs.map((_, k) => listKindAt(t.doc, k))).toEqual(e.doc.paragraphs.map((_, k) => listKindAt(e.doc, k)));
          expect(t.doc.paragraphs.map((p) => p.props.align ?? 'left')).toEqual(e.doc.paragraphs.map((p) => p.props.align ?? 'left'));
        }
        if (e.type === 'shape') expect(g).toMatchObject({ shape: e.shape, stroke: e.stroke, ...(e.fill ? { fill: e.fill } : {}) });
        if (e.type === 'image') {
          expect(g).toMatchObject({ src: e.src, naturalWidth: 1, naturalHeight: 1 });
          close((g as typeof e).radius, e.radius);
        }
      });
    });
  });

  it('keeps the gradients and turns of shapes', () => {
    const turned: Deck = {
      ...deck,
      slides: [{ ...deck.slides[0], elements: [{ ...(deck.slides[0].elements[0] as ShapeElement), rotation: 30, fill: { kind: 'gradient', from: 'FF0000', to: '00FF00', angle: 45 } }] }],
    };
    const shape = importPptx(exportPptx(turned)).deck.slides[0].elements[0] as ShapeElement;
    expect(shape.rotation).toBeCloseTo(30);
    expect(shape.fill).toEqual({ kind: 'gradient', from: 'FF0000', to: '00FF00', angle: 45 });
  });
});

describe('a .pptx made by PowerPoint', () => {
  /** A deck the way PowerPoint writes one: a theme, a master with text styles and a logo, a layout with its placeholders, and a slide that fills them. */
  function powerPointFile(): Uint8Array {
    const ns =
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
    const rel = (id: string, type: string, target: string) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
    const rels = (...r: string[]) => `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${r.join('')}</Relationships>`;
    const ph = (type: string, idx: string | undefined, x: number, y: number, w: number, h: number) =>
      `<p:sp><p:nvSpPr><p:cNvPr id="2" name="ph"/><p:cNvSpPr/><p:nvPr><p:ph type="${type}"${idx ? ` idx="${idx}"` : ''}/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm></p:spPr><p:txBody><a:bodyPr anchor="b"/><a:lstStyle/><a:p><a:r><a:t>Prompt</a:t></a:r></a:p></p:txBody></p:sp>`;
    const files: Record<string, string> = {
      'ppt/presentation.xml': `<p:presentation ${ns}><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="9144000" cy="6858000"/></p:presentation>`,
      'ppt/_rels/presentation.xml.rels': rels(rel('rId1', 'theme', 'theme/theme1.xml'), rel('rId2', 'slide', 'slides/slide1.xml')),
      'ppt/theme/theme1.xml': `<a:theme ${ns}><a:themeElements><a:clrScheme name="x"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1></a:clrScheme><a:fontScheme name="x"><a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/></a:minorFont></a:fontScheme></a:themeElements></a:theme>`,
      'ppt/slideMasters/slideMaster1.xml': `<p:sldMaster ${ns}><p:cSld><p:bg><p:bgPr><a:solidFill><a:schemeClr val="bg2"/></a:solidFill></p:bgPr></p:bg><p:spTree>${ph('title', undefined, 0, 0, 9144000, 1000000)}${ph('body', '1', 0, 1500000, 9144000, 4000000)}<p:sp><p:nvSpPr><p:cNvPr id="9" name="logo"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="8000000" y="6000000"/><a:ext cx="500000" cy="500000"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:schemeClr val="accent1"><a:lumMod val="75000"/></a:schemeClr></a:solidFill></p:spPr></p:sp></p:spTree></p:cSld><p:txStyles><p:titleStyle><a:lvl1pPr algn="ctr"><a:defRPr sz="4400"><a:solidFill><a:schemeClr val="tx2"/></a:solidFill><a:latin typeface="+mj-lt"/></a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:buChar char="•"/><a:defRPr sz="2800"><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:bodyStyle></p:txStyles></p:sldMaster>`,
      'ppt/slideMasters/_rels/slideMaster1.xml.rels': rels(rel('rId1', 'theme', '../theme/theme1.xml')),
      'ppt/slideLayouts/slideLayout1.xml': `<p:sldLayout ${ns}><p:cSld><p:spTree>${ph('title', undefined, 457200, 274638, 8229600, 1143000)}${ph('body', '1', 457200, 1600200, 8229600, 4525963)}</p:spTree></p:cSld></p:sldLayout>`,
      'ppt/slideLayouts/_rels/slideLayout1.xml.rels': rels(rel('rId1', 'slideMaster', '../slideMasters/slideMaster1.xml')),
      'ppt/slides/slide1.xml': `<p:sld ${ns}><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="es"/><a:t>Hola &amp; adiós</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr><p:ph idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr><a:normAutofit fontScale="50000"/></a:bodyPr><a:p><a:r><a:t>Uno</a:t></a:r></a:p><a:p><a:r><a:rPr b="1"/><a:t>Dos</a:t></a:r></a:p></p:txBody></p:sp><p:graphicFrame/><p:grpSp><p:grpSpPr><a:xfrm><a:off x="1000000" y="1000000"/><a:ext cx="2000000" cy="2000000"/><a:chOff x="0" y="0"/><a:chExt cx="1000000" cy="1000000"/></a:xfrm></p:grpSpPr><p:cxnSp><p:nvCxnSpPr><p:cNvPr id="5" name="l"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm flipV="1"><a:off x="0" y="0"/><a:ext cx="1000000" cy="1000000"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="25400"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:ln></p:spPr></p:cxnSp></p:grpSp></p:spTree></p:cSld></p:sld>`,
      'ppt/slides/_rels/slide1.xml.rels': rels(rel('rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml')),
    };
    return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
  }

  const { deck, skipped } = importPptx(powerPointFile());
  const [slide] = deck.slides;

  it('is of the size of its slides, the background of its master', () => {
    expect(deck.size).toEqual({ width: 720, height: 540 });
    expect(slide.background).toEqual({ kind: 'solid', color: 'E7E6E6' });
    expect(skipped).toBe(1);
  });

  it('puts the shapes of its master under those of the slide, in the colours of the theme', () => {
    const logo = slide.elements[0] as ShapeElement;
    expect(logo).toMatchObject({ type: 'shape', shape: 'ellipse' });
    // accent1 4472C4 at three quarters of its lightness.
    expect(logo.fill).toEqual({ kind: 'solid', color: '2F5597' });
  });

  it('puts placeholders where their layout says, in the style their master gives them', () => {
    const [title, body] = slide.elements.filter((e): e is TextElement => e.type === 'text');
    expect(plainTextOf(title)).toBe('Hola & adiós');
    close(title.x, 36 + 7.2);
    close(title.y, 21.6 + 3.6);
    expect(title.verticalAlign).toBe('bottom');
    expect(title.doc.paragraphs[0].props.align).toBe('center');
    expect(title.doc.paragraphs[0].runs[0].props).toMatchObject({ fontSize: 44, fontFamily: 'Calibri Light', color: '44546A' });
    expect(plainTextOf(body)).toBe('Uno\nDos');
    // Shrunk by half to fit, a bulleted list.
    expect(body.doc.paragraphs[1].runs[0].props).toMatchObject({ fontSize: 14, bold: true, fontFamily: 'Calibri' });
    expect(listKindAt(body.doc, 0)).toBe('bullet');
  });

  it('undoes groups into their elements, and a flipped line into a turned one', () => {
    const line = slide.elements.find((e): e is ShapeElement => e.type === 'shape' && e.shape === 'line')!;
    // The group puts its box of 1,000,000 at 1,000,000 doubled: 157.5 points across, from the bottom left up.
    close(line.width, Math.hypot(157.48, 157.48));
    expect(line.rotation).toBeCloseTo(-45);
    expect(line).toMatchObject({ stroke: 'FF0000', strokeWidth: 2 });
    close(line.x + line.width / 2, 78.74 + 78.74);
  });
});
