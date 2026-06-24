import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { createDatabaseClient } from "../src/db/client";
import { adminCredentials } from "../src/db/schema";
import { loadLocalEnvFile, getAppEnv } from "../src/config/env";

export async function seedAdmin(
  adminEmail = process.env.ADMIN_EMAIL,
  adminPassword = process.env.ADMIN_PASSWORD,
  databaseClientOverride?: any,
) {
  loadLocalEnvFile();
  const env = getAppEnv();

  if (!adminEmail || !adminPassword) {
    console.error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be provided in the environment.",
    );
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters long.");
    process.exit(1);
  }

  const databaseClient = databaseClientOverride || createDatabaseClient(env.DATABASE_URL);

  try {
    const existingAdmin = await databaseClient.db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.email, adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log(
        `Admin account with email ${adminEmail} already exists. Skipping seed.`,
      );
      return 0; // Return exit code instead of process.exit for testability
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const id = crypto.randomUUID();

    await databaseClient.db.insert(adminCredentials).values({
      id,
      email: adminEmail,
      passwordHash,
    });

    console.log(`Successfully created admin account for ${adminEmail}.`);
    return 0;
  } catch (error) {
    console.error("Failed to seed admin account:", error);
    return 1;
  } finally {
    if (!databaseClientOverride) {
      await databaseClient.close();
    }
  }
}

if (require.main === module) {
  seedAdmin().then((code) => process.exit(code));
}
