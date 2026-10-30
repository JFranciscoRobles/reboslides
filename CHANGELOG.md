# Changelog

Every package of ReboSlides is released at the same version. Before 1.0, a
minor version (0.x.0) may change the API; such changes are listed under
**Changed** with what to do about them.

## 0.7.0 — 2026-10-29

### Changed

- **The studio's classes are under `rsl-`, not `rs-`.** Rebosheets names
  its classes `rs-` too, and 23 names were the same in both (`.rs-top`,
  `.rs-menu`, `.rs-side`, `.rs-grid`…): in a page with both, the CSS put
  there last drew over the other's, and the studio's bar fell apart once a
  spreadsheet had been opened beside it. Every class and id of the studio
  goes from `rs-` to `rsl-`; those of its controls stay under `sp-`.
  **What to do:** a style of your own on the studio names `rsl-` where it
  named `rs-`. The colours, as the documentation shows them, are now
  custom properties of `.rsl-app` and `.rsl-app[data-theme='dark']`.
- **`is-selected` is `sp-selected`.** The one class with no prefix, on the
  chosen action of the properties panel, has one now.
  **What to do:** a style of your own on `.sp-action-button.is-selected`
  names `.sp-action-button.sp-selected`.

### Added

- **A test of the studio's CSS** (`packages/editor/test/styles.test.ts`):
  every class under `rsl-` or `sp-`, and none under the prefix of another
  app of the suite (`dx-` Rebodocs, `rs-` Rebosheets, `rf-` ReboFiles,
  `rm-` Rebomail, `rn-` ReboNotes).

## 0.6.0 — 2026-10-29

### Added

- **The packages on npm.** `@reboslides/core`, `editor`, `viewer`,
  `collab`, `react` and `mcp`, each built to a `dist/` of its own by
  `tools/package.mjs` and published in order by `npm run release`.

Earlier versions are in the history of the repository.
