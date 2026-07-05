import { getApiRequestErrorMessage, isAbortError, logResolvedApiBaseUrl } from "./api";

describe("resolveApiBaseUrl", () => {
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    console.warn = jest.fn();
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock("expo-device");
    jest.unmock("react-native");
    console.warn = originalConsoleWarn;

    if (originalApiBaseUrl) {
      process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    } else {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    }

    const mutableEnv = process.env as Record<string, string | undefined>;
    if (originalNodeEnv) {
      mutableEnv.NODE_ENV = originalNodeEnv;
    } else {
      delete mutableEnv.NODE_ENV;
    }
  });

  function loadApiModule(platformOs: string, isDevice: boolean) {
    jest.doMock("expo-device", () => ({
      isDevice,
    }));
    jest.doMock("react-native", () => ({
      Platform: {
        OS: platformOs,
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("./api") as typeof import("./api");
  }

  it("uses the configured API base URL before platform defaults", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.moodmarble.test";
    const { resolveApiBaseUrl } = loadApiModule("android", false);

    expect(resolveApiBaseUrl()).toBe("https://api.moodmarble.test");
  });

  it("uses the configured API base URL on a physical device", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://192.168.1.40:3000";
    const { resolveApiBaseUrl } = loadApiModule("ios", true);

    expect(resolveApiBaseUrl()).toBe("http://192.168.1.40:3000");
  });

  it("defaults to 127.0.0.1 on web", () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const { resolveApiBaseUrl } = loadApiModule("web", false);

    expect(resolveApiBaseUrl()).toBe("http://127.0.0.1:3000");
  });

  it("defaults to 10.0.2.2 on the Android emulator", () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const { resolveApiBaseUrl } = loadApiModule("android", false);

    expect(resolveApiBaseUrl()).toBe("http://10.0.2.2:3000");
  });

  it("defaults to 127.0.0.1 on the iOS simulator", () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const { resolveApiBaseUrl } = loadApiModule("ios", false);

    expect(resolveApiBaseUrl()).toBe("http://127.0.0.1:3000");
  });

  it("requires EXPO_PUBLIC_API_BASE_URL on a physical device", () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const { resolveApiBaseUrl } = loadApiModule("android", true);

    expect(() => resolveApiBaseUrl()).toThrow(
      "EXPO_PUBLIC_API_BASE_URL must be set when running on a physical device.",
    );
  });

  it("warns in dev when Android emulator is forced to a non-emulator host", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://192.168.1.37:3000";
    const { resolveApiBaseUrl } = loadApiModule("android", false);

    resolveApiBaseUrl();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Android emulator traffic cannot reach a LAN/private host"),
    );
  });

  it("does not warn on Android emulator when the override is the emulator host", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://10.0.2.2:3000";
    const { resolveApiBaseUrl } = loadApiModule("android", false);

    resolveApiBaseUrl();

    expect(console.warn).not.toHaveBeenCalled();
  });

  it("warns in dev when iOS simulator is forced to a LAN host", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://192.168.1.37:3000";
    const { resolveApiBaseUrl } = loadApiModule("ios", false);

    resolveApiBaseUrl();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("iOS simulator should use http://127.0.0.1:3000"),
    );
  });

  it("does not warn in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://192.168.1.37:3000";
    const { resolveApiBaseUrl } = loadApiModule("android", false);

    resolveApiBaseUrl();

    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe("getApiRequestErrorMessage", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    const mutableEnv = process.env as Record<string, string | undefined>;
    if (originalNodeEnv) {
      mutableEnv.NODE_ENV = originalNodeEnv;
    } else {
      delete mutableEnv.NODE_ENV;
    }
  });

  it("returns a stable message in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    expect(
      getApiRequestErrorMessage("Stable message.", new Error("boom"), "http://host/path"),
    ).toBe("Stable message.");
  });

  it("includes the backend URL in dev", () => {
    expect(
      getApiRequestErrorMessage("Stable message.", new Error("boom"), "http://host/path"),
    ).toBe("Stable message. Dev details: Error: boom (http://host/path)");
  });

  it("uses a connectivity-specific hint for AbortError", () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");

    expect(
      getApiRequestErrorMessage(
        "Unable to join workspace right now.",
        abortError,
        "http://10.0.2.2:3000/workspace/join",
      ),
    ).toBe(
      "Unable to join workspace right now. Dev details: Request timed out — check that the backend is reachable at http://10.0.2.2:3000/workspace/join",
    );
  });

  it("detects an AbortError surfaced as a TypeError", () => {
    const typeError = new TypeError("Aborted");

    expect(
      getApiRequestErrorMessage(
        "Unable to join workspace right now.",
        typeError,
        "http://10.0.2.2:3000/workspace/join",
      ),
    ).toBe(
      "Unable to join workspace right now. Dev details: Request timed out — check that the backend is reachable at http://10.0.2.2:3000/workspace/join",
    );
  });

  it("detects an AbortError without referencing DOMException at runtime", () => {
    const originalDOMException = globalThis.DOMException;
    // Simulate React Native where DOMException is not defined globally.
    (globalThis as unknown as Record<string, unknown>).DOMException = undefined;

    try {
      const abortLike = Object.assign(new Error("The operation was aborted."), {
        name: "AbortError",
      });

      expect(isAbortError(abortLike)).toBe(true);
    } finally {
      (globalThis as unknown as Record<string, unknown>).DOMException = originalDOMException;
    }
  });
});

describe("logResolvedApiBaseUrl", () => {
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsoleInfo = console.info;

  afterEach(() => {
    console.info = originalConsoleInfo;

    if (originalApiBaseUrl) {
      process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    } else {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    }

    const mutableEnv = process.env as Record<string, string | undefined>;
    if (originalNodeEnv) {
      mutableEnv.NODE_ENV = originalNodeEnv;
    } else {
      delete mutableEnv.NODE_ENV;
    }
  });

  it("logs the resolved base URL and its source in dev", () => {
    console.info = jest.fn();
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://192.168.1.37:3000";

    logResolvedApiBaseUrl();

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("[MoodMarble] API base URL: http://192.168.1.37:3000"),
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("[source: EXPO_PUBLIC_API_BASE_URL]"),
    );
  });

  it("does not log in production", () => {
    console.info = jest.fn();
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://192.168.1.37:3000";

    logResolvedApiBaseUrl();

    expect(console.info).not.toHaveBeenCalled();
  });
});
