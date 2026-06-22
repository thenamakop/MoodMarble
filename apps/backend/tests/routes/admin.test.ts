import { beforeEach, describe, expect, it } from "vitest";
import {
  AdminJoinCodeResponseSchema,
  AdminTeamListResponseSchema,
  AdminTeamResponseSchema,
  AdminWorkspaceCreateResponseSchema,
} from "../../../../packages/shared";
import { buildApp } from "../../src/app";
import { ADMIN_BOOTSTRAP_HEADER } from "../../src/auth/admin-bootstrap";
import { createAdminJwt } from "../../src/auth/admin-jwt";
import { createManagerJwt } from "../../src/auth/manager-jwt";
import type { AdminApiService } from "../../src/services/admin-api";

const JWT_SECRET = "test-jwt-secret";
const ADMIN_BOOTSTRAP_SECRET = "test-admin-bootstrap-secret";
const TEST_WORKSPACE_ID = "ws_admin";
const OTHER_WORKSPACE_ID = "ws_other";
const TEST_TEAM_ID = "tm_product";

describe("admin routes", () => {
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
          admin_jwt: createAdminAuthorizationHeader().replace("Bearer ", ""),
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
        return [
          {
            team_id: TEST_TEAM_ID,
            team_name: "Product",
            mood_type: "focused",
            tags: ["#workload", "#deadlines"],
            note_hash: "sha256:abc123",
            hour_of_day: 14,
            submission_date: "2026-06-22",
          },
        ];
      },
    };

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      adminBootstrapSecret: ADMIN_BOOTSTRAP_SECRET,
      adminApiService,
    });
  });

  it("creates a workspace through the bootstrap-only admin entrypoint", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workspace",
      headers: {
        [ADMIN_BOOTSTRAP_HEADER]: ADMIN_BOOTSTRAP_SECRET,
      },
      payload: {
        name: "  MoodMarble HQ  ",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(() =>
      AdminWorkspaceCreateResponseSchema.parse(response.json()),
    ).not.toThrow();
    expect(response.json()).toMatchObject({
      workspace: {
        id: TEST_WORKSPACE_ID,
        name: "MoodMarble HQ",
        join_code: "ABC123",
      },
    });
    expect(response.json()).not.toHaveProperty("email");
    expect(response.json().workspace).not.toHaveProperty("created_at");
  });

  it("rejects workspace creation without the bootstrap secret", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workspace",
      payload: {
        name: "MoodMarble HQ",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: "Unauthorized",
    });
  });

  it("lists, creates, and updates teams through admin-only routes", async () => {
    const listResponse = await app.inject({
      method: "GET",
      url: `/admin/workspace/${TEST_WORKSPACE_ID}/teams`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });
    const createResponse = await app.inject({
      method: "POST",
      url: "/admin/team",
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
      payload: {
        name: "Product",
      },
    });
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/admin/team/${TEST_TEAM_ID}`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
      payload: {
        name: "Engineering",
      },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(() =>
      AdminTeamListResponseSchema.parse(listResponse.json()),
    ).not.toThrow();
    expect(listResponse.json()).toEqual({
      teams: [
        {
          id: TEST_TEAM_ID,
          workspace_id: TEST_WORKSPACE_ID,
          name: "Product",
        },
      ],
    });

    expect(createResponse.statusCode).toBe(201);
    expect(() =>
      AdminTeamResponseSchema.parse(createResponse.json()),
    ).not.toThrow();
    expect(createResponse.json().team.workspace_id).toBe(TEST_WORKSPACE_ID);

    expect(updateResponse.statusCode).toBe(200);
    expect(() =>
      AdminTeamResponseSchema.parse(updateResponse.json()),
    ).not.toThrow();
    expect(updateResponse.json()).toEqual({
      team: {
        id: TEST_TEAM_ID,
        workspace_id: TEST_WORKSPACE_ID,
        name: "Engineering",
      },
    });
  });

  it("rejects manager tokens on admin routes", async () => {
    const { managerJwt } = createManagerJwt(JWT_SECRET, {
      workspace_id: TEST_WORKSPACE_ID,
      team_id: TEST_TEAM_ID,
      role: "manager",
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/team",
      headers: {
        authorization: `Bearer ${managerJwt}`,
      },
      payload: {
        name: "Product",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: "Unauthorized",
    });
  });

  it("forbids admin workspace routes outside the token workspace scope", async () => {
    const listResponse = await app.inject({
      method: "GET",
      url: `/admin/workspace/${OTHER_WORKSPACE_ID}/teams`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });
    const joinCodeResponse = await app.inject({
      method: "GET",
      url: `/admin/workspace/${OTHER_WORKSPACE_ID}/join-code`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });
    const exportResponse = await app.inject({
      method: "GET",
      url: `/admin/workspace/${OTHER_WORKSPACE_ID}/export?start_date=2026-06-01&end_date=2026-06-30`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });

    expect(listResponse.statusCode).toBe(403);
    expect(listResponse.json()).toEqual({
      message: "Forbidden",
    });
    expect(joinCodeResponse.statusCode).toBe(403);
    expect(joinCodeResponse.json()).toEqual({
      message: "Forbidden",
    });
    expect(exportResponse.statusCode).toBe(403);
    expect(exportResponse.json()).toEqual({
      message: "Forbidden",
    });
  });

  it("returns safe join-code and CSV export responses for the scoped admin workflow", async () => {
    const getJoinCodeResponse = await app.inject({
      method: "GET",
      url: `/admin/workspace/${TEST_WORKSPACE_ID}/join-code`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });
    const rotateJoinCodeResponse = await app.inject({
      method: "POST",
      url: `/admin/workspace/${TEST_WORKSPACE_ID}/join-code`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });
    const exportResponse = await app.inject({
      method: "GET",
      url: `/admin/workspace/${TEST_WORKSPACE_ID}/export?start_date=2026-06-01&end_date=2026-06-30`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });

    expect(getJoinCodeResponse.statusCode).toBe(200);
    expect(() =>
      AdminJoinCodeResponseSchema.parse(getJoinCodeResponse.json()),
    ).not.toThrow();
    expect(getJoinCodeResponse.json()).toEqual({
      workspace: {
        id: TEST_WORKSPACE_ID,
        join_code: "ABC123",
      },
    });

    expect(rotateJoinCodeResponse.statusCode).toBe(200);
    expect(rotateJoinCodeResponse.json()).toEqual({
      workspace: {
        id: TEST_WORKSPACE_ID,
        join_code: "Q7M4K2",
      },
    });

    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.headers["content-type"]).toContain("text/csv");
    expect(exportResponse.body).toContain(
      "team_id,team_name,mood_type,tags,note_hash,hour_of_day,submission_date",
    );
    expect(exportResponse.body).toContain('"tm_product","Product","focused"');
    expect(exportResponse.body).not.toContain("device_token");
    expect(exportResponse.body).not.toContain("note,");
    expect(exportResponse.body).not.toContain("email");
  });

  it("rejects invalid admin payloads and export date ranges", async () => {
    const invalidTeamResponse = await app.inject({
      method: "POST",
      url: "/admin/team",
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
      payload: {
        name: "Product",
        workspace_id: TEST_WORKSPACE_ID,
      },
    });
    const invalidExportResponse = await app.inject({
      method: "GET",
      url: `/admin/workspace/${TEST_WORKSPACE_ID}/export?start_date=2026-06-30&end_date=2026-06-01`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });

    expect(invalidTeamResponse.statusCode).toBe(400);
    expect(invalidTeamResponse.json()).toMatchObject({
      message: "Invalid admin team request.",
    });
    expect(invalidExportResponse.statusCode).toBe(400);
    expect(invalidExportResponse.json()).toMatchObject({
      message: "Invalid admin export request.",
    });
  });
});

function createAdminAuthorizationHeader(
  workspaceId: string = TEST_WORKSPACE_ID,
): string {
  const { adminJwt } = createAdminJwt(JWT_SECRET, {
    workspace_id: workspaceId,
    role: "admin",
  });

  return `Bearer ${adminJwt}`;
}
