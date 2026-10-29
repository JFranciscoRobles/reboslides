// The package as it goes to npm: `tools/package.mjs` says how.
import { buildPackage } from '../../../tools/package.mjs';

await buildPackage('core', {
  entries: { index: 'src/index.ts' },
  exports: { '.': 'index' },
  keywords: ['slides', 'presentation', 'pptx', 'pdf', 'deck', 'templates'],
  homepage: 'https://github.com/JFranciscoRobles/reboslides#readme',
});
