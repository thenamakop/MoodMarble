import jwt from "jsonwebtoken";

import {
  ADMIN_JWT_EXPIRES_IN,
  createAdminJwt,
  verifyAdminJwt,
} from "../../src/auth/admin-jwt";
import { createManagerJwt, verifyManagerJwt } from "../../src/auth/manager-jwt";
import { UnauthorizedError } from "../../src/auth/device-jwt";

const JWT_SECRET = "test-jwt-secret";
const WORKSPACE_ID = "ws_test";
const TEAM_ID = "tm_product";

describe("admin jwt auth", () => {
  it("creates and accepts a valid workspace-scoped admin jwt", () => {
    const { adminJwt } = createAdminJwt(JWT_SECRET, {
      workspace_id: WORKSPACE_ID,
      role: "admin",
    });

    expect(verifyAdminJwt(`Bearer ${adminJwt}`, JWT_SECRET)).toEqual({
      workspace_id: WORKSPACE_ID,
      role: "admin",
    });
  });

  it("keeps the admin jwt lifetime aligned to 30 days", () => {
    const { adminJwt } = createAdminJwt(JWT_SECRET, {
      workspace_id: WORKSPACE_ID,
      role: "admin",
    });
    const decoded = jwt.decode(adminJwt) as jwt.JwtPayload;

    expect(ADMIN_JWT_EXPIRES_IN).toBe("30d");
    expect(typeof decoded.exp).toBe("number");
    expect(typeof decoded.iat).toBe("number");
    expect((decoded.exp ?? 0) - (decoded.iat ?? 0)).toBe(30 * 24 * 60 * 60);
  });

  it("rejects a manager token at the admin boundary", () => {
    const { managerJwt } = createManagerJwt(JWT_SECRET, {
      workspace_id: WORKSPACE_ID,
      team_id: TEAM_ID,
      role: "manager",
    });

    expect(() =>
      verifyAdminJwt(`Bearer ${managerJwt}`, JWT_SECRET),
    ).toThrowError(UnauthorizedError);
    expect(verifyManagerJwt(`Bearer ${managerJwt}`, JWT_SECRET)).toEqual({
      workspace_id: WORKSPACE_ID,
      team_id: TEAM_ID,
      role: "manager",
    });
  });

  it("rejects a token with the wrong role", () => {
    const invalidAdminJwt = jwt.sign(
      {
        workspace_id: WORKSPACE_ID,
        role: "member",
      },
      JWT_SECRET,
      {
        expiresIn: "30d",
      },
    );

    expect(() =>
      verifyAdminJwt(`Bearer ${invalidAdminJwt}`, JWT_SECRET),
    ).toThrowError(UnauthorizedError);
  });

  it("rejects an expired admin jwt", () => {
    const expiredAdminJwt = jwt.sign(
      {
        workspace_id: WORKSPACE_ID,
        role: "admin",
      },
      JWT_SECRET,
      {
        expiresIn: -1,
      },
    );

    expect(() =>
      verifyAdminJwt(`Bearer ${expiredAdminJwt}`, JWT_SECRET),
    ).toThrowError(UnauthorizedError);
  });

  it("rejects a device jwt at the admin boundary", () => {
    const deviceJwt = jwt.sign(
      {
        device_token: "550e8400-e29b-41d4-a716-446655440000",
        workspace_id: WORKSPACE_ID,
      },
      JWT_SECRET,
      {
        expiresIn: "30d",
      },
    );

    expect(() =>
      verifyAdminJwt(`Bearer ${deviceJwt}`, JWT_SECRET),
    ).toThrowError(UnauthorizedError);
  });

  it("rejects a jwt signed with a different secret", () => {
    const wrongSecretJwt = jwt.sign(
      {
        workspace_id: WORKSPACE_ID,
        role: "admin",
      },
      "completely-different-secret",
      {
        expiresIn: "30d",
      },
    );

    expect(() =>
      verifyAdminJwt(`Bearer ${wrongSecretJwt}`, JWT_SECRET),
    ).toThrowError(UnauthorizedError);
  });
});
