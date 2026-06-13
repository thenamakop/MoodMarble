import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../src/app";
import type { MoodSubmissionStore } from "../../src/services/mood-submissions";

const JWT_SECRET = "test-jwt-secret";

describe("backend foundation routes", () => {
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
    });
  });

  it("returns OK from GET /health", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
    });
  });

  it("joins a workspace with a valid public join code", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/workspace/join",
      payload: {
        join_code: "abc123",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      workspace: {
        id: "ws_localdemo",
        name: "MoodMarble Local Workspace",
      },
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

    const decoded = jwt.verify(response.json().device_jwt, JWT_SECRET) as {
      device_token: string;
    };
    expect(decoded.device_token).toBe(response.json().device_token);
  });

  it("rejects an invalid join code payload", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/workspace/join",
      payload: {
        join_code: "abc12",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "Invalid workspace join payload.",
    });
  });

  it("returns a server error when the JWT secret is missing", async () => {
    const appWithoutJwtSecret = await buildApp({
      jwtSecret: undefined,
    });

    const response = await appWithoutJwtSecret.inject({
      method: "POST",
      url: "/workspace/join",
      payload: {
        join_code: "ABC123",
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      message: "Server configuration error.",
    });
  });

  it("keeps POST /workspace/join public", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/workspace/join",
      payload: {
        join_code: "ABC123",
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("allows a joined device JWT to submit a mood", async () => {
    const joinResponse = await app.inject({
      method: "POST",
      url: "/workspace/join",
      payload: {
        join_code: "ABC123",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/mood",
      headers: {
        authorization: `Bearer ${joinResponse.json().device_jwt}`,
      },
      payload: {
        workspace_id: "ws_localdemo",
        team_id: "tm_product",
        mood_type: "happy",
        hour_of_day: 10,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(createdSubmissions).toHaveLength(1);
  });
});
