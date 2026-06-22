import { inject } from "./http-client";
import jwt from "jsonwebtoken";

import { DashboardWeeklySchema } from "../../../../packages/shared";

import { buildApp } from "../../src/app";
import { createManagerJwt } from "../../src/auth/manager-jwt";
import type { DashboardAnalyticsSource } from "../../src/services/dashboard-daily";
import type { MoodSubmissionStore } from "../../src/services/mood-submissions";
import type { WorkspaceDirectory } from "../../src/services/workspace-directory";

const JWT_SECRET = "test-jwt-secret";
const TEST_WORKSPACE_ID = "ws_test";
const TEST_TEAM_ID = "tm_product";
const OTHER_TEAM_ID = "tm_other";
const TEST_START_DATE = "2026-06-15";

describe("GET /dashboard/team/:teamId/weekly", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let dashboardAnalyticsSource: DashboardAnalyticsSource;

  beforeEach(async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 6,
        [OTHER_TEAM_ID]: 6,
      },
      submissions: [],
    });

    app = await createTestApp(dashboardAnalyticsSource);
  });

  it("returns trend-ready weekly aggregation for a manager", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 6,
      },
      submissions: [
        createSubmission({ submissionDate: "2026-06-15", moodType: "happy" }),
        createSubmission({ submissionDate: "2026-06-15", moodType: "focused" }),
        createSubmission({
          submissionDate: "2026-06-16",
          moodType: "stressed",
        }),
        createSubmission({ submissionDate: "2026-06-17", moodType: "calm" }),
        createSubmission({ submissionDate: "2026-06-18", moodType: "happy" }),
        createSubmission({ submissionDate: "2026-06-20", moodType: "tired" }),
        createSubmission({ submissionDate: "2026-06-22", moodType: "sad" }),
        createSubmission({
          teamId: OTHER_TEAM_ID,
          submissionDate: "2026-06-17",
          moodType: "happy",
        }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/weekly?start_date=${TEST_START_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(() => DashboardWeeklySchema.parse(response.json())).not.toThrow();

    const body = response.json();
    expect(body.team_id).toBe(TEST_TEAM_ID);
    expect(body.window).toEqual({
      start_date: "2026-06-15",
      end_date: "2026-06-21",
    });
    expect(body.privacy.visibility).toBe("visible");
    expect(body.summary.total_submissions).toEqual({
      kind: "exact",
      value: 6,
    });
    expect(body.daily_points).toHaveLength(7);
    expect(
      body.daily_points.map((point: { date: string }) => point.date),
    ).toEqual([
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21",
    ]);
    expect(body.daily_points[0]).toMatchObject({
      date: "2026-06-15",
      total_submissions: {
        kind: "exact",
        value: 2,
      },
      average_mood_score: {
        kind: "exact",
        value: 7,
      },
    });
    expect(body.daily_points[4]).toMatchObject({
      date: "2026-06-19",
      total_submissions: {
        kind: "exact",
        value: 0,
      },
    });
  });

  it("rejects requests without a valid manager jwt", async () => {
    const missingJwtResponse = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/weekly?start_date=${TEST_START_DATE}`,
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
      url: `/dashboard/team/${TEST_TEAM_ID}/weekly?start_date=${TEST_START_DATE}`,
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

  it("returns hidden output when the weekly submission threshold is not met", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 6,
      },
      submissions: [
        createSubmission({ submissionDate: "2026-06-15", moodType: "happy" }),
        createSubmission({ submissionDate: "2026-06-16", moodType: "happy" }),
        createSubmission({ submissionDate: "2026-06-17", moodType: "focused" }),
        createSubmission({
          submissionDate: "2026-06-18",
          moodType: "stressed",
        }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/weekly?start_date=${TEST_START_DATE}`,
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
    expect(response.json().daily_points[0]).toMatchObject({
      total_submissions: {
        kind: "hidden",
      },
      average_mood_score: {
        kind: "hidden",
      },
    });
  });

  it("returns deterministic chart-ready output for the same week window", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 6,
      },
      submissions: [
        createSubmission({ submissionDate: "2026-06-16", moodType: "happy" }),
        createSubmission({
          submissionDate: "2026-06-16",
          moodType: "stressed",
        }),
        createSubmission({ submissionDate: "2026-06-20", moodType: "calm" }),
        createSubmission({ submissionDate: "2026-06-20", moodType: "focused" }),
        createSubmission({ submissionDate: "2026-06-21", moodType: "happy" }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const firstResponse = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/weekly?start_date=${TEST_START_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });
    const secondResponse = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/weekly?start_date=${TEST_START_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(firstResponse.json()).toEqual(secondResponse.json());
  });

  it("returns blurred aggregate ranges when the team is too small", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 4,
      },
      submissions: [
        createSubmission({ submissionDate: "2026-06-15", moodType: "happy" }),
        createSubmission({ submissionDate: "2026-06-15", moodType: "happy" }),
        createSubmission({ submissionDate: "2026-06-16", moodType: "focused" }),
        createSubmission({
          submissionDate: "2026-06-17",
          moodType: "stressed",
        }),
        createSubmission({
          submissionDate: "2026-06-18",
          moodType: "stressed",
        }),
        createSubmission({ submissionDate: "2026-06-20", moodType: "sad" }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/weekly?start_date=${TEST_START_DATE}`,
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
    expect(response.json().daily_points[0]).toMatchObject({
      average_mood_score: {
        kind: "range",
        min: 7,
        max: 9,
      },
    });
  });

  it("does not leak personal or per-entry data in the weekly response", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 6,
      },
      submissions: [
        createSubmission({
          submissionDate: "2026-06-15",
          moodType: "happy",
          tags: ["#team"],
        }),
        createSubmission({
          submissionDate: "2026-06-16",
          moodType: "focused",
          tags: ["#workload"],
        }),
        createSubmission({
          submissionDate: "2026-06-17",
          moodType: "stressed",
          tags: ["#management"],
        }),
        createSubmission({ submissionDate: "2026-06-18", moodType: "calm" }),
        createSubmission({ submissionDate: "2026-06-20", moodType: "sad" }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/weekly?start_date=${TEST_START_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain("device_token");
    expect(response.body).not.toContain("noteHash");
    expect(response.body).not.toContain("note_hash");
    expect(response.body).not.toContain('"tags"');
    expect(response.body).not.toContain('"hour_of_day"');
    expect(response.body).not.toContain('"id"');
    expect(response.body).not.toContain("mr_");
  });
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
  const moodSubmissionStore: MoodSubmissionStore = {
    async createSubmission() {
      // Weekly dashboard tests do not mutate the submission pipeline.
    },
  };

  return buildApp({
    jwtSecret: JWT_SECRET,
    dashboardAnalyticsSource: analyticsSource,
    moodSubmissionStore,
    workspaceDirectory,
    now: () => new Date("2026-06-18T10:00:00.000Z"),
  });
}

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
    submissionDate: overrides.submissionDate ?? TEST_START_DATE,
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
