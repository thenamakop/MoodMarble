import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../src/app";
import { createManagerJwt } from "../../src/auth/manager-jwt";
import type { DashboardAnalyticsSource } from "../../src/services/dashboard-daily";
import type { MoodSubmissionStore } from "../../src/services/mood-submissions";
import {
  InMemoryTeamMembershipStore,
  type TeamMembershipStore,
} from "../../src/services/team-members";
import type { WorkspaceDirectory } from "../../src/services/workspace-directory";

const JWT_SECRET = "test-jwt-secret";
const TEST_WORKSPACE_ID = "ws_test";
const TEST_TEAM_ID = "tm_product";
const OTHER_TEAM_ID = "tm_other";
const TEST_DATE = "2026-06-22";

describe("POST /workspace/team-member", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let teamMembershipStore: InMemoryTeamMembershipStore;

  beforeEach(async () => {
    teamMembershipStore = new InMemoryTeamMembershipStore();
    app = await createTestApp(teamMembershipStore);
  });

  it("registers an anonymous team member without duplicating repeated device joins", async () => {
    const authorization = createDeviceAuthorizationHeader();

    const firstResponse = await app.inject({
      method: "POST",
      url: "/workspace/team-member",
      headers: {
        authorization,
      },
      payload: {
        team_id: TEST_TEAM_ID,
      },
    });
    const secondResponse = await app.inject({
      method: "POST",
      url: "/workspace/team-member",
      headers: {
        authorization,
      },
      payload: {
        team_id: TEST_TEAM_ID,
      },
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(firstResponse.json()).toEqual({
      status: "registered",
    });
    expect(teamMembershipStore.memberships.size).toBe(1);
    expect(Array.from(teamMembershipStore.memberships.values())).toEqual([
      expect.objectContaining({
        deviceToken: "550e8400-e29b-41d4-a716-446655440000",
        role: "member",
        teamId: TEST_TEAM_ID,
      }),
    ]);
  });

  it("rejects team registrations outside the joined workspace", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/workspace/team-member",
      headers: {
        authorization: createDeviceAuthorizationHeader(),
      },
      payload: {
        team_id: "tm_unknown",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: "Invalid team selection payload.",
      issues: [
        {
          path: "team_id",
          message: "team_id must belong to the joined workspace.",
        },
      ],
    });
  });

  it("feeds persisted member counts into dashboard precision thresholds", async () => {
    const visibleStore = new InMemoryTeamMembershipStore();
    const visibleApp = await createTestApp(visibleStore);

    for (let index = 0; index < 5; index += 1) {
      await visibleApp.inject({
        method: "POST",
        url: "/workspace/team-member",
        headers: {
          authorization: createDeviceAuthorizationHeader(
            `550e8400-e29b-41d4-a716-44665544000${index}`,
          ),
        },
        payload: {
          team_id: TEST_TEAM_ID,
        },
      });
    }

    const visibleResponse = await visibleApp.inject({
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/daily?date=${TEST_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });

    expect(visibleResponse.statusCode).toBe(200);
    expect(visibleResponse.json()).toMatchObject({
      privacy: {
        visibility: "visible",
      },
      summary: {
        total_submissions: {
          kind: "exact",
          value: 5,
        },
      },
    });

    const blurredStore = new InMemoryTeamMembershipStore();
    const blurredApp = await createTestApp(blurredStore);

    for (let index = 0; index < 4; index += 1) {
      await blurredApp.inject({
        method: "POST",
        url: "/workspace/team-member",
        headers: {
          authorization: createDeviceAuthorizationHeader(
            `660e8400-e29b-41d4-a716-44665544000${index}`,
          ),
        },
        payload: {
          team_id: TEST_TEAM_ID,
        },
      });
    }

    const blurredResponse = await blurredApp.inject({
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/daily?date=${TEST_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });

    expect(blurredResponse.statusCode).toBe(200);
    expect(blurredResponse.json()).toMatchObject({
      privacy: {
        visibility: "blurred",
        reasons: ["minimum_members_for_precise_values"],
      },
      summary: {
        total_submissions: {
          kind: "range",
          min: 5,
          max: 9,
        },
      },
    });
  });
});

async function createTestApp(
  teamMembershipStore: TeamMembershipStore & {
    countMembers?: (teamId: string) => number;
  },
) {
  const moodSubmissionStore: MoodSubmissionStore = {
    async createSubmission() {
      // Not needed for team-member route tests.
    },
  };
  const workspaceDirectory: WorkspaceDirectory = {
    async findByJoinCode() {
      return null;
    },
    async hasTeamInWorkspace(workspaceId, teamId) {
      return (
        workspaceId === TEST_WORKSPACE_ID &&
        [TEST_TEAM_ID, OTHER_TEAM_ID].includes(teamId)
      );
    },
  };
  const dashboardAnalyticsSource: DashboardAnalyticsSource = {
    async listDailySubmissions(teamId, submissionDate) {
      return createVisibleSubmissionSet().filter(
        (submission) =>
          submission.teamId === teamId &&
          submission.submissionDate === submissionDate,
      );
    },
    async listSubmissionsInDateRange(teamId, startDate, endDate) {
      return createVisibleSubmissionSet().filter(
        (submission) =>
          submission.teamId === teamId &&
          submission.submissionDate >= startDate &&
          submission.submissionDate <= endDate,
      );
    },
    async getTeamMemberCount(teamId) {
      return teamMembershipStore.countMembers?.(teamId) ?? 0;
    },
  };

  return buildApp({
    jwtSecret: JWT_SECRET,
    dashboardAnalyticsSource,
    moodSubmissionStore,
    teamMembershipStore,
    workspaceDirectory,
    now: () => new Date(`${TEST_DATE}T10:00:00.000Z`),
  });
}

function createDeviceAuthorizationHeader(
  deviceToken = "550e8400-e29b-41d4-a716-446655440000",
): string {
  return `Bearer ${jwt.sign(
    {
      device_token: deviceToken,
      workspace_id: TEST_WORKSPACE_ID,
    },
    JWT_SECRET,
    {
      expiresIn: "30d",
    },
  )}`;
}

function createManagerAuthorizationHeader(): string {
  const { managerJwt } = createManagerJwt(JWT_SECRET, {
    workspace_id: TEST_WORKSPACE_ID,
    team_id: TEST_TEAM_ID,
    role: "manager",
  });

  return `Bearer ${managerJwt}`;
}

function createVisibleSubmissionSet() {
  return [
    {
      teamId: TEST_TEAM_ID,
      submissionDate: TEST_DATE,
      moodType: "happy" as const,
      hourOfDay: 10,
      tags: ["#team" as const],
    },
    {
      teamId: TEST_TEAM_ID,
      submissionDate: TEST_DATE,
      moodType: "happy" as const,
      hourOfDay: 10,
      tags: ["#team" as const],
    },
    {
      teamId: TEST_TEAM_ID,
      submissionDate: TEST_DATE,
      moodType: "focused" as const,
      hourOfDay: 10,
      tags: ["#team" as const],
    },
    {
      teamId: TEST_TEAM_ID,
      submissionDate: TEST_DATE,
      moodType: "calm" as const,
      hourOfDay: 10,
      tags: ["#team" as const],
    },
    {
      teamId: TEST_TEAM_ID,
      submissionDate: TEST_DATE,
      moodType: "neutral" as const,
      hourOfDay: 10,
      tags: ["#team" as const],
    },
  ];
}
