import jwt from "jsonwebtoken";
import { inject } from "./http-client";
import { buildApp } from "../../src/app";
import { ADMIN_BOOTSTRAP_HEADER } from "../../src/auth/admin-bootstrap";
import { createAdminJwt } from "../../src/auth/admin-jwt";
import { createDeviceJwt } from "../../src/auth/device-jwt";
import { createManagerJwt } from "../../src/auth/manager-jwt";
import type { AdminApiService } from "../../src/services/admin-api";
import { AdminWorkspaceNotFoundError, AdminTeamNotFoundError } from "../../src/services/admin-api";

const JWT_SECRET = "test-jwt-secret";
const ADMIN_BOOTSTRAP_SECRET = "test-admin-bootstrap-secret";
const TEST_WORKSPACE_ID = "ws_admin";
const TEST_TEAM_ID = "tm_product";

describe("admin auth hardening", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    const adminApiService: AdminApiService = {
      async createWorkspace(payload) {
        return {
          workspace: {
            id: TEST_WORKSPACE_ID,
            name: payload.name,
            join_code: "abc123",
          },
          admin_jwt: createAdminJwt(JWT_SECRET, {
            workspace_id: TEST_WORKSPACE_ID,
            role: "admin",
          }).adminJwt,
        };
      },
      async createTeam({ workspaceId, payload }) {
        return {
          team: {
            id: TEST_TEAM_ID,
            workspace_id: workspaceId,
            name: payload.name,
          },
        };
      },
      async updateTeam({ workspaceId, teamId, payload }) {
        return {
          team: {
            id: teamId,
            workspace_id: workspaceId,
            name: payload.name,
          },
        };
      },
      async listTeams(workspaceId) {
        if (workspaceId !== TEST_WORKSPACE_ID) {
          throw new AdminWorkspaceNotFoundError();
        }
        return {
          teams: [
            {
              id: TEST_TEAM_ID,
              workspace_id: workspaceId,
              name: "Product",
            },
          ],
        };
      },
      async getJoinCode(workspaceId) {
        return {
          workspace: {
            id: workspaceId,
            join_code: "abc123",
          },
        };
      },
      async rotateJoinCode(workspaceId) {
        return {
          workspace: {
            id: workspaceId,
            join_code: "q7m4k2",
          },
        };
      },
      async getExportRows() {
        return [];
      },
    };

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      adminBootstrapSecret: ADMIN_BOOTSTRAP_SECRET,
      adminApiService,
    });
  });

  describe("bootstrap route isolation", () => {
    it("rejects admin JWT on the bootstrap workspace creation route", async () => {
      const response = await inject(app, {
        method: "POST",
        url: "/admin/workspace",
        headers: {
          authorization: createAdminJwt(JWT_SECRET, {
            workspace_id: TEST_WORKSPACE_ID,
            role: "admin",
          }).adminJwt,
        },
        payload: {
          name: "MoodMarble HQ",
        },
      });

      // Bootstrap route requires the bootstrap header, not an Authorization header
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        message: "Unauthorized",
      });
    });

    it("rejects manager JWT on the bootstrap workspace creation route", async () => {
      const { managerJwt } = createManagerJwt(JWT_SECRET, {
        workspace_id: TEST_WORKSPACE_ID,
        team_id: TEST_TEAM_ID,
        role: "manager",
      });

      const response = await inject(app, {
        method: "POST",
        url: "/admin/workspace",
        headers: {
          authorization: `Bearer ${managerJwt}`,
        },
        payload: {
          name: "MoodMarble HQ",
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        message: "Unauthorized",
      });
    });

    it("rejects device JWT on the bootstrap workspace creation route", async () => {
      const { deviceJwt } = createDeviceJwt(
        JWT_SECRET,
        TEST_WORKSPACE_ID,
        "550e8400-e29b-41d4-a716-446655440000",
      );

      const response = await inject(app, {
        method: "POST",
        url: "/admin/workspace",
        headers: {
          authorization: `Bearer ${deviceJwt}`,
        },
        payload: {
          name: "MoodMarble HQ",
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        message: "Unauthorized",
      });
    });
  });

  describe("consistent error shapes", () => {
    it("returns { message } shape for 401 Unauthorized errors", async () => {
      const response = await inject(app, {
        method: "GET",
        url: `/admin/workspace/${TEST_WORKSPACE_ID}/teams`,
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body).toEqual({ message: "Unauthorized" });
      expect(Object.keys(body)).toEqual(["message"]);
    });

    it("returns { message } shape for 403 Forbidden errors", async () => {
      const response = await inject(app, {
        method: "GET",
        url: `/admin/workspace/ws_other/teams`,
        headers: {
          authorization: `Bearer ${
            createAdminJwt(JWT_SECRET, {
              workspace_id: TEST_WORKSPACE_ID,
              role: "admin",
            }).adminJwt
          }`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body).toEqual({ message: "Forbidden" });
      expect(Object.keys(body)).toEqual(["message"]);
    });

    it("returns { message, issues } shape for 400 validation errors", async () => {
      const response = await inject(app, {
        method: "POST",
        url: "/admin/team",
        headers: {
          authorization: `Bearer ${
            createAdminJwt(JWT_SECRET, {
              workspace_id: TEST_WORKSPACE_ID,
              role: "admin",
            }).adminJwt
          }`,
        },
        payload: {
          name: "Product",
          unexpected_field: "should cause strict validation error",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body).toHaveProperty("message");
      expect(body).toHaveProperty("issues");
      expect(Array.isArray(body.issues)).toBe(true);
    });
  });

  describe("generic 404 messages", () => {
    it("returns a generic 404 message that does not reveal workspace existence", async () => {
      const notFoundApp = await buildApp({
        jwtSecret: JWT_SECRET,
        adminBootstrapSecret: ADMIN_BOOTSTRAP_SECRET,
        adminApiService: {
          async createWorkspace() {
            throw new AdminWorkspaceNotFoundError();
          },
          async createTeam() {
            throw new AdminWorkspaceNotFoundError();
          },
          async updateTeam() {
            throw new AdminTeamNotFoundError();
          },
          async listTeams() {
            throw new AdminWorkspaceNotFoundError();
          },
          async getJoinCode() {
            throw new AdminWorkspaceNotFoundError();
          },
          async rotateJoinCode() {
            throw new AdminWorkspaceNotFoundError();
          },
          async getExportRows() {
            throw new AdminWorkspaceNotFoundError();
          },
        },
      });

      const response = await inject(notFoundApp, {
        method: "POST",
        url: "/admin/team",
        headers: {
          authorization: `Bearer ${
            createAdminJwt(JWT_SECRET, {
              workspace_id: TEST_WORKSPACE_ID,
              role: "admin",
            }).adminJwt
          }`,
        },
        payload: {
          name: "Product",
        },
      });

      expect(response.statusCode).toBe(404);
      // Message must be generic — must NOT say "Workspace not found." or "Team not found."
      expect(response.json()).toEqual({
        message: "Resource not found.",
      });
      expect(response.json().message).not.toContain("Workspace");
      expect(response.json().message).not.toContain("Team");
    });

    it("returns the same generic 404 for team not found", async () => {
      const notFoundApp = await buildApp({
        jwtSecret: JWT_SECRET,
        adminBootstrapSecret: ADMIN_BOOTSTRAP_SECRET,
        adminApiService: {
          async createWorkspace() {
            throw new AdminWorkspaceNotFoundError();
          },
          async createTeam() {
            throw new AdminWorkspaceNotFoundError();
          },
          async updateTeam() {
            throw new AdminTeamNotFoundError();
          },
          async listTeams() {
            throw new AdminWorkspaceNotFoundError();
          },
          async getJoinCode() {
            throw new AdminWorkspaceNotFoundError();
          },
          async rotateJoinCode() {
            throw new AdminWorkspaceNotFoundError();
          },
          async getExportRows() {
            throw new AdminWorkspaceNotFoundError();
          },
        },
      });

      const response = await inject(notFoundApp, {
        method: "PATCH",
        url: `/admin/team/${TEST_TEAM_ID}`,
        headers: {
          authorization: `Bearer ${
            createAdminJwt(JWT_SECRET, {
              workspace_id: TEST_WORKSPACE_ID,
              role: "admin",
            }).adminJwt
          }`,
        },
        payload: {
          name: "Renamed",
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        message: "Resource not found.",
      });
    });
  });
});
