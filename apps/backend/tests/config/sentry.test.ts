jest.mock("@sentry/node", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock("@sentry/profiling-node", () => ({
  nodeProfilingIntegration: undefined,
}));

import * as Sentry from "@sentry/node";
import { initialiseSentry } from "../../src/config/sentry";

describe("initialiseSentry", () => {
  it("falls back to Sentry without profiling when profiling integration is unavailable", () => {
    const initMock = Sentry.init as jest.Mock;
    initMock.mockClear();

    initialiseSentry("https://example@sentry.io/1");

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock.mock.calls[0][0]).toMatchObject({
      dsn: "https://example@sentry.io/1",
      integrations: [],
    });
  });
});
