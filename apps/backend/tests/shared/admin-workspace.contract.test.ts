import { describe, expect, it } from "vitest";

import {
  AdminExportQuerySchema,
  AdminExportRecordSchema,
  AdminJoinCodeResponseSchema,
  AdminTeamCreateRequestSchema,
  AdminTeamResponseSchema,
  AdminTeamUpdateRequestSchema,
  AdminWorkspaceCreateRequestSchema,
  AdminWorkspaceCreateResponseSchema,
} from "../../../../packages/shared";

describe("admin workspace and team contract schemas", () => {
  it("accepts the minimal workspace creation contract", () => {
    const request = AdminWorkspaceCreateRequestSchema.parse({
      name: "  MoodMarble Local Workspace  ",
    });

    const response = AdminWorkspaceCreateResponseSchema.parse({
      workspace: {
        id: "ws_localdemo",
        name: "MoodMarble Local Workspace",
        join_code: "abc123",
      },
      admin_jwt: "signed-admin-token",
    });

    expect(request).toEqual({
      name: "MoodMarble Local Workspace",
    });
    expect(response.workspace).toEqual({
      id: "ws_localdemo",
      name: "MoodMarble Local Workspace",
      join_code: "ABC123",
    });
  });

  it("accepts minimal team create and edit contracts inside a workspace", () => {
    const createRequest = AdminTeamCreateRequestSchema.parse({
      name: "  Product  ",
    });
    const updateRequest = AdminTeamUpdateRequestSchema.parse({
      name: "  Engineering  ",
    });
    const response = AdminTeamResponseSchema.parse({
      team: {
        id: "tm_product",
        workspace_id: "ws_localdemo",
        name: "Product",
      },
    });

    expect(createRequest).toEqual({ name: "Product" });
    expect(updateRequest).toEqual({ name: "Engineering" });
    expect(response.team.workspace_id).toBe("ws_localdemo");
  });

  it("accepts a join code response and an anonymized export record", () => {
    const joinCodeResponse = AdminJoinCodeResponseSchema.parse({
      workspace: {
        id: "ws_localdemo",
        join_code: "q7m4k2",
      },
    });
    const exportRecord = AdminExportRecordSchema.parse({
      team_id: "tm_product",
      team_name: "Product",
      mood_type: "focused",
      tags: ["#workload", "#deadlines"],
      note_hash: "sha256:abc123",
      hour_of_day: 14,
      submission_date: "2026-06-22",
    });

    expect(joinCodeResponse.workspace.join_code).toBe("Q7M4K2");
    expect(exportRecord).toEqual({
      team_id: "tm_product",
      team_name: "Product",
      mood_type: "focused",
      tags: ["#workload", "#deadlines"],
      note_hash: "sha256:abc123",
      hour_of_day: 14,
      submission_date: "2026-06-22",
    });
  });

  it("rejects privacy-breaking and out-of-contract fields", () => {
    expect(() =>
      AdminWorkspaceCreateRequestSchema.parse({
        name: "Workspace",
        email: "person@example.com",
      }),
    ).toThrow();

    expect(() =>
      AdminTeamCreateRequestSchema.parse({
        name: "Product",
        workspace_id: "ws_localdemo",
      }),
    ).toThrow();

    expect(() =>
      AdminExportRecordSchema.parse({
        team_id: "tm_product",
        team_name: "Product",
        mood_type: "focused",
        tags: [],
        note_hash: null,
        note: "Raw notes must never be exported.",
        hour_of_day: 14,
        submission_date: "2026-06-22",
      }),
    ).toThrow();

    expect(() =>
      AdminExportRecordSchema.parse({
        team_id: "tm_product",
        team_name: "Product",
        mood_type: "focused",
        tags: [],
        note_hash: null,
        device_token: "550e8400-e29b-41d4-a716-446655440000",
        hour_of_day: 14,
        submission_date: "2026-06-22",
      }),
    ).toThrow();
  });

  it("requires a valid export date range", () => {
    expect(
      AdminExportQuerySchema.parse({
        start_date: "2026-06-01",
        end_date: "2026-06-30",
      }),
    ).toEqual({
      start_date: "2026-06-01",
      end_date: "2026-06-30",
    });

    expect(() =>
      AdminExportQuerySchema.parse({
        start_date: "2026-06-30",
        end_date: "2026-06-01",
      }),
    ).toThrow("start_date must be less than or equal to end_date");
  });
});
