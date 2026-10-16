# file-storage-api

A file API on **`@forinda/kickjs-storage`**: upload with type and size limits, list, download, delete, and expiring signed download links — on a local folder in development and an S3-compatible bucket (AWS S3, Cloudflare R2, MinIO) in production, behind one `Storage` interface.

- `src/adapters/storage.adapter.ts` — `StorageAdapter` picks the driver from `STORAGE_DRIVER` (`diskStorage({ root: UPLOAD_DIR })` or `s3FromSettings()`), binds it to `STORAGE`, declares the `S3_*` settings section for the bucket (a missing `S3_BUCKET` stops startup), and reports `storage:<driver>` on `GET /health/ready` with a one-key `list()`.
- `src/modules/files/files.controller.ts` — the routes. `@FileUpload({ maxSize, allowedTypes })` answers **413** for a file over `MAX_UPLOAD_BYTES` and **415** for a type outside png / jpeg / pdf / text. Downloads stream through `ctx.sendResponse(new Response(stream))` with `nosniff`.
- `src/modules/files/files.service.ts` — keys are `files/<uuid>.<ext>` (never the client's filename); signed URLs: the bucket presigns its own GET (`storage.url(key, { expiresIn })`, expiry enforced by the bucket), disk gets an app-signed `/files/:id/signed?expires=&sig=` (HMAC with `SIGNING_SECRET`; expired or tampered → **403**).
- `src/guards/api-key.guard.ts` — `Authorization: Bearer <API_KEY>` on every route except the signed-link target.

Guide: [File Storage](https://kickjs.app/guide/file-storage) · [File Uploads](https://kickjs.app/guide/file-uploads) · API: [@forinda/kickjs-storage](https://kickjs.app/api/storage)

## Routes (`/api/v1/files`)

| Method & path                   | Auth          | Answer                                                         |
| ------------------------------- | ------------- | -------------------------------------------------------------- |
| `POST /` (form field `file`)    | API key       | `201 { id, size, contentType }`, `413`, `415`                  |
| `GET /?cursor=`                 | API key       | `{ files: [{ id, size, contentType, lastModified }], cursor }` |
| `GET /:id`                      | API key       | the file, or `404`                                             |
| `GET /:id/url?expiresIn=`       | API key       | `{ url, expiresAt }` — 1 s to 7 days, default 300 s            |
| `GET /:id/signed?expires=&sig=` | the signature | the file, or `403` when expired / tampered (disk driver)       |
| `DELETE /:id`                   | API key       | `204`, or `404`                                                |

## Env

| Variable                                                                            | Default (dev)               | Notes                                     |
| ----------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------- |
| `STORAGE_DRIVER`                                                                    | `disk` (`s3` in production) |                                           |
| `UPLOAD_DIR`                                                                        | `uploads`                   | disk driver; relative to the project root |
| `MAX_UPLOAD_BYTES`                                                                  | `5242880`                   | over it → 413                             |
| `API_KEY`                                                                           | `dev-api-key`               | required in production, 32+ chars         |
| `SIGNING_SECRET`                                                                    | dev-only default            | required in production, 32+ chars         |
| `PUBLIC_URL`                                                                        | the request's Host          | base of disk signed URLs                  |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` | —                           | s3 driver; `S3_ENDPOINT` for MinIO / R2   |

## Run

```bash
pnpm install          # or: npm install
cp .env.example .env
pnpm dev              # or: npm run dev — files land in ./uploads
```

```bash
K='authorization: Bearer dev-api-key'
ID=$(curl -s -H "$K" -F 'file=@README.md;type=text/plain' localhost:3000/api/v1/files \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
curl -s -H "$K" localhost:3000/api/v1/files
URL=$(curl -s -H "$K" "localhost:3000/api/v1/files/$ID/url?expiresIn=60" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).url')
curl "$URL"                                  # no API key needed; 403 after 60 s
curl -X DELETE -H "$K" localhost:3000/api/v1/files/$ID
curl localhost:3000/health/ready             # {"status":"ready","checks":[{"name":"storage:disk","status":"up"}]}
```

Against MinIO (what production looks like):

```bash
docker run -d --rm --name files-minio -p 9000:9000 minio/minio server /data
docker exec files-minio sh -c 'mc alias set local http://localhost:9000 minioadmin minioadmin && mc mb local/files'
pnpm build            # or: npm run build
STORAGE_DRIVER=s3 S3_BUCKET=files S3_REGION=us-east-1 S3_ENDPOINT=http://localhost:9000 \
  S3_ACCESS_KEY_ID=minioadmin S3_SECRET_ACCESS_KEY=minioadmin pnpm start
# same curl calls; /url now returns a presigned MinIO URL
```

## Test

```bash
pnpm test             # or: npm test
```

`src/modules/files/files.test.ts` runs the module with `STORAGE` overridden by `memoryStorage()`: upload → list → download → delete (then 404); 413 over the limit and 415 for `text/html`, with nothing stored; 401 without the API key; a signed URL works without the key, a tampered id or expiry gets 403, and so does the same URL once its time has passed.
