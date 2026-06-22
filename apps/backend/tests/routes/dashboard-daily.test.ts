import { inject } from "./http-client";
import jwt from "jsonwebtoken";

import { DashboardDailySchema } from "../../../../packages/shared";

import { buildApp } from "../../src/app";
import { createManagerJwt } from "../../src/auth/manager-jwt";
import type { DashboardAnalyticsSource } from "../../src/services/dashboard-daily";
import type { MoodSubmissionStore } from "../../src/services/mood-submissions";
import type { WorkspaceDirectory } from "../../src/services/workspace-directory";

const JWT_SECRET = "test-jwt-secret";
const TEST_WORKSPACE_ID = "ws_test";
const TEST_TEAM_ID = "tm_product";
const OTHER_TEAM_ID = "tm_other";
const TEST_DATE = "2026-06-18";

describe("GET /dashboard/team/:teamId/daily", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let dashboardAnalyticsSource: DashboardAnalyticsSource;

  beforeEach(async () => {
    const moodSubmissionStore: MoodSubmissionStore = {
      async createSubmission() {
        // Daily dashboard tests do not mutate the submission pipeline.
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

    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 6,
        [OTHER_TEAM_ID]: 6,
      },
      submissions: [],
    });

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      dashboardAnalyticsSource,
      moodSubmissionStore,
      workspaceDirectory,
      now: () => new Date(`${TEST_DATE}T10:00:00.000Z`),
    });
  });

  it("returns chart-ready daily aggregation for a manager", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 6,
      },
      submissions: [
        createSubmission({ moodType: "happy", hourOfDay: 9 }),
        createSubmission({ moodType: "happy", hourOfDay: 9 }),
        createSubmission({ moodType: "focused", hourOfDay: 9 }),
        createSubmission({ moodType: "stressed", hourOfDay: 14 }),
        createSubmission({ moodType: "stressed", hourOfDay: 14 }),
        createSubmission({
          teamId: TEST_TEAM_ID,
          submissionDate: "2026-06-17",
          moodType: "sad",
          hourOfDay: 9,
        }),
        createSubmission({
          teamId: OTHER_TEAM_ID,
          moodType: "happy",
          hourOfDay: 9,
        }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/daily?date=${TEST_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(() => DashboardDailySchema.parse(response.json())).not.toThrow();

    const body = response.json();
    expect(body.team_id).toBe(TEST_TEAM_ID);
    expect(body.date).toBe(TEST_DATE);
    expect(body.privacy.visibility).toBe("visible");
    expect(body.summary.total_submissions).toEqual({
      kind: "exact",
      value: 5,
    });
    expect(body.hourly_buckets).toHaveLength(24);
    expect(body.hourly_buckets[9]).toMatchObject({
      hour_of_day: 9,
      privacy: {
        visibility: "visible",
      },
      total_submissions: {
        kind: "exact",
        value: 3,
      },
    });
    expect(body.hourly_buckets[9].mood_counts).toContainEqual({
      mood_type: "happy",
      count: {
        kind: "exact",
        value: 2,
      },
    });
    expect(body.hourly_buckets[14]).toMatchObject({
      hour_of_day: 14,
      privacy: {
        visibility: "hidden",
        reasons: ["minimum_hourly_submissions"],
      },
      total_submissions: {
        kind: "hidden",
      },
    });
  });

  it("rejects requests without a valid manager jwt", async () => {
    const missingJwtResponse = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/daily?date=${TEST_DATE}`,
    });

    const invalidRoleJwt = jwt.sign(
      {
        workspace_id: TEST_WORKSPACE_ID,
        team_id: TEST_TEAM_ID,
        role: "member",
      },
      JWT_SECRET,
      {
        expiresIn: "30d",
      },
    );
    const wrongRoleResponse = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/daily?date=${TEST_DATE}`,
      headers: {
        authorization: `Bearer ${invalidRoleJwt}`,
      },
    });

    expect(missingJwtResponse.statusCode).toBe(401);
    expect(missingJwtResponse.json()).toEqual({
      message: "Unauthorized",
    });
    expect(wrongRoleResponse.statusCode).toBe(401);
    expect(wrongRoleResponse.json()).toEqual({
      message: "Unauthorized",
    });
  });

  it("forbids access when the manager token is scoped to a different team", async () => {
    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/daily?date=${TEST_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader({
          teamId: OTHER_TEAM_ID,
        }),
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      message: "Forbidden",
    });
  });

  it("returns hidden output when the submission threshold is not met", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 6,
      },
      submissions: [
        createSubmission({ moodType: "happy", hourOfDay: 9 }),
        createSubmission({ moodType: "happy", hourOfDay: 9 }),
        createSubmission({ moodType: "focused", hourOfDay: 9 }),
        createSubmission({ moodType: "stressed", hourOfDay: 14 }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/daily?date=${TEST_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      privacy: {
        visibility: "hidden",
        reasons: ["minimum_submissions"],
      },
      summary: {
        total_submissions: {
          kind: "hidden",
        },
        alert_state: {
          status: "hidden",
          message: null,
        },
      },
    });
    expect(response.json().hourly_buckets[9]).toMatchObject({
      privacy: {
        visibility: "hidden",
      },
      total_submissions: {
        kind: "hidden",
      },
    });
  });

  it("returns blurred aggregate ranges when the team is too small", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 4,
      },
      submissions: [
        createSubmission({ moodType: "happy", hourOfDay: 9 }),
        createSubmission({ moodType: "happy", hourOfDay: 9 }),
        createSubmission({ moodType: "focused", hourOfDay: 9 }),
        createSubmission({ moodType: "stressed", hourOfDay: 9 }),
        createSubmission({ moodType: "stressed", hourOfDay: 9 }),
        createSubmission({ moodType: "sad", hourOfDay: 9 }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/daily?date=${TEST_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
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
    expect(response.json().hourly_buckets[9]).toMatchObject({
      privacy: {
        visibility: "blurred",
        reasons: ["minimum_members_for_precise_values"],
      },
      total_submissions: {
        kind: "range",
        min: 5,
        max: 9,
      },
      average_mood_score: {
        kind: "range",
        min: 4,
        max: 6,
      },
    });
  });

  it("does not leak individual-level fields in the daily response", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 6,
      },
      submissions: [
        createSubmission({ moodType: "happy", hourOfDay: 9, tags: ["#team"] }),
        createSubmission({
          moodType: "happy",
          hourOfDay: 9,
          tags: ["#management"],
        }),
        createSubmission({
          moodType: "focused",
          hourOfDay: 9,
          tags: ["#workload"],
        }),
        createSubmission({ moodType: "stressed", hourOfDay: 14 }),
        createSubmission({ moodType: "sad", hourOfDay: 15 }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/daily?date=${TEST_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain("device_token");
    expect(response.body).not.toContain("noteHash");
    expect(response.body).not.toContain("note_hash");
    expect(response.body).not.toContain('"tags"');
    expect(response.body).not.toContain('"id"');
    expect(response.body).not.toContain("mr_");
  });

  async function createTestApp(
    analyticsSource: DashboardAnalyticsSource,
  ): Promise<Awaited<ReturnType<typeof buildApp>>> {
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

    return buildApp({
      jwtSecret: JWT_SECRET,
      dashboardAnalyticsSource: analyticsSource,
      moodSubmissionStore: {
        async createSubmission() {
          // Not used in dashboard route tests.
        },
      },
      workspaceDirectory,
      now: () => new Date(`${TEST_DATE}T10:00:00.000Z`),
    });
  }
});

