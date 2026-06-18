import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";

import {
  createManagerJwt,
  MANAGER_JWT_EXPIRES_IN,
  verifyManagerJwt,
} from "../../src/auth/manager-jwt";
import { UnauthorizedError } from "../../src/auth/device-jwt";

const JWT_SECRET = "test-jwt-secret";
const WORKSPACE_ID = "ws_test";
const TEAM_ID = "tm_product";

describe("manager jwt auth", () => {
  it("creates and accepts a valid manager jwt with team scope", () => {
    const { managerJwt } = createManagerJwt(JWT_SECRET, {
      workspace_id: WORKSPACE_ID,
      team_id: TEAM_ID,
      role: "manager",
    });

    expect(verifyManagerJwt(`Bearer ${managerJwt}`, JWT_SECRET)).toEqual({
      workspace_id: WORKSPACE_ID,
      team_id: TEAM_ID,
      role: "manager",
    });
  });

  it("keeps the manager jwt lifetime aligned to 30 days", () => {
    const { managerJwt } = createManagerJwt(JWT_SECRET, {
      workspace_id: WORKSPACE_ID,
      team_id: TEAM_ID,
      role: "manager",
    });
    const decoded = jwt.decode(managerJwt) as jwt.JwtPayload;

    expect(MANAGER_JWT_EXPIRES_IN).toBe("30d");
    expect(decoded.exp).toBeTypeOf("number");
    expect(decoded.iat).toBeTypeOf("number");
    expect((decoded.exp ?? 0) - (decoded.iat ?? 0)).toBe(30 * 24 * 60 * 60);
  });

  it("rejects a token with the wrong role", () => {
    const invalidManagerJwt = jwt.sign(
      {
        workspace_id: WORKSPACE_ID,
        team_id: TEAM_ID,
        role: "member",
      },
      JWT_SECRET,
      {
        expiresIn: "30d",
      },
    );

    expect(() =>
      verifyManagerJwt(`Bearer ${invalidManagerJwt}`, JWT_SECRET),
    ).toThrowError(UnauthorizedError);
  });

  it("rejects an expired manager jwt", () => {
    const expiredManagerJwt = jwt.sign(
      {
        workspace_id: WORKSPACE_ID,
        team_id: TEAM_ID,
        role: "manager",
      },
      JWT_SECRET,
      {
        expiresIn: -1,
      },
    );

    expect(() =>
      verifyManagerJwt(`Bearer ${expiredManagerJwt}`, JWT_SECRET),
    ).toThrowError(UnauthorizedError);
  });
});
