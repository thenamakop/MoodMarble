import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../src/app";
import type { MoodSubmissionStore } from "../../src/services/mood-submissions";

const JWT_SECRET = "test-jwt-secret";
const FIXED_DATE = new Date("2026-06-12T09:30:00.000Z");

describe("POST /mood", () => {
  let createdSubmissions: unknown[];
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    createdSubmissions = [];

    const moodSubmissionStore: MoodSubmissionStore = {
      async createSubmission(submission) {
        createdSubmissions.push(submission);
      },
    };

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      moodSubmissionStore,
      now: () => FIXED_DATE,
    });
  });

  it("accepts a valid anonymous submission", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: {
        workspace_id: "ws_abc123",
        team_id: "tm_abc123",
        mood_type: "stressed",
        tags: ["#workload", "#deadlines"],
        note: "Need some breathing room today.",
        hour_of_day: 14,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      status: "received",
    });
    expect(response.json().marble_id).toMatch(/^mr_[a-z0-9]{10}$/);
  });

  it("rejects an invalid mood type", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: {
        workspace_id: "ws_abc123",
        team_id: "tm_abc123",
        mood_type: "angry",
        hour_of_day: 14,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects more than 2 tags", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: {
        workspace_id: "ws_abc123",
        team_id: "tm_abc123",
        mood_type: "focused",
        tags: ["#workload", "#deadlines", "#team"],
        hour_of_day: 14,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a note longer than 120 characters", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: {
        workspace_id: "ws_abc123",
        team_id: "tm_abc123",
        mood_type: "neutral",
        note: "x".repeat(121),
        hour_of_day: 14,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a missing or invalid hour_of_day", async () => {
    const missingHourResponse = await app.inject({
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: {
        workspace_id: "ws_abc123",
        team_id: "tm_abc123",
        mood_type: "happy",
      },
    });

    const invalidHourResponse = await app.inject({
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: {
        workspace_id: "ws_abc123",
        team_id: "tm_abc123",
        mood_type: "happy",
        hour_of_day: 24,
      },
    });

    expect(missingHourResponse.statusCode).toBe(400);
    expect(invalidHourResponse.statusCode).toBe(400);
  });

  it("stores only anonymous submission fields", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mood",
      headers: {
        authorization: createAuthorizationHeader(),
      },
      payload: {
        workspace_id: "ws_abc123",
        team_id: "tm_abc123",
        mood_type: "sad",
        tags: ["#management"],
        note: "Need more clarity this week.",
        hour_of_day: 16,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(createdSubmissions).toHaveLength(1);

    expect(createdSubmissions[0]).toEqual({
      id: expect.stringMatching(/^mr_[a-z0-9]{10}$/),
      teamId: "tm_abc123",
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
});

function createAuthorizationHeader(): string {
  return `Bearer ${jwt.sign(
    {
      device_token: "550e8400-e29b-41d4-a716-446655440000",
    },
    JWT_SECRET,
    {
      expiresIn: "30d",
    },
  )}`;
}
