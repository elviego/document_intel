import { defineConfig } from 'drizzle-kit'
import { env } from './src/shared/env'

export default defineConfig({
  schema:      './src/infrastructure/db/schema.ts',
  out:         '../../db/migrations',
  dialect:     'postgresql',
  dbCredentials: { url: env.DATABASE_URL },
})
