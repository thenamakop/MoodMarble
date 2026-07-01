import {
  DailyDashboardService,
  InMemoryDashboardAnalyticsSource,
  MOOD_ALERT_CONSECUTIVE_HOURS,
  MOOD_ALERT_THRESHOLD_SCORE,
  type DashboardAnalyticsSubmission,
} from "../../src/services/dashboard-daily";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEAM_ID = "team-alert-test";
const TEST_DATE = "2026-06-20";

/**
 * Build a minimal submission. Defaults produce a "stressed" mood (score 3)
 * so they count as below-threshold by default.
 */
function makeSubmission(
  overrides: Partial<DashboardAnalyticsSubmission> = {},
): DashboardAnalyticsSubmission {
  return {
    teamId: TEAM_ID,
    moodType: "stressed", // score 3 — below MOOD_ALERT_THRESHOLD_SCORE (4)
    tags: [],
    hourOfDay: 9,
    submissionDate: TEST_DATE,
    ...overrides,
  };
}

/**
 * Build a service backed by the given submissions.
 * teamMemberCount defaults to 10 so the window-level privacy is "visible"
 * when total submissions ≥ 5.
 */
function makeService(
  submissions: DashboardAnalyticsSubmission[],
  teamMemberCount = 10,
): DailyDashboardService {
  return new DailyDashboardService({
    analyticsSource: new InMemoryDashboardAnalyticsSource(submissions, {
      [TEAM_ID]: teamMemberCount,
    }),
  });
}

/**
 * Spread `count` identical submissions across a single hour so that hour
 * meets the minimum_hourly_submissions threshold (3) and is therefore visible.
 */
function submissionsAtHour(
  hourOfDay: number,
  count: number,
  moodType: DashboardAnalyticsSubmission["moodType"] = "stressed",
): DashboardAnalyticsSubmission[] {
  return Array.from({ length: count }, () => makeSubmission({ hourOfDay, moodType }));
}

// ---------------------------------------------------------------------------
// Exported constant sanity checks
// ---------------------------------------------------------------------------

describe("mood alert constants", () => {
  it("exports MOOD_ALERT_THRESHOLD_SCORE as 4 (tired and below)", () => {
    expect(MOOD_ALERT_THRESHOLD_SCORE).toBe(4);
  });

  it("exports MOOD_ALERT_CONSECUTIVE_HOURS as 3", () => {
    expect(MOOD_ALERT_CONSECUTIVE_HOURS).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Alert state integration tests via DailyDashboardService
// ---------------------------------------------------------------------------

describe("DailyDashboardService — alert_state", () => {
  it("returns alert inactive when no hours are below threshold", async () => {
    // All submissions are "happy" (score 8) — well above threshold
    const submissions = [
      ...submissionsAtHour(9, 3, "happy"),
      ...submissionsAtHour(10, 3, "happy"),
      // pad to meet window minimum (5 total)
      makeSubmission({ hourOfDay: 14, moodType: "happy" }),
      makeSubmission({ hourOfDay: 14, moodType: "happy" }),
    ];

    const service = makeService(submissions);
    const dashboard = await service.getDailyDashboard({
      teamId: TEAM_ID,
      date: TEST_DATE,
    });

    expect(dashboard.summary.alert_state).toEqual({
      status: "inactive",
      message: null,
    });
  });

  it("returns alert inactive when fewer than 3 consecutive low-score hours", async () => {
    // Hours 9 and 10 are low (stressed, score 3), but hour 11 is high (happy),
    // then hour 12 is low again — max consecutive run is 2, below the threshold.
    const submissions = [
      ...submissionsAtHour(9, 3, "stressed"), // low
      ...submissionsAtHour(10, 3, "stressed"), // low — run = 2
      ...submissionsAtHour(11, 3, "happy"), // high — run resets
      ...submissionsAtHour(12, 3, "stressed"), // low — run = 1
    ];

    const service = makeService(submissions);
    const dashboard = await service.getDailyDashboard({
      teamId: TEAM_ID,
      date: TEST_DATE,
    });

    expect(dashboard.summary.alert_state).toEqual({
      status: "inactive",
      message: null,
    });
  });

  it("returns alert active when 3+ consecutive visible hours are below threshold", async () => {
    // Hours 9, 10, 11 each have 3 stressed submissions (score 3 < 4),
    // and the team has 10 members with 9 total submissions, so the window
    // and each of those hourly buckets are fully visible.
    const submissions = [
      ...submissionsAtHour(9, 3, "stressed"),
      ...submissionsAtHour(10, 3, "stressed"),
      ...submissionsAtHour(11, 3, "stressed"),
    ];

    const service = makeService(submissions);
    const dashboard = await service.getDailyDashboard({
      teamId: TEAM_ID,
      date: TEST_DATE,
    });

    expect(dashboard.summary.alert_state).toEqual({
      status: "active",
      message: "Team mood has been low for 3 consecutive hours today.",
    });
  });

  it("returns alert hidden when top-level privacy is hidden", async () => {
    // Only 3 total submissions — below the minimum_submissions threshold of 5,
    // so the window is hidden regardless of per-hour scores.
    const submissions = [
      makeSubmission({ hourOfDay: 9, moodType: "stressed" }),
      makeSubmission({ hourOfDay: 9, moodType: "stressed" }),
      makeSubmission({ hourOfDay: 9, moodType: "stressed" }),
    ];

    const service = makeService(submissions);
    const dashboard = await service.getDailyDashboard({
      teamId: TEAM_ID,
      date: TEST_DATE,
    });

    expect(dashboard.summary.alert_state).toEqual({
      status: "hidden",
      message: null,
    });
  });
});
