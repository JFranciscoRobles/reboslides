// The package as it goes to npm: `tools/package.mjs` says how.
import { buildPackage } from '../../../tools/package.mjs';

await buildPackage('mcp', {
  entries: { index: 'src/tools.ts', main: 'src/main.ts' },
  exports: { '.': 'index' },
  bin: { 'reboslides-mcp': 'main' },
  node: true,
  keywords: ['mcp', 'model-context-protocol', 'ai', 'assistant', 'claude', 'slides', 'presentation'],
  homepage: 'https://github.com/JFranciscoRobles/reboslides#readme',
});
