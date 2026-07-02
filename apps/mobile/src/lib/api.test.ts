describe("resolveApiBaseUrl", () => {
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  afterEach(() => {
    jest.resetModules();
    jest.unmock("expo-device");
    jest.unmock("react-native");

    if (originalApiBaseUrl) {
      process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    } else {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
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
});
