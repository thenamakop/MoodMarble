globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Sentry mock — the native module is not available in the Jest jsdom
// environment. It must be mocked before any module imports it.
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  wrap: (component: unknown) => component,
}));

// react-i18next mock — t(key, vars?) returns the key so tests assert on
// translation keys rather than raw English copy that may change.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (vars && Object.keys(vars).length > 0) {
        return Object.entries(vars).reduce<string>(
          (acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
          key,
        );
      }
      return key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: jest.fn() },
}));

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
