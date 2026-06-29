import * as SecureStore from "expo-secure-store";
import { submitMoodSubmission } from "@/features/mood-submission/api";
import {
  drainQueue,
  enqueueSubmission,
  loadQueue,
  saveQueue,
  submitMoodSubmissionWithQueue,
} from "@/features/mood-submission/queue";

jest.mock("expo-secure-store", () => {
  const store: Record<string, string> = {};

  return {
    getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
    _store: store,
  };
});

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("@/features/mood-submission/api", () => ({
  submitMoodSubmission: jest.fn(),
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore> & {
  _store: Record<string, string>;
};
const mockSubmit = submitMoodSubmission as jest.MockedFunction<typeof submitMoodSubmission>;

const PAYLOAD = {
  workspace_id: "ws_test",
  team_id: "tm_test",
  mood_type: "calm" as const,
  tags: [] as const,
  hour_of_day: 10,
  submission_date: "2026-07-01",
};
const JWT = "device-jwt-test";

beforeEach(async () => {
  // Clear the SecureStore mock store between tests.
  Object.keys(mockSecureStore._store).forEach((key) => delete mockSecureStore._store[key]);
  jest.clearAllMocks();
});

describe("enqueueSubmission", () => {
  it("stores a pending item", async () => {
    await enqueueSubmission(PAYLOAD, JWT);

    const queue = await loadQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toEqual(PAYLOAD);
    expect(queue[0].deviceJwt).toBe(JWT);
    expect(typeof queue[0].queuedAt).toBe("string");
  });

  it("respects MAX_QUEUE_SIZE by dropping the oldest item", async () => {
    const payloadA = { ...PAYLOAD, mood_type: "happy" as const };
    const payloadB = { ...PAYLOAD, mood_type: "calm" as const };
    const payloadC = { ...PAYLOAD, mood_type: "focused" as const };
    const payloadD = { ...PAYLOAD, mood_type: "stressed" as const };

    await enqueueSubmission(payloadA, JWT);
    await enqueueSubmission(payloadB, JWT);
    await enqueueSubmission(payloadC, JWT);
    // MAX_QUEUE_SIZE is 3 — adding a 4th should drop payloadA.
    await enqueueSubmission(payloadD, JWT);

    const queue = await loadQueue();

    expect(queue).toHaveLength(3);
    expect(queue[0].payload.mood_type).toBe("calm");
    expect(queue[1].payload.mood_type).toBe("focused");
    expect(queue[2].payload.mood_type).toBe("stressed");
  });
});

describe("drainQueue", () => {
  it("calls submitMoodSubmission for each item on success", async () => {
    mockSubmit.mockResolvedValue(undefined);

    await enqueueSubmission(PAYLOAD, JWT);
    await enqueueSubmission({ ...PAYLOAD, mood_type: "happy" as const }, JWT);

    await drainQueue();

    expect(mockSubmit).toHaveBeenCalledTimes(2);
    expect(await loadQueue()).toHaveLength(0);
  });

  it("stops on network error and preserves remaining items", async () => {
    mockSubmit
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValue(undefined);

    await enqueueSubmission(PAYLOAD, JWT);
    await enqueueSubmission({ ...PAYLOAD, mood_type: "happy" as const }, JWT);

    await drainQueue();

    // First item caused a TypeError — drain stopped, both items still present.
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const remaining = await loadQueue();
    expect(remaining).toHaveLength(2);
  });

  it("removes 4xx-erroring items and continues to the next", async () => {
    mockSubmit
      .mockRejectedValueOnce(new Error("Daily mood submission limit reached."))
      .mockResolvedValue(undefined);

    await enqueueSubmission(PAYLOAD, JWT);
    await enqueueSubmission({ ...PAYLOAD, mood_type: "happy" as const }, JWT);

    await drainQueue();

    // First item failed with a non-network error — it was removed.
    // Second item succeeded.
    expect(mockSubmit).toHaveBeenCalledTimes(2);
    expect(await loadQueue()).toHaveLength(0);
  });
});

describe("submitMoodSubmissionWithQueue", () => {
  it("resolves normally on network error (optimistic UX)", async () => {
    mockSubmit.mockRejectedValueOnce(new TypeError("Network request failed"));

    await expect(submitMoodSubmissionWithQueue(PAYLOAD, JWT)).resolves.toBeUndefined();

    // Item should have been enqueued.
    const queue = await loadQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toEqual(PAYLOAD);
  });

  it("rethrows on daily limit error", async () => {
    mockSubmit.mockRejectedValueOnce(new Error("Daily mood submission limit reached."));

    await expect(submitMoodSubmissionWithQueue(PAYLOAD, JWT)).rejects.toThrow(
      "Daily mood submission limit reached.",
    );

    // Nothing should have been queued — it's a permanent error.
    expect(await loadQueue()).toHaveLength(0);
  });
});
