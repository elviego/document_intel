import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../../shared/env.js'
import * as schema from './schema.js'

const connection = postgres(env.DATABASE_URL, { max: 10 })
export const db = drizzle(connection, { schema })
export type DB = typeof db
