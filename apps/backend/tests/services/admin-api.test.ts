import { describe, expect, it } from "vitest";

import { verifyAdminJwt } from "../../src/auth/admin-jwt";
import { InMemoryAdminApiService } from "../../src/services/admin-api";
import { InMemoryMoodSubmissionStore } from "../../src/services/mood-submissions";
import { InMemoryWorkspaceDirectory } from "../../src/services/workspace-directory";

const JWT_SECRET = "test-jwt-secret";

describe("InMemoryAdminApiService", () => {
  it("creates a workspace with a unique valid join code and admin jwt", async () => {
    const workspaceDirectory = new InMemoryWorkspaceDirectory();
    const joinCodeCandidates = ["ABC123", "Q7M4K2"];
    const moodSubmissionStore = new InMemoryMoodSubmissionStore();
    const adminApiService = new InMemoryAdminApiService({
      jwtSecret: JWT_SECRET,
      workspaceDirectory,
      moodSubmissionStore,
      workspaceIdFactory: () => "ws_admin",
      joinCodeFactory: () => {
        const candidate = joinCodeCandidates.shift();

        if (!candidate) {
          throw new Error("No join code candidate left for the test.");
        }

        return candidate;
      },
    });

    const response = await adminApiService.createWorkspace({
      name: "MoodMarble HQ",
    });

    expect(response.workspace).toEqual({
      id: "ws_admin",
      name: "MoodMarble HQ",
      join_code: "Q7M4K2",
    });
    expect(verifyAdminJwt(`Bearer ${response.admin_jwt}`, JWT_SECRET)).toEqual({
      workspace_id: "ws_admin",
      role: "admin",
    });

    await expect(workspaceDirectory.findByJoinCode("Q7M4K2")).resolves.toEqual({
      id: "ws_admin",
      name: "MoodMarble HQ",
      joinCode: "Q7M4K2",
      teams: [],
    });
  });

  it("surfaces and rotates the active join code for an existing workspace", async () => {
    const workspaceDirectory = new InMemoryWorkspaceDirectory();
    const joinCodeCandidates = ["N3W456"];
    const moodSubmissionStore = new InMemoryMoodSubmissionStore();
    const adminApiService = new InMemoryAdminApiService({
      jwtSecret: JWT_SECRET,
      workspaceDirectory,
      moodSubmissionStore,
      joinCodeFactory: () => {
        const candidate = joinCodeCandidates.shift();

        if (!candidate) {
          throw new Error("No join code candidate left for the test.");
        }

        return candidate;
      },
    });

    await expect(adminApiService.getJoinCode("ws_localdemo")).resolves.toEqual({
      workspace: {
        id: "ws_localdemo",
        join_code: "ABC123",
      },
    });

    await expect(
      adminApiService.rotateJoinCode("ws_localdemo"),
    ).resolves.toEqual({
      workspace: {
        id: "ws_localdemo",
        join_code: "N3W456",
      },
    });

    await expect(
      workspaceDirectory.findByJoinCode("ABC123"),
    ).resolves.toBeNull();
    await expect(workspaceDirectory.findByJoinCode("N3W456")).resolves.toEqual({
      id: "ws_localdemo",
      name: "MoodMarble Local Workspace",
      joinCode: "N3W456",
      teams: [
        {
          id: "tm_product",
          name: "Product",
        },
        {
          id: "tm_engineering",
          name: "Engineering",
        },
      ],
    });
  });

  it("creates, lists, and renames teams within the correct workspace", async () => {
    const workspaceDirectory = new InMemoryWorkspaceDirectory([
      {
        id: "ws_admin",
        name: "MoodMarble HQ",
        joinCode: "ABC123",
        teams: [],
      },
      {
        id: "ws_other",
        name: "Other Workspace",
        joinCode: "XYZ789",
        teams: [
          {
            id: "tm_other",
            name: "Other Team",
          },
        ],
      },
    ]);
    const teamIdCandidates = ["tm_product"];
    const moodSubmissionStore = new InMemoryMoodSubmissionStore();
    const adminApiService = new InMemoryAdminApiService({
      jwtSecret: JWT_SECRET,
      workspaceDirectory,
      moodSubmissionStore,
      teamIdFactory: () => {
        const candidate = teamIdCandidates.shift();

        if (!candidate) {
          throw new Error("No team id candidate left for the test.");
        }

        return candidate;
      },
    });

    await expect(adminApiService.listTeams("ws_admin")).resolves.toEqual({
      teams: [],
    });

    await expect(
      adminApiService.createTeam({
        workspaceId: "ws_admin",
        payload: {
          name: "Product",
        },
      }),
    ).resolves.toEqual({
      team: {
        id: "tm_product",
        workspace_id: "ws_admin",
        name: "Product",
      },
    });

    await expect(adminApiService.listTeams("ws_admin")).resolves.toEqual({
      teams: [
        {
          id: "tm_product",
          workspace_id: "ws_admin",
          name: "Product",
        },
      ],
    });

    await expect(
      adminApiService.updateTeam({
        workspaceId: "ws_admin",
        teamId: "tm_product",
        payload: {
          name: "Engineering",
        },
      }),
    ).resolves.toEqual({
      team: {
        id: "tm_product",
        workspace_id: "ws_admin",
        name: "Engineering",
      },
    });

    await expect(adminApiService.listTeams("ws_admin")).resolves.toEqual({
      teams: [
        {
          id: "tm_product",
          workspace_id: "ws_admin",
          name: "Engineering",
        },
      ],
    });

    await expect(adminApiService.listTeams("ws_other")).resolves.toEqual({
      teams: [
        {
          id: "tm_other",
          workspace_id: "ws_other",
          name: "Other Team",
        },
      ],
    });
  });

  it("exports only anonymized workspace-scoped submission rows in date order", async () => {
    const workspaceDirectory = new InMemoryWorkspaceDirectory([
      {
        id: "ws_admin",
        name: "MoodMarble HQ",
        joinCode: "ABC123",
        teams: [
          {
            id: "tm_product",
            name: "Product",
          },
          {
            id: "tm_engineering",
            name: "Engineering",
          },
        ],
      },
      {
        id: "ws_other",
        name: "Other Workspace",
        joinCode: "XYZ789",
        teams: [
          {
            id: "tm_other",
            name: "Other Team",
          },
        ],
      },
    ]);
    const moodSubmissionStore = new InMemoryMoodSubmissionStore();
    await moodSubmissionStore.createSubmission({
      id: "mr_001",
      teamId: "tm_product",
      moodType: "focused",
      tags: ["#workload"],
      noteHash: "hash-1",
      hourOfDay: 9,
      submissionDate: "2026-06-10",
    });
    await moodSubmissionStore.createSubmission({
      id: "mr_002",
      teamId: "tm_engineering",
      moodType: "happy",
      tags: ["#team"],
      noteHash: null,
      hourOfDay: 14,
      submissionDate: "2026-06-12",
    });
    await moodSubmissionStore.createSubmission({
      id: "mr_003",
      teamId: "tm_other",
      moodType: "sad",
      tags: ["#management"],
      noteHash: "hash-other",
      hourOfDay: 11,
      submissionDate: "2026-06-11",
    });
    await moodSubmissionStore.createSubmission({
      id: "mr_004",
      teamId: "tm_product",
      moodType: "calm",
      tags: [],
      noteHash: "hash-late",
      hourOfDay: 8,
      submissionDate: "2026-07-01",
    });
    const adminApiService = new InMemoryAdminApiService({
      jwtSecret: JWT_SECRET,
      workspaceDirectory,
      moodSubmissionStore,
    });

    await expect(
      adminApiService.getExportRows({
        workspaceId: "ws_admin",
        query: {
          start_date: "2026-06-01",
          end_date: "2026-06-30",
        },
      }),
    ).resolves.toEqual([
      {
        team_id: "tm_product",
        team_name: "Product",
        mood_type: "focused",
        tags: ["#workload"],
        note_hash: "hash-1",
        hour_of_day: 9,
        submission_date: "2026-06-10",
      },
      {
        team_id: "tm_engineering",
        team_name: "Engineering",
        mood_type: "happy",
        tags: ["#team"],
        note_hash: null,
        hour_of_day: 14,
        submission_date: "2026-06-12",
      },
    ]);
  });
});
