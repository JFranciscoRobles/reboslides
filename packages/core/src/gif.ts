// An animated GIF of frames of pixels: one palette of 256 colours for all of
// them, made by median cut of the colours they have, and each frame its
// palette indices squeezed with LZW. No DOM: the frames are bytes.

export interface GifFrame {
  width: number;
  height: number;
  /** Four bytes to each pixel, row by row: red, green, blue, and an opacity the GIF leaves out. */
  rgba: Uint8Array | Uint8ClampedArray;
  /** How long it is shown, in milliseconds. */
  delay: number;
}

/** A colour as the 15 bits a palette is chosen from: five of each. */
const key15 = (r: number, g: number, b: number) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

/** The 256 colours that stand best for those counted, by median cut: the box of colours with most pixels split at its median along its longest side, until there are enough. */
function palette(counts: Uint32Array): Uint8Array {
  const colours: number[] = [];
  for (let k = 0; k < counts.length; k++) if (counts[k]) colours.push(k);
  const channel = (k: number, c: number) => (k >> (10 - c * 5)) & 31;
  let boxes: number[][] = [colours];
  while (boxes.length < 256) {
    // The box to split: the one with the most pixels of those that can be split.
    let best = -1;
    let most = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      const n = box.reduce((sum, k) => sum + counts[k], 0);
      if (n > most) (most = n), (best = i);
    });
    if (best < 0) break;
    const box = boxes[best];
    const spans = [0, 1, 2].map((c) => Math.max(...box.map((k) => channel(k, c))) - Math.min(...box.map((k) => channel(k, c))));
    const c = spans.indexOf(Math.max(...spans));
    box.sort((a, b) => channel(a, c) - channel(b, c));
    let half = 0;
    let at = 0;
    while (at < box.length - 1 && half + counts[box[at]] <= most / 2) half += counts[box[at++]];
    at = Math.max(1, at);
    boxes = [...boxes.slice(0, best), box.slice(0, at), box.slice(at), ...boxes.slice(best + 1)];
  }
  const out = new Uint8Array(256 * 3);
  boxes.forEach((box, i) => {
    let n = 0;
    const sum = [0, 0, 0];
    for (const k of box) {
      n += counts[k];
      for (let c = 0; c < 3; c++) sum[c] += channel(k, c) * counts[k];
    }
    for (let c = 0; c < 3; c++) out[i * 3 + c] = n ? Math.round(((sum[c] / n) * 255) / 31) : 0;
  });
  return out;
}

/** The palette index nearest each 15-bit colour, worked out the first time it is asked for. */
function nearest(colours: Uint8Array): (key: number) => number {
  const known = new Int16Array(32768).fill(-1);
  return (key) => {
    if (known[key] >= 0) return known[key];
    const r = (((key >> 10) & 31) * 255) / 31;
    const g = (((key >> 5) & 31) * 255) / 31;
    const b = ((key & 31) * 255) / 31;
    let best = 0;
    let distance = Infinity;
    for (let i = 0; i < 256; i++) {
      const d = (colours[i * 3] - r) ** 2 + (colours[i * 3 + 1] - g) ** 2 + (colours[i * 3 + 2] - b) ** 2;
      if (d < distance) (distance = d), (best = i);
    }
    known[key] = best;
    return best;
  };
}

/** Palette indices squeezed as a GIF squeezes them: LZW of variable width, its codes packed from the lowest bit. */
export function lzw(indices: Uint8Array, minCodeSize = 8): Uint8Array {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  const emit = (code: number, size: number) => {
    buffer |= code << bits;
    bits += size;
    while (bits >= 8) {
      bytes.push(buffer & 0xff);
      buffer >>>= 8;
      bits -= 8;
    }
  };
  let size = minCodeSize + 1;
  let next = end + 1;
  let table = new Map<number, number>();
  emit(clear, size);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const code = table.get(prefix * 256 + k);
    if (code !== undefined) {
      prefix = code;
      continue;
    }
    emit(prefix, size);
    if (next === 4096) {
      // The table is full: it starts again.
      emit(clear, size);
      table = new Map();
      next = end + 1;
      size = minCodeSize + 1;
    } else {
      if (next >= 1 << size) size++;
      table.set(prefix * 256 + k, next++);
    }
    prefix = k;
  }
  emit(prefix, size);
  emit(end, size);
  if (bits > 0) bytes.push(buffer & 0xff);
  return Uint8Array.from(bytes);
}

/** The frames as an animated GIF that plays over and over. */
export function encodeGif(frames: GifFrame[]): Uint8Array {
  if (!frames.length) throw new Error('A GIF needs a frame.');
  const { width, height } = frames[0];
  // The palette is chosen from a sample of the pixels of every frame: one in four is plenty.
  const counts = new Uint32Array(32768);
  for (const f of frames) for (let p = 0; p < f.rgba.length; p += 16) counts[key15(f.rgba[p], f.rgba[p + 1], f.rgba[p + 2])]++;
  const colours = palette(counts);
  const index = nearest(colours);

  const out: number[] = [];
  const word = (v: number) => out.push(v & 0xff, (v >> 8) & 0xff);
  const text = (s: string) => out.push(...[...s].map((c) => c.charCodeAt(0)));
  text('GIF89a');
  word(width);
  word(height);
  out.push(0xf7, 0, 0); // a global table of 256 colours
  out.push(...colours);
  // Netscape's extension: play forever.
  out.push(0x21, 0xff, 11);
  text('NETSCAPE2.0');
  out.push(3, 1, 0, 0, 0);
  for (const f of frames) {
    out.push(0x21, 0xf9, 4, 0x04); // each frame drawn over the one before, kept
    word(Math.max(2, Math.round(f.delay / 10)));
    out.push(0, 0);
    out.push(0x2c);
    word(0);
    word(0);
    word(width);
    word(height);
    out.push(0);
    const indices = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < indices.length; i++, p += 4) indices[i] = index(key15(f.rgba[p], f.rgba[p + 1], f.rgba[p + 2]));
    const data = lzw(indices);
    out.push(8);
    for (let at = 0; at < data.length; at += 255) {
      const block = data.subarray(at, at + 255);
      out.push(block.length, ...block);
    }
    out.push(0);
  }
  out.push(0x3b);
  return Uint8Array.from(out);
}
