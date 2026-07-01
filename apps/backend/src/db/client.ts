import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema";

export interface DatabaseClient {
  db: PostgresJsDatabase<typeof schema>;
  sql: Sql;
  close(): Promise<void>;
}

/**
 * Creates a database client for the configured PostgreSQL schema.
 *
 * @param databaseUrl - The PostgreSQL connection URL
 * @returns A database client with Drizzle access, the underlying SQL connection, and a close method
 */
export function createDatabaseClient(databaseUrl: string): DatabaseClient {
  const sql = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  return {
    db: drizzle(sql, {
      schema,
    }),
    sql,
    async close(): Promise<void> {
      await sql.end();
    },
  };
}

/**
 * Verifies that the database connection is reachable.
 *
 * @param databaseClient - The database client to test.
 */
export async function verifyDatabaseConnection(databaseClient: DatabaseClient): Promise<void> {
  await databaseClient.sql`select version()`;
}
