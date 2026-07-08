import { inject } from "./http-client";
import jwt from "jsonwebtoken";

import { DashboardTagsSchema } from "../../../../packages/shared";

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

describe("GET /dashboard/team/:teamId/tags", () => {
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

  it("returns aggregate tag-frequency counts for the selected week window", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 6,
      },
      submissions: [
        createSubmission({
          submissionDate: "2026-06-15",
          moodType: "happy",
          tags: ["#workload", "#team"],
        }),
        createSubmission({
          submissionDate: "2026-06-16",
          moodType: "focused",
          tags: ["#workload"],
        }),
        createSubmission({
          submissionDate: "2026-06-16",
          moodType: "stressed",
          tags: ["#management", "#workload"],
        }),
        createSubmission({
          submissionDate: "2026-06-18",
          moodType: "calm",
          tags: ["#team"],
        }),
        createSubmission({
          submissionDate: "2026-06-20",
          moodType: "tired",
          tags: ["#deadlines"],
        }),
        createSubmission({
          teamId: OTHER_TEAM_ID,
          submissionDate: "2026-06-16",
          moodType: "happy",
          tags: ["#recognition"],
        }),
        createSubmission({
          submissionDate: "2026-06-22",
          moodType: "sad",
          tags: ["#team"],
        }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/tags?start_date=${TEST_START_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(() => DashboardTagsSchema.parse(response.json())).not.toThrow();

    const body = response.json();
    expect(body.team_id).toBe(TEST_TEAM_ID);
    expect(body.window).toEqual({
      start_date: "2026-06-15",
      end_date: "2026-06-21",
    });
    expect(body.privacy.visibility).toBe("visible");
    expect(body.summary.total_submissions).toEqual({
      kind: "exact",
      value: 5,
    });
    expect(body.summary.alert_state).toEqual({
      status: "inactive",
      message: null,
    });
    expect(body.tag_counts).toEqual([
      {
        tag: "#workload",
        count: {
          kind: "exact",
          value: 3,
        },
      },
      {
        tag: "#team",
        count: {
          kind: "exact",
          value: 2,
        },
      },
      {
        tag: "#management",
        count: {
          kind: "exact",
          value: 1,
        },
      },
      {
        tag: "#deadlines",
        count: {
          kind: "exact",
          value: 1,
        },
      },
    ]);
  });

  it("rejects requests without a valid manager jwt", async () => {
    const missingJwtResponse = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/tags?start_date=${TEST_START_DATE}`,
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
      url: `/dashboard/team/${TEST_TEAM_ID}/tags?start_date=${TEST_START_DATE}`,
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
        createSubmission({
          submissionDate: "2026-06-15",
          moodType: "happy",
          tags: ["#workload"],
        }),
        createSubmission({
          submissionDate: "2026-06-16",
          moodType: "happy",
          tags: ["#team"],
        }),
        createSubmission({
          submissionDate: "2026-06-17",
          moodType: "focused",
          tags: ["#workload"],
        }),
        createSubmission({
          submissionDate: "2026-06-18",
          moodType: "stressed",
          tags: ["#management"],
        }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/tags?start_date=${TEST_START_DATE}`,
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
    expect(response.json().tag_counts).toEqual([
      {
        tag: "#workload",
        count: {
          kind: "hidden",
        },
      },
      {
        tag: "#management",
        count: {
          kind: "hidden",
        },
      },
      {
        tag: "#team",
        count: {
          kind: "hidden",
        },
      },
    ]);
  });

  it("returns blurred aggregate ranges when the team is too small", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 4,
      },
      submissions: [
        createSubmission({
          submissionDate: "2026-06-15",
          moodType: "happy",
          tags: ["#workload", "#team"],
        }),
        createSubmission({
          submissionDate: "2026-06-16",
          moodType: "focused",
          tags: ["#workload"],
        }),
        createSubmission({
          submissionDate: "2026-06-17",
          moodType: "stressed",
          tags: ["#workload"],
        }),
        createSubmission({
          submissionDate: "2026-06-18",
          moodType: "stressed",
          tags: ["#management"],
        }),
        createSubmission({
          submissionDate: "2026-06-20",
          moodType: "sad",
          tags: ["#team"],
        }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/tags?start_date=${TEST_START_DATE}`,
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
    expect(response.json().tag_counts[0]).toMatchObject({
      tag: "#workload",
      count: {
        kind: "range",
        min: 2,
        max: 4,
      },
    });
  });

  it("does not leak individual rows, notes, or identity fields", async () => {
    dashboardAnalyticsSource = createDashboardAnalyticsSource({
      teamMemberCounts: {
        [TEST_TEAM_ID]: 6,
      },
      submissions: [
        createSubmission({
          submissionDate: "2026-06-15",
          moodType: "happy",
          tags: ["#workload", "#team"],
        }),
        createSubmission({
          submissionDate: "2026-06-16",
          moodType: "focused",
          tags: ["#management"],
        }),
        createSubmission({
          submissionDate: "2026-06-17",
          moodType: "stressed",
          tags: ["#deadlines"],
        }),
        createSubmission({
          submissionDate: "2026-06-18",
          moodType: "calm",
          tags: ["#team"],
        }),
        createSubmission({
          submissionDate: "2026-06-20",
          moodType: "sad",
          tags: ["#recognition"],
        }),
      ],
    });
    app = await createTestApp(dashboardAnalyticsSource);

    const response = await inject(app, {
      method: "GET",
      url: `/dashboard/team/${TEST_TEAM_ID}/tags?start_date=${TEST_START_DATE}`,
      headers: {
        authorization: createManagerAuthorizationHeader(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain("device_token");
    expect(response.body).not.toContain("noteHash");
    expect(response.body).not.toContain("note_hash");
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
      return workspaceId === TEST_WORKSPACE_ID && [TEST_TEAM_ID, OTHER_TEAM_ID].includes(teamId);
    },
  };
  const moodSubmissionStore: MoodSubmissionStore = {
    async createSubmission() {
      // Tag dashboard tests do not mutate the submission pipeline.
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
    tags: ("#meetings" | "#workload" | "#management" | "#team" | "#deadlines" | "#recognition")[];
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
          submission.teamId === teamId && submission.submissionDate === submissionDate,
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
