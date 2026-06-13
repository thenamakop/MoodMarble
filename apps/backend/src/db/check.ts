import { getAppEnv } from "../config/env";
import { createDatabaseClient, verifyDatabaseConnection } from "./client";

async function run(): Promise<void> {
  const env = getAppEnv();
  const databaseClient = createDatabaseClient(env.DATABASE_URL);

  try {
    await verifyDatabaseConnection(databaseClient);
    console.log("Database connection OK");
  } finally {
    await databaseClient.close();
  }
}

void run();
