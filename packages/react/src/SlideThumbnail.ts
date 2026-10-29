// A slide drawn small, as the studio draws it: for the list of pages of an
// interface of one's own. Inside a SlidesProvider it shares the studio's
// fonts and pictures; it is drawn again when the slide changes.

import type { Slide } from '@reboslides/core';
import { drawSlide } from '@reboslides/editor';
import { type CSSProperties, createElement, useEffect, useRef } from 'react';
import { useSlides } from './headless';

export interface SlideThumbnailProps {
  slide: Slide;
  /** Its width in CSS pixels; its height follows the deck's proportions. */
  width?: number;
  className?: string;
  style?: CSSProperties;
}

export function SlideThumbnail({ slide, width = 160, className, style }: SlideThumbnailProps) {
  const { studio, state } = useSlides();
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = state.deck.size;
  const height = Math.round((width * size.height) / size.width);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !studio) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(width * dpr);
    el.height = Math.round(height * dpr);
    const context = el.getContext('2d');
    if (context) drawSlide(context, slide, size, (width * dpr) / size.width, studio.drawContext);
  }, [studio, slide, width, height, size]);

  return createElement('canvas', { ref: canvas, className, style: { width, height, display: 'block', ...style }, 'aria-hidden': true });
}
