// Lets the page of the demo read from and write to the bucket through the addresses the backend signs.
//
//   npm run cors -w @reboslides/storage            (with the bucket in .env)

import { openBucket } from '../server/bucket';

process.loadEnvFile('.env');
const origins = process.argv.slice(2).length ? process.argv.slice(2) : ['http://localhost:5195'];
await openBucket().allowOrigins(origins);
console.log(`El bucket ${process.env.S3_BUCKET} acepta ahora a ${origins.join(', ')}.`);
