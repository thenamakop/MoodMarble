import jwt from "jsonwebtoken";

import {
  createDeviceJwt,
  DEVICE_JWT_EXPIRES_IN,
  UnauthorizedError,
  verifyDeviceJwt,
} from "../../src/auth/device-jwt";

const JWT_SECRET = "test-jwt-secret";
const DEVICE_TOKEN = "550e8400-e29b-41d4-a716-446655440000";
const WORKSPACE_ID = "ws_test";

describe("device jwt auth", () => {
  it("creates and accepts a valid anonymous device jwt", () => {
    const { deviceJwt, deviceToken } = createDeviceJwt(JWT_SECRET, WORKSPACE_ID, DEVICE_TOKEN);

    expect(deviceToken).toBe(DEVICE_TOKEN);
    expect(verifyDeviceJwt(`Bearer ${deviceJwt}`, JWT_SECRET)).toEqual({
      device_token: DEVICE_TOKEN,
      workspace_id: WORKSPACE_ID,
    });
  });

  it("keeps the jwt lifetime aligned to 30 days", () => {
    const { deviceJwt } = createDeviceJwt(JWT_SECRET, WORKSPACE_ID, DEVICE_TOKEN);
    const decoded = jwt.decode(deviceJwt) as jwt.JwtPayload;

    expect(DEVICE_JWT_EXPIRES_IN).toBe("30d");
    expect(typeof decoded.exp).toBe("number");
    expect(typeof decoded.iat).toBe("number");
    expect((decoded.exp ?? 0) - (decoded.iat ?? 0)).toBe(30 * 24 * 60 * 60);
  });

  it("rejects an invalid device jwt", () => {
    expect(() => verifyDeviceJwt("Bearer invalid-jwt", JWT_SECRET)).toThrowError(UnauthorizedError);
  });

  it("rejects an expired device jwt", () => {
    const expiredJwt = jwt.sign(
      {
        device_token: DEVICE_TOKEN,
        workspace_id: WORKSPACE_ID,
      },
      JWT_SECRET,
      {
        expiresIn: -1,
      },
    );

    expect(() => verifyDeviceJwt(`Bearer ${expiredJwt}`, JWT_SECRET)).toThrowError(
      UnauthorizedError,
    );
  });
});
