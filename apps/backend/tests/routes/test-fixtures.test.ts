import { inject } from "./http-client";
import { buildApp } from "../../src/app";
import type { DatabaseClient } from "../../src/db/client";

const JWT_SECRET = "test-jwt-secret";

describe("test-fixtures routes", () => {
  it("rejects test reset in production environment", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const mockDatabaseClient = {
        db: {
          execute: jest.fn(),
          insert: jest.fn(),
        },
      } as unknown as DatabaseClient;

      const app = await buildApp({
        jwtSecret: JWT_SECRET,
        databaseClient: mockDatabaseClient,
      });

      const response = await inject(app, {
        method: "POST",
        url: "/__test/reset",
      });

      expect(response.statusCode).toBe(404);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("resets the database in non-production environments", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    try {
      const mockInsertReturn = {
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue(true),
        }),
      };

      const mockDatabaseClient = {
        db: {
          execute: jest.fn().mockResolvedValue(true),
          insert: jest.fn().mockReturnValue(mockInsertReturn),
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        },
      } as unknown as DatabaseClient;

      const app = await buildApp({
        jwtSecret: JWT_SECRET,
        databaseClient: mockDatabaseClient,
      });

      const response = await inject(app, {
        method: "POST",
        url: "/__test/reset",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("reset_ok");
      expect(mockDatabaseClient.db.execute).toHaveBeenCalled();
      expect(mockDatabaseClient.db.insert).toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
