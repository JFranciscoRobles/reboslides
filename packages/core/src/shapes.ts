// The outline of each kind of shape, in the coordinates of its box: moves,
// straight lines and cubic curves, which a canvas, an SVG and a PDF all draw.

import type { ShapeKind } from './model';

export type PathCommand = { op: 'M' | 'L'; x: number; y: number } | { op: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number } | { op: 'Z' };

/** How far along a quarter of a circle the control points of its cubic curve are. */
const KAPPA = 0.5522847498;

const M = (x: number, y: number): PathCommand => ({ op: 'M', x, y });
const L = (x: number, y: number): PathCommand => ({ op: 'L', x, y });
const C = (x1: number, y1: number, x2: number, y2: number, x: number, y: number): PathCommand => ({ op: 'C', x1, y1, x2, y2, x, y });
const Z: PathCommand = { op: 'Z' };

function polygon(points: [number, number][]): PathCommand[] {
  return [...points.map(([x, y], i) => (i ? L(x, y) : M(x, y))), Z];
}

/** The corners of a polygon of `n` sides round the centre of a box `w` by `h`, the first at the top; every other one drawn in to `inner` of the way, for a star. */
function regular(n: number, w: number, h: number, inner?: number): [number, number][] {
  const points: [number, number][] = [];
  const count = inner ? n * 2 : n;
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    const r = inner && i % 2 ? inner : 1;
    points.push([w / 2 + (Math.cos(angle) * r * w) / 2, h / 2 + (Math.sin(angle) * r * h) / 2]);
  }
  return points;
}

function ellipse(x: number, y: number, w: number, h: number): PathCommand[] {
  const rx = w / 2;
  const ry = h / 2;
  const cx = x + rx;
  const cy = y + ry;
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    M(cx + rx, cy),
    C(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry),
    C(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy),
    C(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry),
    C(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy),
    Z,
  ];
}

/** A box with its corners rounded `r`, no more than half its shorter side. */
export function roundedRect(x: number, y: number, w: number, h: number, radius: number): PathCommand[] {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (!r)
    return polygon([
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ]);
  const k = r * (1 - KAPPA);
  return [
    M(x + r, y),
    L(x + w - r, y),
    C(x + w - k, y, x + w, y + k, x + w, y + r),
    L(x + w, y + h - r),
    C(x + w, y + h - k, x + w - k, y + h, x + w - r, y + h),
    L(x + r, y + h),
    C(x + k, y + h, x, y + h - k, x, y + h - r),
    L(x, y + r),
    C(x, y + k, x + k, y, x + r, y),
    Z,
  ];
}

export function shapePath(kind: ShapeKind, w: number, h: number): PathCommand[] {
  switch (kind) {
    case 'rect':
      return roundedRect(0, 0, w, h, 0);
    case 'roundRect':
      return roundedRect(0, 0, w, h, Math.min(w, h) * 0.18);
    case 'ellipse':
      return ellipse(0, 0, w, h);
    case 'triangle':
      return polygon([
        [w / 2, 0],
        [w, h],
        [0, h],
      ]);
    case 'diamond':
      return polygon([
        [w / 2, 0],
        [w, h / 2],
        [w / 2, h],
        [0, h / 2],
      ]);
    case 'pentagon':
      return polygon(regular(5, w, h));
    case 'hexagon':
      return polygon([
        [w * 0.25, 0],
        [w * 0.75, 0],
        [w, h / 2],
        [w * 0.75, h],
        [w * 0.25, h],
        [0, h / 2],
      ]);
    case 'star':
      return polygon(regular(5, w, h, 0.45));
    case 'arrow': {
      const head = Math.min(w * 0.45, h);
      return polygon([
        [0, h * 0.3],
        [w - head, h * 0.3],
        [w - head, 0],
        [w, h / 2],
        [w - head, h],
        [w - head, h * 0.7],
        [0, h * 0.7],
      ]);
    }
    case 'heart':
      return [
        M(w / 2, h * 0.28),
        C(w / 2, h * 0.1, w * 0.35, 0, w * 0.22, 0),
        C(w * 0.05, 0, 0, h * 0.15, 0, h * 0.3),
        C(0, h * 0.55, w * 0.3, h * 0.75, w / 2, h),
        C(w * 0.7, h * 0.75, w, h * 0.55, w, h * 0.3),
        C(w, h * 0.15, w * 0.95, 0, w * 0.78, 0),
        C(w * 0.65, 0, w / 2, h * 0.1, w / 2, h * 0.28),
        Z,
      ];
    case 'line':
      return [M(0, h / 2), L(w, h / 2)];
  }
}

/** The outline as the `d` of an SVG path. */
export function svgPath(commands: PathCommand[]): string {
  const n = (v: number) => Math.round(v * 100) / 100;
  return commands.map((c) => (c.op === 'Z' ? 'Z' : c.op === 'C' ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}` : `${c.op}${n(c.x)} ${n(c.y)}`)).join('');
}

export const SHAPE_NAMES: Record<ShapeKind, string> = {
  rect: 'Rectángulo',
  roundRect: 'Rectángulo redondeado',
  ellipse: 'Círculo',
  triangle: 'Triángulo',
  diamond: 'Rombo',
  pentagon: 'Pentágono',
  hexagon: 'Hexágono',
  star: 'Estrella',
  arrow: 'Flecha',
  heart: 'Corazón',
  line: 'Línea',
};
