// Which slides a person means by what they type: "1-3, 5", as a print
// dialog takes it.

/**
 * The slides of a deck of `count` named in `text`, from 0, in order, each
 * once; undefined when the text names none, or names one the deck has not.
 */
export function parsePages(text: string, count: number): number[] | undefined {
  const picked = new Set<number>();
  for (const part of text.split(/[,;]/)) {
    const piece = part.trim();
    if (!piece) continue;
    const m = /^(\d+)\s*(?:[-–]\s*(\d+))?$/.exec(piece);
    if (!m) return undefined;
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : Number(m[2]);
    if (from < 1 || to < from || to > count) return undefined;
    for (let n = from; n <= to; n++) picked.add(n - 1);
  }
  return picked.size ? [...picked].sort((a, b) => a - b) : undefined;
}
