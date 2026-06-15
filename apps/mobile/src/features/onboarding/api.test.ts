import { joinWorkspace } from "@/features/onboarding/api";
import { getOrCreateDeviceToken } from "@/features/onboarding/device-token";

jest.mock("@/features/onboarding/device-token", () => ({
  getOrCreateDeviceToken: jest.fn(),
}));

describe("joinWorkspace", () => {
  const originalFetch = globalThis.fetch;
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const mockedGetOrCreateDeviceToken = jest.mocked(getOrCreateDeviceToken);

  beforeEach(() => {
    globalThis.fetch = jest.fn() as typeof fetch;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    mockedGetOrCreateDeviceToken.mockResolvedValue(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (originalApiBaseUrl) {
      process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    } else {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    }
  });

  it("posts the shared join payload and returns the shared response shape", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        workspace: {
          id: "ws_test",
          name: "MoodMarble Workspace",
        },
        teams: [
          {
            id: "tm_product",
            name: "Product",
          },
        ],
        device_jwt: "device-jwt-token",
      }),
    });

    await expect(joinWorkspace("abc123")).resolves.toEqual({
      workspace: {
        id: "ws_test",
        name: "MoodMarble Workspace",
      },
      teams: [
        {
          id: "tm_product",
          name: "Product",
        },
      ],
      device_jwt: "device-jwt-token",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/workspace/join",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          join_code: "ABC123",
          device_token: "550e8400-e29b-41d4-a716-446655440000",
        }),
      }),
    );
  });

  it("surfaces the backend join error message when provided", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: "Join code not found." }),
    });

    await expect(joinWorkspace("ABC123")).rejects.toThrow(
      "Join code not found.",
    );
  });

  it("falls back to a stable message when the network request itself fails", async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(
      new TypeError("Network request failed"),
    );

    await expect(joinWorkspace("ABC123")).rejects.toThrow(
      "Unable to join workspace right now.",
    );
  });
});
