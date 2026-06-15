import {
  clearDeviceToken,
  getOrCreateDeviceToken,
  saveDeviceToken,
} from "@/features/onboarding/device-token";

describe("anonymous device token storage", () => {
  const originalCrypto = globalThis.crypto;

  afterEach(async () => {
    await clearDeviceToken();

    if (originalCrypto) {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: originalCrypto,
      });
    }
  });

  it("generates and persists a device token when none exists yet", async () => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        randomUUID: jest
          .fn()
          .mockReturnValue("550e8400-e29b-41d4-a716-446655440000"),
      },
    });

    await expect(getOrCreateDeviceToken()).resolves.toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(
      window.sessionStorage.getItem("moodmarble.anonymous-device-token"),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("reuses the persisted device token instead of generating a new one", async () => {
    await saveDeviceToken("550e8400-e29b-41d4-a716-446655440000");

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        randomUUID: jest
          .fn()
          .mockReturnValue("660e8400-e29b-41d4-a716-446655440000"),
      },
    });

    await expect(getOrCreateDeviceToken()).resolves.toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("falls back to generating a new token when the stored token is missing", async () => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        randomUUID: jest
          .fn()
          .mockReturnValue("770e8400-e29b-41d4-a716-446655440000"),
      },
    });

    await expect(getOrCreateDeviceToken()).resolves.toBe(
      "770e8400-e29b-41d4-a716-446655440000",
    );
  });
});
