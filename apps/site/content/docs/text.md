# Text, set by rebodocs

The text of a box is not a string: it is a `Doc` of [`@rebodocs/core`](https://rebodocs.com/docs/packages/), the same paragraphs and runs a Word document has. ReboSlides lays it out with the rebodocs engine across the width of the box, as one page with no margins.

That is why a box of text has real paragraphs, bullets and numbers, line spacing, alignment and justification, and why the caret, the selection and the point under the pointer agree with what is drawn: they all come from one layout.

## Laying it out

```ts
import { textLayout, textHeight, fitText } from '@reboslides/core';

const layout = textLayout(box, measurer); // lines, each with its fragments, in the coordinates of the box
const height = textHeight(layout);
const fitted = fitText(box, measurer); // the box as tall as its text, when autoHeight
```

A **measurer** says how wide text is and how tall its lines are. In the browser the studio uses `CanvasMeasurer` from `@rebodocs/editor`, which measures with the fonts the page has. In Node, `FontMeasurer` from `@rebodocs/core` measures with font files:

```ts
import { FontMeasurer, readFont } from '@rebodocs/core';

const measurer = new FontMeasurer([readFont(await readFile('Inter-Regular.ttf'))!]);
```

## Formatting

The formatting is that of rebodocs: `RunProps` (`fontFamily`, `fontSize`, `bold`, `italic`, `underline`, `strike`, `color`, `highlight`…) and `ParagraphProps` (`align`, `lineHeight`, `spacingBefore`, `spacingAfter`, indents…).

| Function | What it does |
| --- | --- |
| `formatAllText(box, run?, paragraph?)` | Gives all the text of a box the same formatting, empty paragraphs too. |
| `leadingRun(box)` | The formatting of its first letter. |
| `scaleText(doc, k)` | Every size in the text `k` times as big: sizes, spacing, indents. |
| `plainTextOf(box)` | Its text, a line to each paragraph. |
| `wholeText(box)` | The range from its start to its end. |
| `textOffset(align, height, boxHeight)` | How far down text sits in a taller box. |

For a part of the text, use the operations of rebodocs on `box.doc`: `insertText`, `deleteRange`, `splitParagraph`, `applyRunProps`, `setParagraphProps`, `toggleList`. The studio edits text with exactly these.

```ts
import { applyRunProps, toggleList } from '@rebodocs/core';

const doc = toggleList(applyRunProps(box.doc, range, { bold: true }), 0, box.doc.paragraphs.length - 1, 'bullet');
```
