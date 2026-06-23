globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const originalConsoleError = console.error;

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    executionEnvironment: null,
    appOwnership: null,
  },
  executionEnvironment: null,
  appOwnership: null,
}));

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const firstArgument = args[0];

    if (
      typeof firstArgument === "string" &&
      (firstArgument.includes(
        "The current testing environment is not configured to support act(...)",
      ) ||
        firstArgument.includes("You seem to have overlapping act() calls"))
    ) {
      return;
    }

    originalConsoleError(...args);
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

export {};
