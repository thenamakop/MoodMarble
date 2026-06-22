import { inject } from "./http-client";
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
    const response = await inject(app, {
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
    const response = await inject(app, {
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
    const listResponse = await inject(app, {
      method: "GET",
      url: `/admin/workspace/${TEST_WORKSPACE_ID}/teams`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });
    const createResponse = await inject(app, {
      method: "POST",
      url: "/admin/team",
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
      payload: {
        name: "Product",
      },
    });
    const updateResponse = await inject(app, {
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

  it("requires a valid scoped admin token on protected admin endpoints", async () => {
    const protectedRequests = [
      {
        method: "GET" as const,
        url: `/admin/workspace/${TEST_WORKSPACE_ID}/teams`,
      },
      {
        method: "POST" as const,
        url: "/admin/team",
        payload: {
          name: "Product",
        },
      },
      {
        method: "PATCH" as const,
        url: `/admin/team/${TEST_TEAM_ID}`,
        payload: {
          name: "Engineering",
        },
      },
      {
        method: "GET" as const,
        url: `/admin/workspace/${TEST_WORKSPACE_ID}/join-code`,
      },
      {
        method: "POST" as const,
        url: `/admin/workspace/${TEST_WORKSPACE_ID}/join-code`,
      },
      {
        method: "GET" as const,
        url: `/admin/workspace/${TEST_WORKSPACE_ID}/export?start_date=2026-06-01&end_date=2026-06-30`,
      },
    ];

    for (const request of protectedRequests) {
      const response = await inject(app, request);

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        message: "Unauthorized",
      });
    }
  });

  it("rejects manager tokens on all protected admin endpoints", async () => {
    const { managerJwt } = createManagerJwt(JWT_SECRET, {
      workspace_id: TEST_WORKSPACE_ID,
      team_id: TEST_TEAM_ID,
      role: "manager",
    });

    const protectedRequests = [
      {
        method: "GET" as const,
        url: `/admin/workspace/${TEST_WORKSPACE_ID}/teams`,
      },
      {
        method: "POST" as const,
        url: "/admin/team",
        payload: {
          name: "Product",
        },
      },
      {
        method: "PATCH" as const,
        url: `/admin/team/${TEST_TEAM_ID}`,
        payload: {
          name: "Engineering",
        },
      },
      {
        method: "GET" as const,
        url: `/admin/workspace/${TEST_WORKSPACE_ID}/join-code`,
      },
      {
        method: "POST" as const,
        url: `/admin/workspace/${TEST_WORKSPACE_ID}/join-code`,
      },
      {
        method: "GET" as const,
        url: `/admin/workspace/${TEST_WORKSPACE_ID}/export?start_date=2026-06-01&end_date=2026-06-30`,
      },
    ];

    for (const request of protectedRequests) {
      const response = await inject(app, {
        ...request,
        headers: {
          authorization: `Bearer ${managerJwt}`,
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        message: "Unauthorized",
      });
    }
  });

  it("forbids admin workspace routes outside the token workspace scope", async () => {
    const listResponse = await inject(app, {
      method: "GET",
      url: `/admin/workspace/${OTHER_WORKSPACE_ID}/teams`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });
    const joinCodeResponse = await inject(app, {
      method: "GET",
      url: `/admin/workspace/${OTHER_WORKSPACE_ID}/join-code`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });
    const exportResponse = await inject(app, {
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
    const getJoinCodeResponse = await inject(app, {
      method: "GET",
      url: `/admin/workspace/${TEST_WORKSPACE_ID}/join-code`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });
    const rotateJoinCodeResponse = await inject(app, {
      method: "POST",
      url: `/admin/workspace/${TEST_WORKSPACE_ID}/join-code`,
      headers: {
        authorization: createAdminAuthorizationHeader(),
      },
    });
    const exportResponse = await inject(app, {
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
    expect(exportResponse.headers["content-disposition"]).toBe(
      'attachment; filename="moodmarble-ws_admin-2026-06-01-to-2026-06-30.csv"',
    );
    const [headerRow, dataRow] = exportResponse.body.trim().split("\n");

    expect(headerRow).toBe(
      "team_id,team_name,mood_type,tags,note_hash,hour_of_day,submission_date",
    );
    expect(dataRow).toBeTruthy();
    expect(exportResponse.body).toContain('"tm_product","Product","focused"');
    expect(exportResponse.body).not.toContain("device_token");
    expect(exportResponse.body).not.toContain("device_jwt");
    expect(exportResponse.body).not.toContain("member_id");
    expect(exportResponse.body).not.toContain("personal_history");
    expect(exportResponse.body).not.toContain("note,");
    expect(exportResponse.body).not.toContain("email");
    expect(exportResponse.body).not.toContain("history");
  });

  it("rejects invalid admin payloads and export date ranges", async () => {
    const invalidTeamResponse = await inject(app, {
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
    const invalidExportResponse = await inject(app, {
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
