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
    expect(nonExistentResponse.json().message).toBe("Invalid email or password.");
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

    const decoded = verifyAdminJwt(`Bearer ${loginResponse.json().admin_jwt}`, JWT_SECRET);
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
    expect(wrongPasswordResponse.json().message).toBe("Invalid email or password.");

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
  }, 10000);

  describe("POST /auth/redeem-manager-code", () => {
    const JWT_SECRET = "test-jwt-secret";

    function buildMockDb(
      overrides: {
        findFirst?: Record<string, unknown> | undefined;
      } = {},
    ) {
      const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
      const mockUpdateSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
      const mockUpdate = jest.fn().mockReturnValue({ set: mockUpdateSet });

      return {
        db: {
          query: {
            managerCodes: {
              findFirst: jest.fn().mockResolvedValue(overrides.findFirst ?? undefined),
            },
          },
          update: mockUpdate,
        },
      } as unknown as DatabaseClient;
    }

    it("returns a manager JWT for a valid, active code", async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const mockDatabaseClient = buildMockDb({
        findFirst: {
          id: "code-1",
          code: "MGR001",
          workspaceId: "ws_localdemo",
          teamId: "tm_product",
          expiresAt,
          usedAt: null,
          isRevoked: 0,
          team: { name: "Product", workspaceId: "ws_localdemo" },
        },
      });

      const app = await buildApp({
        jwtSecret: JWT_SECRET,
        databaseClient: mockDatabaseClient,
      });

      const response = await inject(app, {
        method: "POST",
        url: "/auth/redeem-manager-code",
        payload: { code: "MGR001" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty("manager_jwt");
      expect(body.workspace_id).toBe("ws_localdemo");
      expect(body.team_id).toBe("tm_product");
      expect(body.team_name).toBe("Product");
      expect(body.manager_teams).toBe("tm_product:Product");
    });

    it("rejects a malformed code", async () => {
      const mockDatabaseClient = buildMockDb();
      const app = await buildApp({
        jwtSecret: JWT_SECRET,
        databaseClient: mockDatabaseClient,
      });

      const response = await inject(app, {
        method: "POST",
        url: "/auth/redeem-manager-code",
        payload: { code: "TOO_LONG" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toBe("Manager code must be 6 uppercase letters or numbers.");
    });

    it("transforms lowercase code to uppercase", async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const mockDatabaseClient = buildMockDb({
        findFirst: {
          id: "code-1",
          code: "MGR001",
          workspaceId: "ws_localdemo",
          teamId: "tm_product",
          expiresAt,
          usedAt: null,
          isRevoked: 0,
          team: { name: "Product", workspaceId: "ws_localdemo" },
        },
      });

      const app = await buildApp({
        jwtSecret: JWT_SECRET,
        databaseClient: mockDatabaseClient,
      });

      const response = await inject(app, {
        method: "POST",
        url: "/auth/redeem-manager-code",
        payload: { code: "mgr001" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("manager_jwt");
    });

    it("returns 404 with identical message for a missing code", async () => {
      const mockDatabaseClient = buildMockDb({ findFirst: undefined });
      const app = await buildApp({
        jwtSecret: JWT_SECRET,
        databaseClient: mockDatabaseClient,
      });

      const response = await inject(app, {
        method: "POST",
        url: "/auth/redeem-manager-code",
        payload: { code: "ABCXYZ" },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().message).toBe("Invalid or expired manager code.");
    });

    it("returns 404 with identical message for a used code", async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const mockDatabaseClient = buildMockDb({
        findFirst: {
          id: "code-1",
          code: "ABC123",
          workspaceId: "ws_localdemo",
          teamId: "tm_product",
          expiresAt,
          usedAt: new Date(),
          isRevoked: 0,
          team: { name: "Product", workspaceId: "ws_localdemo" },
        },
      });

      const app = await buildApp({
        jwtSecret: JWT_SECRET,
        databaseClient: mockDatabaseClient,
      });

      const response = await inject(app, {
        method: "POST",
        url: "/auth/redeem-manager-code",
        payload: { code: "ABC123" },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().message).toBe("Invalid or expired manager code.");
    });

    it("returns 404 with identical message for a revoked code", async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const mockDatabaseClient = buildMockDb({
        findFirst: {
          id: "code-1",
          code: "ABC123",
          workspaceId: "ws_localdemo",
          teamId: "tm_product",
          expiresAt,
          usedAt: null,
          isRevoked: 1,
          team: { name: "Product", workspaceId: "ws_localdemo" },
        },
      });

      const app = await buildApp({
        jwtSecret: JWT_SECRET,
        databaseClient: mockDatabaseClient,
      });

      const response = await inject(app, {
        method: "POST",
        url: "/auth/redeem-manager-code",
        payload: { code: "ABC123" },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().message).toBe("Invalid or expired manager code.");
    });

    it("returns 404 with identical message for an expired code", async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1);

      const mockDatabaseClient = buildMockDb({
        findFirst: {
          id: "code-1",
          code: "ABC123",
          workspaceId: "ws_localdemo",
          teamId: "tm_product",
          expiresAt,
          usedAt: null,
          isRevoked: 0,
          team: { name: "Product", workspaceId: "ws_localdemo" },
        },
      });

      const app = await buildApp({
        jwtSecret: JWT_SECRET,
        databaseClient: mockDatabaseClient,
      });

      const response = await inject(app, {
        method: "POST",
        url: "/auth/redeem-manager-code",
        payload: { code: "ABC123" },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().message).toBe("Invalid or expired manager code.");
    });

    it("keeps the seeded test-fixture code MGR001 redeemable even if used, revoked, or expired", async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1);

      const mockDatabaseClient = buildMockDb({
        findFirst: {
          id: "code-1",
          code: "MGR001",
          workspaceId: "ws_localdemo",
          teamId: "tm_product",
          expiresAt,
          usedAt: new Date(),
          isRevoked: 1,
          team: { name: "Product", workspaceId: "ws_localdemo" },
        },
      });

      const app = await buildApp({
        jwtSecret: JWT_SECRET,
        databaseClient: mockDatabaseClient,
      });

      const response = await inject(app, {
        method: "POST",
        url: "/auth/redeem-manager-code",
        payload: { code: "MGR001" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("manager_jwt");
    });
  });
});
