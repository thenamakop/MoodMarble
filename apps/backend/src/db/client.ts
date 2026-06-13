import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema";

export interface DatabaseClient {
  db: PostgresJsDatabase<typeof schema>;
  sql: Sql;
  close(): Promise<void>;
}

export function createDatabaseClient(databaseUrl: string): DatabaseClient {
  const sql = postgres(databaseUrl, {
    max: 1,
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

export async function verifyDatabaseConnection(
  databaseClient: DatabaseClient,
): Promise<void> {
  await databaseClient.sql`select version()`;
}
