// The text of a box set by the engine of rebodocs: its paragraphs laid out
// down one page as wide as the box, with no margins, the way the engine sets a
// document on a screen. The lines it gives are in the coordinates of the box;
// the caret, the selection and the point under the pointer come from the same
// layout, so what is drawn and what is edited are one.

import {
  type Layout,
  type LayoutCache,
  type ParagraphProps,
  type Range,
  type RunProps,
  type TextMeasurer,
  applyRunProps,
  docEnd,
  layoutContinuous,
  resolveRun,
  setParagraphProps,
} from '@rebodocs/core/internal';
import type { TextElement, VerticalAlign } from './model';

/** The lines of the box, from its top left corner, before it is placed by `verticalAlign`. */
export function textLayout(element: TextElement, measurer: TextMeasurer, cache?: LayoutCache): Layout {
  const { doc } = element;
  const page = { width: element.width, height: 0, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 };
  return layoutContinuous({ ...doc, page }, measurer, cache);
}

/** How tall the text of a laid out box is. */
export function textHeight(layout: Layout): number {
  return layout.page.height;
}

/** How far down the box its text starts, for text `height` tall in a box `boxHeight` tall. */
export function textOffset(align: VerticalAlign, height: number, boxHeight: number): number {
  const room = Math.max(0, boxHeight - height);
  return align === 'middle' ? room / 2 : align === 'bottom' ? room : 0;
}

/** The box with its height made that of its text, when it follows its text. */
export function fitText(element: TextElement, measurer: TextMeasurer, cache?: LayoutCache): TextElement {
  if (!element.autoHeight) return element;
  const height = Math.max(1, textHeight(textLayout(element, measurer, cache)));
  return Math.abs(height - element.height) < 0.01 ? element : { ...element, height };
}

/** The whole of the text of a box. */
export function wholeText(element: TextElement): Range {
  return { from: { para: 0, offset: 0 }, to: docEnd(element.doc) };
}

/** The box with `patch` given to all its text, as a change made with the box picked and not its text. */
export function formatAllText(element: TextElement, run: RunProps = {}, paragraph?: ParagraphProps): TextElement {
  let doc = Object.keys(run).length ? applyRunProps(element.doc, wholeText(element), run) : element.doc;
  if (Object.keys(run).length) {
    // The marks that end the paragraphs take it too, so that an empty one and what is typed into it later have it.
    doc = { ...doc, paragraphs: doc.paragraphs.map((p) => ({ ...p, runs: p.runs.map((r) => (r.text ? r : { ...r, props: { ...r.props, ...run } })) })) };
  }
  if (paragraph) doc = setParagraphProps(doc, 0, doc.paragraphs.length - 1, paragraph);
  return { ...element, doc };
}

/** The formatting of the first letter of the box: what a toolbar shows for a box picked whole. */
export function leadingRun(element: TextElement) {
  const run = element.doc.paragraphs[0]?.runs.find((r) => r.text) ?? element.doc.paragraphs[0]?.runs[0];
  return resolveRun(run?.props ?? {});
}

/** The plain text of the box, a line to each paragraph. */
export function plainTextOf(element: TextElement): string {
  return element.doc.paragraphs.map((p) => p.runs.map((r) => r.text).join('')).join('\n');
}

/** The document with every size in it made `k` times as big: the text of a box scaled by its corner. */
export function scaleText(doc: TextElement['doc'], k: number): TextElement['doc'] {
  const round = (v: number) => Math.round(v * 10) / 10;
  const scaleRun = (props: RunProps): RunProps => ({ ...props, fontSize: Math.max(1, round((props.fontSize ?? 11) * k)) });
  return {
    ...doc,
    paragraphs: doc.paragraphs.map((p) => ({
      ...p,
      props: {
        ...p.props,
        ...(p.props.spacingAfter !== undefined ? { spacingAfter: round(p.props.spacingAfter * k) } : {}),
        ...(p.props.spacingBefore !== undefined ? { spacingBefore: round(p.props.spacingBefore * k) } : {}),
        ...(p.props.indentLeft !== undefined ? { indentLeft: round(p.props.indentLeft * k) } : {}),
        ...(p.props.indentFirstLine !== undefined ? { indentFirstLine: round(p.props.indentFirstLine * k) } : {}),
      },
      runs: p.runs.map((r) => ({ ...r, props: scaleRun(r.props) })),
    })),
  };
}