function createManagerAuthorizationHeader(
  options: {
    workspaceId?: string;
    teamId?: string;
  } = {},
): string {
  const { managerJwt } = createManagerJwt(JWT_SECRET, {
    workspace_id: options.workspaceId ?? TEST_WORKSPACE_ID,
    team_id: options.teamId ?? TEST_TEAM_ID,
    role: "manager",
  });

  return `Bearer ${managerJwt}`;
}

function createSubmission(
  overrides: Partial<{
    teamId: string;
    submissionDate: string;
    moodType:
      | "energised"
      | "happy"
      | "calm"
      | "focused"
      | "neutral"
      | "tired"
      | "stressed"
      | "sad"
      | "unheard";
    hourOfDay: number;
    tags: (
      | "#meetings"
      | "#workload"
      | "#management"
      | "#team"
      | "#deadlines"
      | "#recognition"
    )[];
  }> = {},
) {
  return {
    teamId: overrides.teamId ?? TEST_TEAM_ID,
    submissionDate: overrides.submissionDate ?? TEST_DATE,
    moodType: overrides.moodType ?? "happy",
    hourOfDay: overrides.hourOfDay ?? 9,
    tags: overrides.tags ?? [],
  };
}

function createDashboardAnalyticsSource({
  submissions,
  teamMemberCounts,
}: {
  submissions: ReturnType<typeof createSubmission>[];
  teamMemberCounts: Record<string, number>;
}): DashboardAnalyticsSource {
  return {
    async listDailySubmissions(teamId, submissionDate) {
      return submissions.filter(
        (submission) =>
          submission.teamId === teamId &&
          submission.submissionDate === submissionDate,
      );
    },
    async listSubmissionsInDateRange(teamId, startDate, endDate) {
      return submissions.filter(
        (submission) =>
          submission.teamId === teamId &&
          submission.submissionDate >= startDate &&
          submission.submissionDate <= endDate,
      );
    },
    async getTeamMemberCount(teamId) {
      return teamMemberCounts[teamId] ?? 0;
    },
  };
}
