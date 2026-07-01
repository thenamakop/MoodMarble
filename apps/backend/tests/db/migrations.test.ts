import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const MIGRATIONS_DIRECTORY = resolve(__dirname, "../../drizzle");

describe("drizzle migration files", () => {
  it("do not define duplicate types with non-idempotent CREATE TYPE", async () => {
    const migrationFiles = (await readdir(MIGRATIONS_DIRECTORY))
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();

    const typeDefinitions = new Map<string, string[]>();

    for (const migrationFile of migrationFiles) {
      const sql = await readFile(resolve(MIGRATIONS_DIRECTORY, migrationFile), "utf8");

      // Match CREATE TYPE statements that are not guarded by IF NOT EXISTS.
      const nonIdempotentTypeRegex =
        /CREATE\s+TYPE\s+(?:"public"\s*\.\s*)?"?([^"\s(]+)"?\s+AS\s+ENUM/gi;

      let match;
      while ((match = nonIdempotentTypeRegex.exec(sql)) !== null) {
        const typeName = match[1];
        const files = typeDefinitions.get(typeName) ?? [];
        files.push(migrationFile);
        typeDefinitions.set(typeName, files);
      }
    }

    const duplicates = Array.from(typeDefinitions.entries()).filter(
      ([, files]) => files.length > 1,
    );

    expect(duplicates).toEqual([]);
  });

  it("use IF NOT EXISTS for all CREATE TABLE statements", async () => {
    const migrationFiles = (await readdir(MIGRATIONS_DIRECTORY))
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();

    for (const migrationFile of migrationFiles) {
      const sql = await readFile(resolve(MIGRATIONS_DIRECTORY, migrationFile), "utf8");

      const createTableRegex = /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/gi;
      const nonIdempotentMatches = sql.match(createTableRegex) ?? [];

      expect({
        file: migrationFile,
        nonIdempotentCreateTableCount: nonIdempotentMatches.length,
      }).toEqual({
        file: migrationFile,
        nonIdempotentCreateTableCount: 0,
      });
    }
  });
});
