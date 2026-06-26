import { inject } from "./http-client";

import {
  AdminTeamListResponseSchema,
  AdminWorkspaceCreateResponseSchema,
  WorkspaceJoinResponseSchema,
} from "../../../../packages/shared";
import { buildApp } from "../../src/app";
import { ADMIN_BOOTSTRAP_HEADER } from "../../src/auth/admin-bootstrap";

const JWT_SECRET = "test-jwt-secret";
const ADMIN_BOOTSTRAP_SECRET = "test-admin-bootstrap-secret";

describe("admin workspace creation integration", () => {
  it("creates a workspace and makes its join code usable by the existing join path", async () => {
    const app = await buildApp({
      jwtSecret: JWT_SECRET,
      adminBootstrapSecret: ADMIN_BOOTSTRAP_SECRET,
    });

    const createWorkspaceResponse = await inject(app, {
      method: "POST",
      url: "/admin/workspace",
      headers: {
        [ADMIN_BOOTSTRAP_HEADER]: ADMIN_BOOTSTRAP_SECRET,
      },
      payload: {
        name: "MoodMarble HQ",
      },
    });

    expect(createWorkspaceResponse.statusCode).toBe(201);
    expect(() =>
      AdminWorkspaceCreateResponseSchema.parse(createWorkspaceResponse.json()),
    ).not.toThrow();
    expect(createWorkspaceResponse.json().workspace.join_code).toMatch(
      /^[A-Z0-9]{6}$/u,
    );
    expect(createWorkspaceResponse.json()).not.toHaveProperty("email");
    expect(createWorkspaceResponse.json().workspace).not.toHaveProperty(
      "created_at",
    );

    const joinWorkspaceResponse = await inject(app, {
      method: "POST",
      url: "/workspace/join",
      payload: {
        join_code: createWorkspaceResponse.json().workspace.join_code,
        device_token: "550e8400-e29b-41d4-a716-446655440000",
      },
    });

    expect(joinWorkspaceResponse.statusCode).toBe(200);
    expect(() =>
      WorkspaceJoinResponseSchema.parse(joinWorkspaceResponse.json()),
    ).not.toThrow();
    expect(joinWorkspaceResponse.json()).toEqual({
      workspace: {
        id: createWorkspaceResponse.json().workspace.id,
        name: "MoodMarble HQ",
      },
      teams: [],
      device_jwt: expect.any(String),
    });
  });

  it("creates and renames teams inside a workspace while keeping onboarding team options valid", async () => {
    const app = await buildApp({
      jwtSecret: JWT_SECRET,
      adminBootstrapSecret: ADMIN_BOOTSTRAP_SECRET,
    });

    const createWorkspaceResponse = await inject(app, {
      method: "POST",
      url: "/admin/workspace",
      headers: {
        [ADMIN_BOOTSTRAP_HEADER]: ADMIN_BOOTSTRAP_SECRET,
      },
      payload: {
        name: "MoodMarble HQ",
      },
    });
    const adminAuthorization = `Bearer ${createWorkspaceResponse.json().admin_jwt}`;

    const createTeamResponse = await inject(app, {
      method: "POST",
      url: "/admin/team",
      headers: {
        authorization: adminAuthorization,
      },
      payload: {
        name: "Product",
      },
    });

    expect(createTeamResponse.statusCode).toBe(201);
    expect(createTeamResponse.json()).toEqual({
      team: {
        id: expect.stringMatching(/^tm_[a-z0-9]{10}$/u),
        workspace_id: createWorkspaceResponse.json().workspace.id,
        name: "Product",
      },
    });

    const renameTeamResponse = await inject(app, {
      method: "PATCH",
      url: `/admin/team/${createTeamResponse.json().team.id}`,
      headers: {
        authorization: adminAuthorization,
      },
      payload: {
        name: "Engineering",
      },
    });

    expect(renameTeamResponse.statusCode).toBe(200);
    expect(renameTeamResponse.json()).toEqual({
      team: {
        id: createTeamResponse.json().team.id,
        workspace_id: createWorkspaceResponse.json().workspace.id,
        name: "Engineering",
      },
    });

    const listTeamsResponse = await inject(app, {
      method: "GET",
      url: `/admin/workspace/${createWorkspaceResponse.json().workspace.id}/teams`,
      headers: {
        authorization: adminAuthorization,
      },
    });

    expect(listTeamsResponse.statusCode).toBe(200);
    expect(() =>
      AdminTeamListResponseSchema.parse(listTeamsResponse.json()),
    ).not.toThrow();
    expect(listTeamsResponse.json()).toEqual({
      teams: [
        {
          id: createTeamResponse.json().team.id,
          workspace_id: createWorkspaceResponse.json().workspace.id,
          name: "Engineering",
        },
      ],
    });

    const joinWorkspaceResponse = await inject(app, {
      method: "POST",
      url: "/workspace/join",
      payload: {
        join_code: createWorkspaceResponse.json().workspace.join_code,
        device_token: "550e8400-e29b-41d4-a716-446655440001",
      },
    });

    expect(joinWorkspaceResponse.statusCode).toBe(200);
    expect(() =>
      WorkspaceJoinResponseSchema.parse(joinWorkspaceResponse.json()),
    ).not.toThrow();
    expect(joinWorkspaceResponse.json()).toEqual({
      workspace: {
        id: createWorkspaceResponse.json().workspace.id,
        name: "MoodMarble HQ",
      },
      teams: [
        {
          id: createTeamResponse.json().team.id,
          name: "Engineering",
        },
      ],
      device_jwt: expect.any(String),
    });
  });

  it("exports sanitized CSV rows for the workspace without affecting public join or manager flows", async () => {
    const app = await buildApp({
      jwtSecret: JWT_SECRET,
      adminBootstrapSecret: ADMIN_BOOTSTRAP_SECRET,
    });

    const createWorkspaceResponse = await inject(app, {
      method: "POST",
      url: "/admin/workspace",
      headers: {
        [ADMIN_BOOTSTRAP_HEADER]: ADMIN_BOOTSTRAP_SECRET,
      },
      payload: {
        name: "MoodMarble HQ",
      },
    });
    const adminAuthorization = `Bearer ${createWorkspaceResponse.json().admin_jwt}`;

    const createTeamResponse = await inject(app, {
      method: "POST",
      url: "/admin/team",
      headers: {
        authorization: adminAuthorization,
      },
      payload: {
        name: "Product",
      },
    });

    const joinWorkspaceResponse = await inject(app, {
      method: "POST",
      url: "/workspace/join",
      payload: {
        join_code: createWorkspaceResponse.json().workspace.join_code,
        device_token: "550e8400-e29b-41d4-a716-446655440010",
      },
    });

    const deviceAuthorization = `Bearer ${joinWorkspaceResponse.json().device_jwt}`;

    const firstMoodResponse = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: deviceAuthorization,
      },
      payload: {
        workspace_id: createWorkspaceResponse.json().workspace.id,
        team_id: createTeamResponse.json().team.id,
        mood_type: "focused",
        tags: ["#workload", "#deadlines"],
        note: "Need some breathing room today.",
        hour_of_day: 14,
        submission_date: "2026-06-12",
      },
    });
    const secondMoodResponse = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: deviceAuthorization,
      },
      payload: {
        workspace_id: createWorkspaceResponse.json().workspace.id,
        team_id: createTeamResponse.json().team.id,
        mood_type: "calm",
        tags: ["#management"],
        note: "Feeling steadier this afternoon.",
        hour_of_day: 16,
        submission_date: "2026-07-02",
      },
    });

    expect(firstMoodResponse.statusCode).toBe(201);
    expect(secondMoodResponse.statusCode).toBe(201);

    const exportResponse = await inject(app, {
      method: "GET",
      url: `/admin/workspace/${createWorkspaceResponse.json().workspace.id}/export?start_date=2026-06-01&end_date=2026-06-30`,
      headers: {
        authorization: adminAuthorization,
      },
    });

    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.headers["content-type"]).toContain("text/csv");
    expect(exportResponse.headers["content-disposition"]).toBe(
      `attachment; filename="moodmarble-${createWorkspaceResponse.json().workspace.id}-2026-06-01-to-2026-06-30.csv"`,
    );
    const [headerRow, firstDataRow] = exportResponse.body.trim().split("\n");

    expect(headerRow).toBe(
      "team_id,team_name,mood_type,tags,hour_of_day,submission_date",
    );
    expect(firstDataRow).toBeTruthy();
    expect(exportResponse.body).toContain(
      `"${createTeamResponse.json().team.id}","Product","focused","[""#workload"",""#deadlines""]",`,
    );
    expect(exportResponse.body).toContain('"14","2026-06-12"');
    expect(exportResponse.body).not.toContain(
      "Need some breathing room today.",
    );
    expect(exportResponse.body).not.toContain(
      "Feeling steadier this afternoon.",
    );
    expect(exportResponse.body).not.toContain(
      "550e8400-e29b-41d4-a716-446655440010",
    );
    expect(exportResponse.body).not.toContain("mr_001");
    expect(exportResponse.body).not.toContain("device_jwt");
    expect(exportResponse.body).not.toContain("device_token");
    expect(exportResponse.body).not.toContain("member_id");
    expect(exportResponse.body).not.toContain("email");
    expect(exportResponse.body).not.toContain("personal_history");
    expect(exportResponse.body).not.toContain("history");
    expect(exportResponse.body).not.toContain("2026-07-02");

    const rejoinResponse = await inject(app, {
      method: "POST",
      url: "/workspace/join",
      payload: {
        join_code: createWorkspaceResponse.json().workspace.join_code,
        device_token: "550e8400-e29b-41d4-a716-446655440011",
      },
    });

    expect(rejoinResponse.statusCode).toBe(200);
    expect(() =>
      WorkspaceJoinResponseSchema.parse(rejoinResponse.json()),
    ).not.toThrow();
    expect(rejoinResponse.json().teams).toEqual([
      {
        id: createTeamResponse.json().team.id,
        name: "Product",
      },
    ]);
  });

  it("keeps the workspace creation route protected by the bootstrap secret", async () => {
    const app = await buildApp({
      jwtSecret: JWT_SECRET,
      adminBootstrapSecret: ADMIN_BOOTSTRAP_SECRET,
    });

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
});
