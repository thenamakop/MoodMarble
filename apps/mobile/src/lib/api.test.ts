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

  it("defaults to localhost on web", () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const { resolveApiBaseUrl } = loadApiModule("web", false);

    expect(resolveApiBaseUrl()).toBe("http://localhost:3000");
  });

  it("defaults to 10.0.2.2 on the Android emulator", () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const { resolveApiBaseUrl } = loadApiModule("android", false);

    expect(resolveApiBaseUrl()).toBe("http://10.0.2.2:3000");
  });

  it("keeps localhost on the iOS simulator", () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const { resolveApiBaseUrl } = loadApiModule("ios", false);

    expect(resolveApiBaseUrl()).toBe("http://localhost:3000");
  });
});
