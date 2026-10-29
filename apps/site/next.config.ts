import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  // Plain files, to put on any host: the site has nothing to run on a server.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // The packages are written in TypeScript and given as their sources: those of ReboSlides, and the engine of rebodocs beside it.
  transpilePackages: ['@reboslides/core', '@reboslides/editor', '@reboslides/react', '@reboslides/collab', '@rebodocs/core', '@rebodocs/editor'],
  // ReboSlides takes the engine from rebodocs, in the folder beside it: the root holds both.
  turbopack: { root: path.join(import.meta.dirname, '../../..') },
};

export default config;
