# Deployment

---

## Table of Contents

- [Running Locally](#running-locally)
- [Railway (API) + Vercel (Web)](#railway-api--vercel-web) ← recommended production setup
- [Railway only (API + Web)](#railway-only-api--web)
- [Storage Backends](#storage-backends) — Local · S3 · Cloudflare R2 · MinIO
- [Docker](#docker)
- [OCR Language Data](#ocr-language-data)
- [Production Checklist](#production-checklist)

---

## Running Locally

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| PostgreSQL | ≥ 14 | local install or Docker (see below) |

### 1 — Clone & install

```bash
git clone https://github.com/elviego/document_intel.git
cd document_intel
pnpm install
```

### 2 — Start PostgreSQL

**Option A — Docker (quickest)**

```bash
docker run -d \
  --name document-intel-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=document_intel \
  -p 5432:5432 \
  postgres:16-alpine
```

**Option B — local install**

```bash
# macOS
brew install postgresql@16 && brew services start postgresql@16
createdb document_intel

# Ubuntu/Debian
sudo apt install postgresql
sudo -u postgres createdb document_intel
```

### 3 — Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

**`apps/api/.env`**

```env
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/document_intel

# Generate with: openssl rand -hex 32
JWT_SECRET=changeme_use_openssl_rand

# Resend (https://resend.com — free tier, 3000 emails/month)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@example.com

CORS_ORIGIN=http://localhost:3000
APP_URL=http://localhost:3000

# File storage
OCR_UPLOAD_DIR=uploads/ocr
OCR_MAX_FILE_MB=50
STORAGE_PROVIDER=local
```

**`apps/web/.env.local`**

```env
VITE_API_URL=http://localhost:4000
```

### 4 — Run database migrations

```bash
pnpm db:migrate
# Creates all 7 OCR tables and seeds default configs for all 8 document types
```

### 5 — Start dev servers

```bash
pnpm dev
# API  →  http://localhost:4000
# Web  →  http://localhost:3000
```

Or individually:

```bash
pnpm --filter @fin-tribe/api dev
pnpm --filter @fin-tribe/web dev
```

### 6 — Create your first admin user

```bash
pnpm db:seed
```

Or via API directly:

```bash
curl -X POST http://localhost:4000/v1/auth/invite \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@example.com", "role": "admin", "name": "Admin" }'
```

Accept the invite link sent to the email address, then log in at `http://localhost:3000`.

### 7 — Add an LLM provider _(optional)_

Navigate to `http://localhost:3000/ocr/config` → **LLM Providers** → **+ Add provider**.

Plain OCR text extraction works without any LLM configured. The LLM is only needed for structured data extraction and auto document type detection.

---

## Railway (API) + Vercel (Web)

The recommended production setup. Railway handles the API and PostgreSQL; Vercel hosts the static React frontend on a global CDN.

```
User → Vercel CDN (React SPA) ──HTTPS──► Railway API ──► Railway PostgreSQL
                                                     └──► S3 / R2 (files)
```

---

### Step 1 — Provision PostgreSQL on Railway

1. Go to [railway.app](https://railway.app) → **New project**
2. Click **+ Add a service** → **Database** → **PostgreSQL**
3. Once provisioned, click the PostgreSQL service → **Connect** tab
4. Copy the **`DATABASE_URL`** (Postgres connection string)
5. Run migrations from your local machine:

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```

---

### Step 2 — Deploy the API on Railway

1. In the same Railway project → **+ Add a service** → **GitHub Repo** → select this repo
2. Railway may auto-detect the monorepo. If not, set in **Settings**:

   | Setting | Value |
   |---|---|
   | Root directory | `apps/api` |
   | Build command | `pnpm install --frozen-lockfile && pnpm build` |
   | Start command | `node dist/main.js` |

3. **Variables** tab → add all required variables:

```env
NODE_ENV=production
PORT=4000

DATABASE_URL=${{Postgres.DATABASE_URL}}

JWT_SECRET=<openssl rand -hex 32>
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# Fill in after Vercel deploy
CORS_ORIGIN=https://your-app.vercel.app
APP_URL=https://your-app.vercel.app

# Use S3 or R2 for persistent file storage
STORAGE_PROVIDER=s3
S3_BUCKET=your-bucket-name
S3_REGION=auto
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com

OCR_MAX_FILE_MB=50
```

> **Tip**: Use `${{Postgres.DATABASE_URL}}` as a Railway reference variable — it automatically links the PostgreSQL service URL and updates if credentials rotate.

4. **Settings** → **Networking** → **Generate Domain**  
   Note the Railway API URL: `https://api-production-xxxx.up.railway.app`

---

### Step 3 — Deploy the Web on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → **Import Git Repository** → select this repo
2. Configure the project:

   | Setting | Value |
   |---|---|
   | Framework Preset | **Vite** |
   | Root Directory | `apps/web` |
   | Build Command | `pnpm build` |
   | Output Directory | `dist` |
   | Install Command | `pnpm install --frozen-lockfile` |

3. **Environment Variables** → add:

```env
VITE_API_URL=https://api-production-xxxx.up.railway.app
```

4. Click **Deploy**. Vercel provides a URL like `https://your-app.vercel.app`.

---

### Step 4 — Wire CORS back to Railway

Now that you have the Vercel URL, update the Railway API service variables:

```env
CORS_ORIGIN=https://your-app.vercel.app
APP_URL=https://your-app.vercel.app
```

Railway redeploys automatically. The frontend and API are now fully connected.

---

### Step 5 — Custom domains _(optional)_

**Vercel custom domain**
- Project → **Settings** → **Domains** → **Add** → `app.yourdomain.com`
- Add a CNAME record: `app` → `cname.vercel-dns.com`

**Railway custom domain**
- Service → **Settings** → **Networking** → **Custom Domain** → `api.yourdomain.com`
- Add a CNAME record: `api` → your Railway service domain

Update Railway variables:
```env
CORS_ORIGIN=https://app.yourdomain.com
APP_URL=https://app.yourdomain.com
```

Update Vercel variable:
```env
VITE_API_URL=https://api.yourdomain.com
```

---

### Step 6 — Configure LLM providers

Open `https://your-app.vercel.app/ocr/config` → **LLM Providers** → **+ Add provider**.

---

### CI/CD — Auto-deploy on push

Both platforms watch the `main` branch by default:

- **Railway**: rebuilds and redeploys the API service on every push to `main`
- **Vercel**: rebuilds and redeploys the web on every push to `main`; pull requests get preview URLs automatically

To trigger only relevant builds, configure **root directory** in each platform's settings — Railway watches `apps/api/**`, Vercel watches `apps/web/**`.

---

## Railway only (API + Web)

Host both services on Railway from the same repository.

### API service

Follow Step 2 above exactly.

### Web service

1. **+ Add a service** → same GitHub repo
2. Settings:

   | Setting | Value |
   |---|---|
   | Root directory | `apps/web` |
   | Build command | `pnpm install && pnpm build` |
   | Start command | `npx serve dist -p $PORT` |

   Add `serve` as a dependency:
   ```bash
   pnpm --filter @fin-tribe/web add -D serve
   ```

3. Variables:

```env
VITE_API_URL=https://<api-service>.up.railway.app
```

4. Generate a domain for the web service.
5. Update the API service `CORS_ORIGIN` and `APP_URL` to the web service domain.

---

## Storage Backends

### Local (development only)

```env
STORAGE_PROVIDER=local
OCR_UPLOAD_DIR=uploads/ocr
```

Files stream through Fastify on `GET /:id/file`. Not suitable for production or horizontal scaling.

**Railway volume** (if you must use local in production): Dashboard → API service → **Volumes** → mount at `/app/uploads/ocr`, then set `OCR_UPLOAD_DIR=/app/uploads/ocr`.

---

### AWS S3

```env
STORAGE_PROVIDER=s3
S3_BUCKET=my-ocr-bucket
S3_REGION=eu-west-1
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=secret...
```

**Minimum IAM policy**:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::my-ocr-bucket/ocr/*"
  }]
}
```

---

### Cloudflare R2 _(recommended — zero egress fees)_

```env
STORAGE_PROVIDER=s3
S3_BUCKET=my-ocr-bucket
S3_REGION=auto
S3_ACCESS_KEY=<R2 Access Key ID>
S3_SECRET_KEY=<R2 Secret Access Key>
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
# Optional CDN (skips pre-signing):
# S3_PUBLIC_URL=https://ocr-files.yourdomain.com
```

**Setup**: Cloudflare Dashboard → R2 → Create bucket → Manage API Tokens → Create token with **Object Read & Write** on your bucket.

---

### MinIO (self-hosted)

```env
STORAGE_PROVIDER=s3
S3_BUCKET=ocr
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_ENDPOINT=http://minio:9000
```

**Docker Compose**:

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
    env_file: ./apps/api/.env
    environment:
      STORAGE_PROVIDER: s3
      S3_BUCKET: ocr
      S3_ENDPOINT: http://minio:9000

volumes:
  minio_data:
```

Create bucket before first run:
```bash
docker compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker compose exec minio mc mb local/ocr
```

---

## Docker

### API Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Native deps required by canvas (scanned PDF support)
RUN apk add --no-cache \
    cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev \
    python3 make g++

RUN npm install -g pnpm

# ── deps ─────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# ── build ────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm --filter @fin-tribe/api build

# ── runtime ──────────────────────────────────────────────────────
FROM base AS runtime
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules  ./node_modules

# Pre-warm Tesseract language data (avoids slow cold-start download)
RUN node -e "
  const { createWorker } = require('tesseract.js');
  (async () => { const w = await createWorker('por+eng'); await w.terminate(); })();
"

EXPOSE 4000
CMD ["node", "dist/main.js"]
```

### On Debian/Ubuntu hosts

Replace the `apk` line with:

```dockerfile
RUN apt-get update && apt-get install -y \
    build-essential libcairo2-dev libpango1.0-dev \
    libjpeg-dev libgif-dev librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*
```

---

## OCR Language Data

Tesseract.js downloads `.traineddata` files on first use (~24 MB for `por+eng`). Pre-warm them in the Docker image (shown above) or cache the directory between runs.

| Language pack | Size |
|---|---|
| `por` (Portuguese) | ~11 MB |
| `eng` (English) | ~13 MB |
| `por+eng` | ~24 MB |

Custom cache path:
```typescript
const worker = await createWorker('por+eng', 1, {
  cachePath: '/tmp/tesseract-cache',
})
```

---

## Production Checklist

### Infrastructure
- [ ] PostgreSQL provisioned and migrations applied (`pnpm db:migrate`)
- [ ] `STORAGE_PROVIDER=s3` — not local (files survive redeploys)
- [ ] S3 bucket blocks public access (previews use pre-signed URLs)
- [ ] Railway Volume **not** relied on for file storage

### Security
- [ ] `JWT_SECRET` is a strong random value (`openssl rand -hex 32`)
- [ ] `CORS_ORIGIN` set to exact production frontend URL (no trailing slash)
- [ ] Webhook secrets configured — never blank in production
- [ ] API keys for LLM providers stored only in Railway Variables (not in code)

### OCR
- [ ] Tesseract language data pre-warmed in Docker image (no cold-start delay)
- [ ] `canvas` native deps installed if scanned PDF support is needed
- [ ] `OCR_MAX_FILE_MB` tuned to your use case

### Application
- [ ] At least one LLM provider configured in admin UI
- [ ] `RESEND_API_KEY` set (needed for user invite emails)
- [ ] `EMAIL_FROM` uses a verified sender domain in Resend
- [ ] Admin user created and invite accepted
