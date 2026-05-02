import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'url'
import path from 'path'
import { env } from './shared/env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// apps/api/dist/migrate.js -> ../../../db/migrations (monorepo root)
const migrationsFolder = path.resolve(__dirname, '../../../db/migrations')

console.log('[migrate] Starting migrations...')
console.log('[migrate] Migrations folder:', migrationsFolder)

const sql = postgres(env.DATABASE_URL, { max: 1 })
const db = drizzle(sql)

try {
  await migrate(db, { migrationsFolder })
  console.log('[migrate] Migrations applied successfully')
} catch (err) {
  console.error('[migrate] Migration failed:', err)
  process.exit(1)
} finally {
  await sql.end()
}
