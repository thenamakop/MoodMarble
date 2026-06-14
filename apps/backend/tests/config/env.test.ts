import { afterEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { getAppEnv } from "../../src/config/env";

const originalEnv = { ...process.env };

describe("getAppEnv", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reads JWT_SECRET from the expected environment key", () => {
    process.env.DATABASE_URL =
      "postgresql://postgres:postgres@localhost:5433/moodmarble";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.JWT_SECRET = "local-dev-jwt-secret-change-me";
    process.env.HOST = "127.0.0.1";
    process.env.PORT = "3000";

    expect(getAppEnv().JWT_SECRET).toBe("local-dev-jwt-secret-change-me");
  });

  it("rejects a JWT token pasted into JWT_SECRET", () => {
    process.env.DATABASE_URL =
      "postgresql://postgres:postgres@localhost:5433/moodmarble";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.JWT_SECRET =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIifQ.signature";
    process.env.HOST = "127.0.0.1";
    process.env.PORT = "3000";

    expect(() => getAppEnv()).toThrowError(ZodError);
  });
});
