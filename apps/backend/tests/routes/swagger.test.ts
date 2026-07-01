import { inject } from "./http-client";
import { buildApp } from "../../src/app";
import { createDatabaseClient } from "../../src/db/client";

const JWT_SECRET = "test-jwt-secret-for-swagger";

describe("Swagger / OpenAPI documentation", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    const databaseClient = createDatabaseClient("postgresql://test:test@localhost:5432/test");
    app = await buildApp({ jwtSecret: JWT_SECRET, databaseClient });
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /docs/json", () => {
    it("returns HTTP 200 with a valid OpenAPI 3.x JSON document", async () => {
      const response = await inject(app, {
        method: "GET",
        url: "/docs/json",
      });

      expect(response.statusCode).toBe(200);
      const spec = response.json() as {
        openapi: string;
        info: { title: string; version: string };
        paths: Record<string, unknown>;
      };
      expect(spec.openapi).toMatch(/^3\./);
      expect(spec.info.title).toBe("MoodMarble API");
      expect(spec.info.version).toBe("1.0.0");
    });

    it("documents all public routes", async () => {
      const response = await inject(app, {
        method: "GET",
        url: "/docs/json",
      });
      const paths = Object.keys((response.json() as { paths: Record<string, unknown> }).paths);

      expect(paths).toContain("/health");
      expect(paths).toContain("/auth/login");
      expect(paths).toContain("/auth/redeem-manager-code");
      expect(paths).toContain("/workspace/join");
      expect(paths).toContain("/workspace/team-member");
    });

    it("documents all device-protected routes", async () => {
      const response = await inject(app, {
        method: "GET",
        url: "/docs/json",
      });
      const paths = Object.keys((response.json() as { paths: Record<string, unknown> }).paths);

      expect(paths).toContain("/mood");
    });

    it("documents all manager dashboard routes", async () => {
      const response = await inject(app, {
        method: "GET",
        url: "/docs/json",
      });
      const paths = Object.keys((response.json() as { paths: Record<string, unknown> }).paths);

      // Note: Fastify uses {teamId} for path params in OpenAPI, not :teamId
      expect(paths).toContain("/dashboard/team/{teamId}/daily");
      expect(paths).toContain("/dashboard/team/{teamId}/weekly");
      expect(paths).toContain("/dashboard/team/{teamId}/tags");
    });

    it("documents all admin routes", async () => {
      const response = await inject(app, {
        method: "GET",
        url: "/docs/json",
      });
      const paths = Object.keys((response.json() as { paths: Record<string, unknown> }).paths);

      expect(paths).toContain("/admin/workspace");
      expect(paths).toContain("/admin/team");
      expect(paths).toContain("/admin/workspace/{workspaceId}/teams");
      expect(paths).toContain("/admin/workspace/{workspaceId}/join-code");
      expect(paths).toContain("/admin/workspace/{workspaceId}/export");
      expect(paths).toContain("/admin/workspace/{workspaceId}/manager-codes");
    });

    it("declares the three security schemes", async () => {
      const response = await inject(app, {
        method: "GET",
        url: "/docs/json",
      });
      const spec = response.json() as {
        components: { securitySchemes: Record<string, unknown> };
      };
      const schemes = Object.keys(spec.components.securitySchemes);

      expect(schemes).toContain("deviceJwt");
      expect(schemes).toContain("managerJwt");
      expect(schemes).toContain("adminJwt");
    });

    it("does NOT expose test-fixture routes in the spec", async () => {
      const response = await inject(app, {
        method: "GET",
        url: "/docs/json",
      });
      const paths = Object.keys((response.json() as { paths: Record<string, unknown> }).paths);

      // None of the paths should contain "test" or "fixture" or "seed"
      const testPaths = paths.filter(
        (p) => p.includes("test") || p.includes("fixture") || p.includes("seed"),
      );
      expect(testPaths).toHaveLength(0);
    });
  });

  describe("GET /docs", () => {
    it("serves the Swagger UI HTML or redirects to it", async () => {
      const response = await inject(app, {
        method: "GET",
        url: "/docs",
      });
      // Swagger UI returns 200 (with trailing slash redirect) or
      // 301/302 depending on swaggerUi version — both are acceptable.
      expect([200, 301, 302]).toContain(response.statusCode);
    });
  });
});
