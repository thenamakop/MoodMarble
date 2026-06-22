import { inject } from "./http-client";
import jwt from "jsonwebtoken";

import { buildApp } from "../../src/app";
import type { MoodSubmissionStore } from "../../src/services/mood-submissions";
import type { WorkspaceDirectory } from "../../src/services/workspace-directory";

const JWT_SECRET = "test-jwt-secret";
const TEST_WORKSPACE_ID = "ws_test";
const TEST_TEAM_ID = "tm_test";

describe("POST /mood", () => {
  let createdSubmissions: unknown[];
  let app: Awaited<ReturnType<typeof buildApp>>;
  let currentTime: Date;

  beforeEach(async () => {
    createdSubmissions = [];
    currentTime = new Date("2026-06-12T09:30:00.000Z");

    const moodSubmissionStore: MoodSubmissionStore = {
      async createSubmission(submission) {
        createdSubmissions.push(submission);
      },
    };
    const workspaceDirectory: WorkspaceDirectory = {
      async findByJoinCode() {
        return null;
      },
      async hasTeamInWorkspace(workspaceId, teamId) {
        return workspaceId === TEST_WORKSPACE_ID && teamId === TEST_TEAM_ID;
      },
    };

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      moodSubmissionStore,
      workspaceDirectory,
      now: () => currentTime,
    });
  });

  it("accepts a valid anonymous submission", async () => {
    const response = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        mood_type: "stressed",
        tags: ["#workload", "#deadlines"],
        note: "Need some breathing room today.",
        hour_of_day: 14,
      }),
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      status: "received",
    });
    expect(response.json().marble_id).toMatch(/^mr_[a-z0-9]{10}$/);
  });

  it("rejects requests without a device JWT", async () => {
    const response = await inject(app, {
      method: "POST",
      url: "/mood",
      payload: {
        workspace_id: TEST_WORKSPACE_ID,
        team_id: TEST_TEAM_ID,
        mood_type: "happy",
        hour_of_day: 14,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: "Unauthorized",
    });
  });

  it("rejects requests with an invalid device JWT", async () => {
    const response = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: "Bearer invalid-jwt",
      },
      payload: createMoodPayload({
        mood_type: "happy",
        hour_of_day: 14,
      }),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: "Unauthorized",
    });
  });

  it("rejects requests with an expired device JWT", async () => {
    const expiredJwt = jwt.sign(
      {
        device_token: "550e8400-e29b-41d4-a716-446655440000",
        workspace_id: TEST_WORKSPACE_ID,
      },
      JWT_SECRET,
      {
        expiresIn: -1,
      },
    );
    const response = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: `Bearer ${expiredJwt}`,
      },
      payload: createMoodPayload({
        mood_type: "happy",
        hour_of_day: 14,
      }),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: "Unauthorized",
    });
  });

  it("rejects an invalid mood type", async () => {
    const response = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        mood_type: "angry",
        hour_of_day: 14,
      }),
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects more than 2 tags", async () => {
    const response = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        mood_type: "focused",
        tags: ["#workload", "#deadlines", "#team"],
        hour_of_day: 14,
      }),
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects duplicate tags", async () => {
    const response = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        mood_type: "focused",
        tags: ["#workload", "#workload"],
        hour_of_day: 14,
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "Invalid mood submission payload.",
    });
  });

  it("rejects a note longer than 120 characters", async () => {
    const response = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        mood_type: "neutral",
        note: "x".repeat(121),
        hour_of_day: 14,
      }),
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a missing or invalid hour_of_day", async () => {
    const missingHourResponse = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: {
        workspace_id: TEST_WORKSPACE_ID,
        team_id: TEST_TEAM_ID,
        mood_type: "happy",
        submission_date: "2026-06-12",
      },
    });

    const invalidHourResponse = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        mood_type: "happy",
        hour_of_day: 24,
      }),
    });

    expect(missingHourResponse.statusCode).toBe(400);
    expect(invalidHourResponse.statusCode).toBe(400);
  });

  it("stores only anonymous submission fields", async () => {
    const response = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        mood_type: "sad",
        tags: ["#management"],
        note: "Need more clarity this week.",
        hour_of_day: 16,
      }),
    });

    expect(response.statusCode).toBe(201);
    expect(createdSubmissions).toHaveLength(1);

    expect(createdSubmissions[0]).toEqual({
      id: expect.stringMatching(/^mr_[a-z0-9]{10}$/),
      teamId: TEST_TEAM_ID,
      moodType: "sad",
      tags: ["#management"],
      noteHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      hourOfDay: 16,
      submissionDate: "2026-06-12",
    });

    expect(createdSubmissions[0]).not.toHaveProperty("note");
    expect(createdSubmissions[0]).not.toHaveProperty("workspace_id");
    expect(createdSubmissions[0]).not.toHaveProperty("workspaceId");
    expect(createdSubmissions[0]).not.toHaveProperty("user_id");
    expect(createdSubmissions[0]).not.toHaveProperty("email");
    expect(createdSubmissions[0]).not.toHaveProperty("device_token");
  });

  it("rejects submissions for a different workspace than the joined JWT", async () => {
    const response = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        workspace_id: "ws_other",
        mood_type: "happy",
        hour_of_day: 14,
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: "Invalid mood submission payload.",
      issues: [
        {
          path: "workspace_id",
          message: "Submission workspace does not match the joined workspace.",
        },
      ],
    });
  });

  it("rejects submissions for a team outside the submitted workspace", async () => {
    const response = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        team_id: "tm_other",
        mood_type: "happy",
        hour_of_day: 14,
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: "Invalid mood submission payload.",
      issues: [
        {
          path: "team_id",
          message: "team_id must belong to the submitted workspace.",
        },
      ],
    });
  });

  it("allows 5 submissions per day per device", async () => {
    for (
      let submissionNumber = 0;
      submissionNumber < 5;
      submissionNumber += 1
    ) {
      const response = await inject(app, {
        method: "POST",
        url: "/mood",
        headers: {
          authorization: createAuthorizationHeader(),
        },
        payload: createMoodPayload({
          mood_type: "happy",
          hour_of_day: 9 + submissionNumber,
        }),
      });

      expect(response.statusCode).toBe(201);
    }

    expect(createdSubmissions).toHaveLength(5);
  });

  it("blocks the 6th submission on the same day", async () => {
    for (
      let submissionNumber = 0;
      submissionNumber < 5;
      submissionNumber += 1
    ) {
      const response = await inject(app, {
        method: "POST",
        url: "/mood",
        headers: {
          authorization: createAuthorizationHeader(),
        },
        payload: createMoodPayload({
          mood_type: "focused",
          hour_of_day: 9 + submissionNumber,
        }),
      });

      expect(response.statusCode).toBe(201);
    }

    const blockedResponse = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        mood_type: "focused",
        hour_of_day: 14,
      }),
    });

    expect(blockedResponse.statusCode).toBe(429);
    expect(blockedResponse.json()).toEqual({
      message: "Daily mood submission limit reached.",
    });
    expect(createdSubmissions).toHaveLength(5);
  });

  it("resets the daily limit on the next day", async () => {
    for (
      let submissionNumber = 0;
      submissionNumber < 5;
      submissionNumber += 1
    ) {
      const response = await inject(app, {
        method: "POST",
        url: "/mood",
        headers: {
          authorization: createAuthorizationHeader(),
        },
        payload: createMoodPayload({
          mood_type: "calm",
          hour_of_day: submissionNumber,
        }),
      });

      expect(response.statusCode).toBe(201);
    }

    const nextDayResponse = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        mood_type: "calm",
        hour_of_day: 10,
        submission_date: "2026-06-13",
      }),
    });

    expect(nextDayResponse.statusCode).toBe(201);
    expect(createdSubmissions).toHaveLength(6);
    expect(createdSubmissions[5]).toEqual(
      expect.objectContaining({
        submissionDate: "2026-06-13",
      }),
    );
  });

  it("returns a privacy-safe rate-limit error response", async () => {
    for (
      let submissionNumber = 0;
      submissionNumber < 5;
      submissionNumber += 1
    ) {
      await inject(app, {
        method: "POST",
        url: "/mood",
        headers: {
          authorization: createAuthorizationHeader(),
        },
        payload: createMoodPayload({
          mood_type: "tired",
          note: "Need a break.",
          hour_of_day: submissionNumber,
        }),
      });
    }

    const blockedResponse = await inject(app, {
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: createMoodPayload({
        mood_type: "tired",
        note: "Need a break.",
        hour_of_day: 12,
      }),
    });

    expect(blockedResponse.statusCode).toBe(429);
    expect(blockedResponse.json()).toEqual({
      message: "Daily mood submission limit reached.",
    });
    expect(blockedResponse.body).not.toContain("device_token");
    expect(blockedResponse.body).not.toContain(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(blockedResponse.body).not.toContain("Need a break.");
  });
});

function createAuthorizationHeader(workspaceId = TEST_WORKSPACE_ID): string {
  return `Bearer ${jwt.sign(
    {
      device_token: "550e8400-e29b-41d4-a716-446655440000",
      workspace_id: workspaceId,
    },
    JWT_SECRET,
    {
      expiresIn: "30d",
    },
  )}`;
}

function createMoodPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    workspace_id: TEST_WORKSPACE_ID,
    team_id: TEST_TEAM_ID,
    mood_type: "happy",
    tags: [],
    hour_of_day: 14,
    submission_date: "2026-06-12",
    ...overrides,
  };
}
