// The package as it goes to npm: `tools/package.mjs` says how.
import { buildPackage } from '../../../tools/package.mjs';

await buildPackage('collab', {
  entries: { index: 'src/protocol.ts', browser: 'src/session.ts', server: 'src/server.ts', storage: 'src/storage.ts', main: 'src/main.ts' },
  exports: { '.': 'index', './browser': 'browser', './server': 'server', './storage': 'storage' },
  bin: { 'reboslides-collab': 'main' },
  node: true,
  keywords: ['slides', 'presentation', 'collaboration', 'real-time', 'websocket'],
  homepage: 'https://github.com/JFranciscoRobles/reboslides#readme',
});
