import { describe, expect, it } from "vitest";

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

    const createWorkspaceResponse = await app.inject({
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

    const joinWorkspaceResponse = await app.inject({
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

    const createWorkspaceResponse = await app.inject({
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

    const createTeamResponse = await app.inject({
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

    const renameTeamResponse = await app.inject({
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

    const listTeamsResponse = await app.inject({
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

    const joinWorkspaceResponse = await app.inject({
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

  it("keeps the workspace creation route protected by the bootstrap secret", async () => {
    const app = await buildApp({
      jwtSecret: JWT_SECRET,
      adminBootstrapSecret: ADMIN_BOOTSTRAP_SECRET,
    });

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
});
