import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'url'
import path from 'path'
import { env } from './shared/env'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// apps/api/dist/migrate.js -> ../../../db/migrations (monorepo root)
const migrationsFolder = path.resolve(__dirname, '../../../db/migrations')

const sql = postgres(env.DATABASE_URL, { max: 1 })
const db = drizzle(sql)

await migrate(db, { migrationsFolder })
await sql.end()

console.log('Migrations applied successfully')
