# Storage demo

Decks kept in an S3 bucket: list them, with their first slide as a thumbnail, open one in the studio, save it back (each save keeps a version beside it under `versions/`, to restore from the side). For Cloudflare R2, AWS S3, MinIO, or anything else that speaks S3. Without a bucket in `.env`, a folder (`./files`) takes its place, with the same calls and signed addresses, so the demo runs as it is.

```bash
npm run storage                                  # from the root: http://localhost:5195, the decks in ./files
cp apps/storage/.env.example apps/storage/.env   # to use a bucket instead: fill it in, then
npm run cors -w @reboslides/storage              # lets http://localhost:5195 reach the bucket
```

| File | What it is |
| --- | --- |
| `server/bucket.ts` | The bucket through the S3 API, and the folder that takes its place: list, read, write, signed addresses. The one place with the keys. |
| `server/api.ts` | The routes the page asks: the files, a new one, addresses to read and write, versions. |
| `src/App.tsx` | The list with thumbnails (`slidePicture` of `@reboslides/viewer`), the studio, the versions. |
| `test/api.test.ts` | The backend against the folder, through its signed addresses. |

It is made to run on your own machine: nothing checks who is asking. `server/api.ts` says where an application checks it.
