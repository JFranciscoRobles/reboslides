// The package as it goes to npm: `tools/package.mjs` says how.
import { buildPackage } from '../../../tools/package.mjs';

await buildPackage('editor', {
  entries: { index: 'src/index.ts' },
  exports: { '.': 'index' },
  keywords: ['slides', 'presentation', 'editor', 'pptx', 'pdf', 'vanilla'],
  homepage: 'https://github.com/JFranciscoRobles/reboslides#readme',
});
