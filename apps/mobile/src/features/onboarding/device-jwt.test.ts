import { isDeviceJwtActive } from "@/features/onboarding/device-jwt";

describe("isDeviceJwtActive", () => {
  it("accepts a JWT with a future exp claim", () => {
    expect(isDeviceJwtActive(createDeviceJwt({ exp: futureExp() }))).toBe(true);
  });

  it("rejects a JWT with an expired exp claim", () => {
    expect(isDeviceJwtActive(createDeviceJwt({ exp: pastExp() }))).toBe(false);
  });

  it("rejects a JWT with a missing exp claim", () => {
    expect(isDeviceJwtActive(createDeviceJwt({}))).toBe(false);
  });

  it("rejects malformed JWT payloads", () => {
    expect(isDeviceJwtActive("not-a-jwt")).toBe(false);
    expect(isDeviceJwtActive("a.b.c")).toBe(false);
  });
});

function createDeviceJwt(payload: Record<string, unknown>): string {
  return [
    encodeJsonSegment({ alg: "none", typ: "JWT" }),
    encodeJsonSegment(payload),
    "signature",
  ].join(".");
}

function encodeJsonSegment(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function futureExp(): number {
  return Math.floor(Date.now() / 1000) + 60 * 60;
}

function pastExp(): number {
  return Math.floor(Date.now() / 1000) - 60;
}
