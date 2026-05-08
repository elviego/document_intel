import { z } from 'zod'

const schema = z.object({
  NODE_ENV:       z.enum(['development', 'production', 'test']).default('development'),
  PORT:           z.coerce.number().default(4000),
  DATABASE_URL:   z.string().url(),
  JWT_SECRET:     z.string().min(32),
  CORS_ORIGIN:    z.string().default('http://localhost:3000').transform(s =>
    s.split(',').map(o => o.trim()).filter(Boolean)
  ),
  APP_URL:        z.string().url().default('http://localhost:3000'),
  RESEND_API_KEY: z.string().default(''),
  EMAIL_FROM:     z.string().default('noreply@triboverde.pt'),
  // OCR module
  OCR_UPLOAD_DIR: z.string().default('uploads/ocr'),
  OCR_MAX_FILE_MB: z.coerce.number().default(50),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌  Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
