// @vitest-environment happy-dom
// The studio's CSS is put in the page as it is, beside that of the other
// apps of the Rebo suite: a name another of them gives too is drawn by
// whichever is put there last. ReboSlides' are all under `rsl-` and `sp-`.

import { describe, expect, it } from 'vitest';
import { injectStyles } from '../src/styles';

// The prefixes of the other apps of the suite: Rebodocs, Rebosheets, ReboFiles, Rebomail and ReboNotes.
const OTHERS = ['dx-', 'rs-', 'rf-', 'rm-', 'rn-'];

describe('the studio’s CSS', () => {
  injectStyles();
  const css = document.querySelector('style[data-reboslides]')?.textContent ?? '';
  // Its class selectors, not what is inside an address (`url(data:…www.w3.org…)`).
  const classes = [...new Set([...css.replace(/url\([^)]*\)/g, '').matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]))];

  it('is put in the page', () => {
    expect(classes.length).toBeGreaterThan(50);
  });

  it('names its classes under rsl- and sp- alone', () => {
    expect(classes.filter((name) => !name.startsWith('rsl-') && !name.startsWith('sp-'))).toEqual([]);
  });

  it('gives no class a name of another app of the suite', () => {
    expect(classes.filter((name) => OTHERS.some((prefix) => name.startsWith(prefix)))).toEqual([]);
  });
});
