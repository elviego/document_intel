# Deployment

---

## Storage Backends

### Local Storage (default)

Files are stored on the API server's filesystem. Suitable for development and small deployments.

```env
STORAGE_PROVIDER=local
OCR_UPLOAD_DIR=uploads/ocr      # relative to API working directory
OCR_MAX_FILE_MB=50
```

**Characteristics**

- Zero external dependencies
- Files served by streaming through Fastify (`GET /v1/ocr/documents/:id/file`)
- Not suitable for horizontally scaled deployments (multiple API instances won't share files)
- Back up `OCR_UPLOAD_DIR` separately from the database

**Railway note**: Railway volumes can be mounted to persist `OCR_UPLOAD_DIR` across deployments. Add a Volume in the Railway dashboard and mount it at the same path.

---

### AWS S3

```env
STORAGE_PROVIDER=s3
S3_BUCKET=my-ocr-bucket
S3_REGION=eu-west-1
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=secret...
```

**IAM policy** — minimum required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::my-ocr-bucket/ocr/*"
    }
  ]
}
```

File previews use pre-signed URLs (TTL: 3600 seconds). Set `S3_PUBLIC_URL` to skip signing if the bucket has public read access (not recommended for sensitive documents).

---

### Cloudflare R2

R2 is S3-compatible with zero egress fees. Recommended for cost-sensitive deployments.

```env
STORAGE_PROVIDER=s3
S3_BUCKET=my-ocr-bucket
S3_REGION=auto
S3_ACCESS_KEY=<R2 Access Key ID>
S3_SECRET_KEY=<R2 Secret Access Key>
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

**Setting up R2**

1. Cloudflare Dashboard → R2 → Create bucket
2. Manage R2 API Tokens → Create Token with **Object Read & Write** on your bucket
3. Copy Account ID from the R2 overview page for the endpoint URL

**With a custom domain / CDN (optional)**

```env
S3_PUBLIC_URL=https://ocr-files.yourdomain.com
```

When `S3_PUBLIC_URL` is set, file preview URLs are built as `{S3_PUBLIC_URL}/ocr/{uuid}` — no pre-signing overhead, instant URL generation.

---

### MinIO (self-hosted)

For fully on-premise deployments:

```env
STORAGE_PROVIDER=s3
S3_BUCKET=ocr
S3_REGION=us-east-1        # MinIO ignores this but it must be set
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_ENDPOINT=http://minio:9000
```

**Docker Compose example**

```yaml
services:
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  api:
    build: ./apps/api
    environment:
      STORAGE_PROVIDER: s3
      S3_BUCKET: ocr
      S3_REGION: us-east-1
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin
      S3_ENDPOINT: http://minio:9000
      DATABASE_URL: postgresql://...

volumes:
  minio_data:
```

Create the bucket before starting the API:

```bash
docker compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker compose exec minio mc mb local/ocr
```

---

## Railway Deployment

The platform is deployed on Railway. The OCR module requires no extra services beyond the existing PostgreSQL instance.

### Steps

1. **Apply migrations**

   ```bash
   # From local machine with Railway PostgreSQL DATABASE_URL
   pnpm db:migrate
   ```

2. **Set environment variables** in Railway dashboard → API service → Variables:

   ```
   OCR_UPLOAD_DIR=uploads/ocr
   OCR_MAX_FILE_MB=50
   STORAGE_PROVIDER=local     # or s3 for production
   ```

   For S3 (recommended for production):
   ```
   STORAGE_PROVIDER=s3
   S3_BUCKET=...
   S3_REGION=...
   S3_ACCESS_KEY=...
   S3_SECRET_KEY=...
   S3_ENDPOINT=...            # R2 or MinIO only
   ```

3. **Deploy** — Railway auto-deploys on push to `main`

4. **Configure LLM providers** via the admin UI at `APP_URL/ocr/config`

### Persistent storage on Railway

If using local storage on Railway, add a Volume:

1. Railway Dashboard → API service → Volumes → Add Volume
2. Mount path: `/app/uploads/ocr` (or your `OCR_UPLOAD_DIR`)
3. Set `OCR_UPLOAD_DIR=/app/uploads/ocr` in environment variables

Without a Volume, files are lost on every redeploy. **Use S3 for production.**

---

## Docker

### API Dockerfile

The existing Dockerfile should need no changes. Ensure the Tesseract language data is available — `tesseract.js` downloads it at runtime by default, which may be slow on cold starts.

**Pre-warm Tesseract data** in the image:

```dockerfile
FROM node:20-alpine

# Install canvas native dependencies (for scanned PDF support)
RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    python3 \
    make \
    g++

WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Pre-download Tesseract language data
RUN node -e "
  const { createWorker } = require('tesseract.js');
  (async () => {
    const w = await createWorker('por+eng');
    await w.terminate();
  })();
"

EXPOSE 4000
CMD ["node", "dist/main.js"]
```

### Scanned PDF requirements

The `canvas` npm package requires native build tools. On Alpine:

```dockerfile
RUN apk add --no-cache \
    cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev \
    python3 make g++
```

On Debian/Ubuntu:

```bash
apt-get install -y build-essential libcairo2-dev libpango1.0-dev \
                   libjpeg-dev libgif-dev librsvg2-dev
```

---

## OCR Language Data

Tesseract.js downloads language training data (`.traineddata` files) on first use. In production, consider caching this data:

**Cache directory** (default): `~/.cache/tesseract.js/`

Set a custom path:
```typescript
const worker = await createWorker('por+eng', 1, {
  cachePath: '/tmp/tesseract-cache',
})
```

Language data sizes:
| Language | Size |
|---|---|
| `por` (Portuguese) | ~11 MB |
| `eng` (English) | ~13 MB |
| `por+eng` | ~24 MB |

---

## Production Checklist

- [ ] `STORAGE_PROVIDER=s3` (or Cloudflare R2) — not local
- [ ] `OCR_MAX_FILE_MB` set to appropriate limit for your use case
- [ ] At least one LLM provider configured in admin UI
- [ ] JWT_SECRET is a strong random value (`openssl rand -hex 32`)
- [ ] Webhook secrets are set (not blank) for all registered webhooks
- [ ] Database has indexes from migrations applied
- [ ] Tesseract language data cached/pre-warmed in Docker image
- [ ] Canvas native deps installed (if scanned PDF support needed)
- [ ] `OCR_UPLOAD_DIR` has write permissions (local storage only)
- [ ] S3 bucket policy blocks public access (use pre-signed URLs only)
- [ ] CORS_ORIGIN set to the production web domain
- [ ] Rate limiting configured on the API (Fastify `@fastify/rate-limit`)
