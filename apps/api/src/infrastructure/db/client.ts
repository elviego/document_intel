import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../../shared/env'
import * as schema from './schema'

const connection = postgres(env.DATABASE_URL, { max: 10 })
export const db = drizzle(connection, { schema })
export type DB = typeof db
