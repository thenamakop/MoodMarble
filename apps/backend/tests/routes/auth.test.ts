import { inject } from "./http-client";
import { buildApp } from "../../src/app";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createAdminJwt, verifyAdminJwt } from "../../src/auth/admin-jwt";
import type { DatabaseClient } from "../../src/db/client";

const JWT_SECRET = "test-jwt-secret";

describe("admin login auth flow", () => {
  it("rejects login with a non-existent email", async () => {
    const mockDatabaseClient = {
      db: {
        query: {
          adminCredentials: {
            findFirst: jest.fn().mockResolvedValue(undefined),
          },
        },
      },
    } as unknown as DatabaseClient;

    const app = await buildApp({
      jwtSecret: JWT_SECRET,
      databaseClient: mockDatabaseClient,
    });

    const nonExistentResponse = await inject(app, {
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "nobody@example.com",
        password: "any-password",
      },
    });

    expect(nonExistentResponse.statusCode).toBe(401);
    expect(nonExistentResponse.json().message).toBe(
      "Invalid email or password.",
    );
  });
  it("authenticates a valid admin and enforces rate limiting", async () => {
    // Mock the DB client
    const dummyHash = await bcrypt.hash("correct-password", 12);

    const mockDatabaseClient = {
      db: {
        query: {
          adminCredentials: {
            findFirst: jest.fn().mockResolvedValue({
              id: "admin-id",
              email: "admin@example.com",
              passwordHash: dummyHash,
              active: 1,
            }),
          },
          workspaces: {
            findFirst: jest.fn().mockResolvedValue({
              id: "ws_12345",
              name: "Test Workspace",
            }),
          },
        },
      },
    } as unknown as DatabaseClient;

    const app = await buildApp({
      jwtSecret: JWT_SECRET,
      databaseClient: mockDatabaseClient,
    });

    const loginResponse = await inject(app, {
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@example.com",
        password: "correct-password",
      },
      headers: {
        "x-forwarded-for": "127.0.0.1",
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.json()).toHaveProperty("admin_jwt");
    expect(loginResponse.json()).toHaveProperty("workspace");

    const decoded = verifyAdminJwt(
      `Bearer ${loginResponse.json().admin_jwt}`,
      JWT_SECRET,
    );
    expect(decoded.workspace_id).toBe("ws_12345");
    expect(decoded.role).toBe("admin");

    // Test wrong password
    const wrongPasswordResponse = await inject(app, {
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@example.com",
        password: "wrong-password",
      },
      headers: {
        "x-forwarded-for": "127.0.0.2", // Use different IP for rate limit
      },
    });

    expect(wrongPasswordResponse.statusCode).toBe(401);
    expect(wrongPasswordResponse.json().message).toBe(
      "Invalid email or password.",
    );

    // Test missing fields
    const missingFieldsResponse = await inject(app, {
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@example.com",
      },
    });

    expect(missingFieldsResponse.statusCode).toBe(400);

    // Test rate limiting
    for (let i = 0; i < 5; i++) {
      await inject(app, {
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "admin@example.com",
          password: "wrong-password",
        },
        headers: {
          "x-forwarded-for": "127.0.0.3", // Target IP
        },
      });
    }

    const rateLimitedResponse = await inject(app, {
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@example.com",
        password: "wrong-password",
      },
      headers: {
        "x-forwarded-for": "127.0.0.3",
      },
    });

    expect(rateLimitedResponse.statusCode).toBe(429);
  });

});
