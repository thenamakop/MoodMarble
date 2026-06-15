import * as Crypto from "expo-crypto";

import {
  clearDeviceToken,
  getOrCreateDeviceToken,
  saveDeviceToken,
} from "@/features/onboarding/device-token";

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(),
}));

describe("anonymous device token storage", () => {
  const originalCrypto = globalThis.crypto;
  const mockedRandomUUID = jest.mocked(Crypto.randomUUID);

  beforeEach(() => {
    mockedRandomUUID.mockReset();
  });

  afterEach(async () => {
    await clearDeviceToken();

    if (originalCrypto) {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: originalCrypto,
      });
    }
  });

  it("generates and persists a device token with Expo crypto when runtime crypto is unavailable", async () => {
    mockedRandomUUID.mockReturnValue("550e8400-e29b-41d4-a716-446655440000");

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: undefined,
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
    mockedRandomUUID.mockReturnValue("660e8400-e29b-41d4-a716-446655440000");

    await expect(getOrCreateDeviceToken()).resolves.toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(mockedRandomUUID).not.toHaveBeenCalled();
  });

  it("falls back to global crypto.randomUUID when Expo crypto is unavailable", async () => {
    mockedRandomUUID.mockImplementation(() => {
      throw new Error("expo crypto unavailable");
    });

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        randomUUID: jest
          .fn()
          .mockReturnValue("660e8400-e29b-41d4-a716-446655440000"),
      },
    });

    await expect(getOrCreateDeviceToken()).resolves.toBe(
      "660e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("falls back to global crypto.getRandomValues when Expo crypto and randomUUID are unavailable", async () => {
    mockedRandomUUID.mockImplementation(() => {
      throw new Error("expo crypto unavailable");
    });

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues: jest.fn((typedArray: Uint8Array) => {
          typedArray.set([
            0x77, 0x0e, 0x84, 0x00, 0xe2, 0x9b, 0x11, 0xd4, 0xa7, 0x16, 0x44,
            0x66, 0x55, 0x44, 0x00, 0x00,
          ]);
          return typedArray;
        }),
      },
    });

    await expect(getOrCreateDeviceToken()).resolves.toBe(
      "770e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("throws a stable error when no crypto source exists", async () => {
    mockedRandomUUID.mockImplementation(() => {
      throw new Error("expo crypto unavailable");
    });

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: undefined,
    });

    await expect(getOrCreateDeviceToken()).rejects.toThrow(
      "Unable to create anonymous device token.",
    );
  });
});
