// The lengths a person works in. The deck keeps every length in points; a
// deck says which unit it is shown in, so that one made for a screen is
// measured in pixels and one made for paper in centimetres or inches.

export const UNITS = ['px', 'pt', 'cm', 'in'] as const;
export type Unit = (typeof UNITS)[number];

/** The unit a deck is shown in when it says none. */
export const DEFAULT_UNIT: Unit = 'px';

export const UNIT_NAMES: Record<Unit, string> = { px: 'Píxeles (px)', pt: 'Puntos (pt)', cm: 'Centímetros (cm)', in: 'Pulgadas (in)' };

/** Points in one of each unit: a pixel is a 96th of an inch, as CSS has it. */
const POINTS: Record<Unit, number> = { px: 0.75, pt: 1, cm: 72 / 2.54, in: 72 };

/** The places after the point a length is shown with, and the step a field moves it by. */
export const UNIT_PRECISION: Record<Unit, { decimals: number; step: number }> = {
  px: { decimals: 0, step: 1 },
  pt: { decimals: 1, step: 1 },
  cm: { decimals: 2, step: 0.1 },
  in: { decimals: 2, step: 0.01 },
};

/** Points as a length in `unit`. */
export const toUnit = (points: number, unit: Unit) => points / POINTS[unit];
/** A length in `unit` as points. */
export const fromUnit = (value: number, unit: Unit) => value * POINTS[unit];

/** Points written in `unit`, rounded as the unit is read: "1080 px", "21 cm". */
export function formatLength(points: number, unit: Unit): string {
  const value = Number(toUnit(points, unit).toFixed(UNIT_PRECISION[unit].decimals));
  return `${value.toLocaleString('es', { maximumFractionDigits: UNIT_PRECISION[unit].decimals })} ${unit}`;
}

export interface SizePreset {
  id: string;
  name: string;
  /** In its own unit, as it is known: 1080 × 1920 px, 21 × 29.7 cm. */
  width: number;
  height: number;
  unit: Unit;
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'wide', name: 'Presentación 16:9', width: 1280, height: 720, unit: 'px' },
  { id: 'standard', name: 'Presentación 4:3', width: 1024, height: 768, unit: 'px' },
  { id: 'fullhd', name: 'Full HD', width: 1920, height: 1080, unit: 'px' },
  { id: 'a4-landscape', name: 'A4 horizontal', width: 29.7, height: 21, unit: 'cm' },
  { id: 'a4-portrait', name: 'A4 vertical', width: 21, height: 29.7, unit: 'cm' },
  { id: 'letter-landscape', name: 'Carta horizontal', width: 11, height: 8.5, unit: 'in' },
  { id: 'letter-portrait', name: 'Carta vertical', width: 8.5, height: 11, unit: 'in' },
  { id: 'square', name: 'Publicación cuadrada', width: 1080, height: 1080, unit: 'px' },
  { id: 'portrait-post', name: 'Publicación vertical 4:5', width: 1080, height: 1350, unit: 'px' },
  { id: 'story', name: 'Historia 9:16', width: 1080, height: 1920, unit: 'px' },
  { id: 'banner', name: 'Banner 1200 × 627', width: 1200, height: 627, unit: 'px' },
  { id: 'card', name: 'Tarjeta de presentación', width: 3.5, height: 2, unit: 'in' },
];

/** A preset's size in points. */
export const presetSize = (preset: SizePreset) => ({ width: fromUnit(preset.width, preset.unit), height: fromUnit(preset.height, preset.unit) });

/** The preset a size is, if it is one, its sides within a hundredth of a point. */
export function presetOf(size: { width: number; height: number }): SizePreset | undefined {
  return SIZE_PRESETS.find((p) => {
    const s = presetSize(p);
    return Math.abs(s.width - size.width) < 0.01 && Math.abs(s.height - size.height) < 0.01;
  });
}
