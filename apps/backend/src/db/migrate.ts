import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { getAppEnv } from "../config/env";
import { createDatabaseClient } from "./client";

const MIGRATIONS_DIRECTORY = resolve(__dirname, "../../drizzle");

async function run(): Promise<void> {
  const env = getAppEnv();
  const databaseClient = createDatabaseClient(env.DATABASE_URL);

  try {
    const migrationFiles = (await readdir(MIGRATIONS_DIRECTORY))
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();

    for (const migrationFile of migrationFiles) {
      const sql = await readFile(
        resolve(MIGRATIONS_DIRECTORY, migrationFile),
        "utf8",
      );

      await databaseClient.sql.unsafe(sql);
      console.log(`Applied ${migrationFile}`);
    }
  } finally {
    await databaseClient.close();
  }
}

void run();
