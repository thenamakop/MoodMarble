import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { z } from "zod";

import { MoodSubmissionSchema, type MoodSubmission } from "@/contracts/mood-submission";

import { submitMoodSubmission } from "./api";

const QUEUE_STORAGE_KEY = "moodmarble.pending-submissions";
const MAX_QUEUE_SIZE = 3;

const PendingSubmissionSchema = z
  .object({
    payload: MoodSubmissionSchema,
    deviceJwt: z.string().trim().min(1),
    queuedAt: z.string().datetime(),
  })
  .strict();

const PendingSubmissionsSchema = z.array(PendingSubmissionSchema);

export type PendingSubmission = z.infer<typeof PendingSubmissionSchema>;

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

let webQueueMemoryFallback: string | null = null;

async function readRawQueue(): Promise<string | null> {
  if (Platform.OS === "web") {
    return webQueueMemoryFallback;
  }

  return SecureStore.getItemAsync(QUEUE_STORAGE_KEY);
}

async function writeRawQueue(value: string): Promise<void> {
  if (Platform.OS === "web") {
    webQueueMemoryFallback = value;
    return;
  }

  await SecureStore.setItemAsync(QUEUE_STORAGE_KEY, value);
}

async function deleteRawQueue(): Promise<void> {
  if (Platform.OS === "web") {
    webQueueMemoryFallback = null;
    return;
  }

  await SecureStore.deleteItemAsync(QUEUE_STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function loadQueue(): Promise<PendingSubmission[]> {
  try {
    const raw = await readRawQueue();

    if (!raw) {
      return [];
    }

    const parsed = PendingSubmissionsSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      return [];
    }

    return parsed.data;
  } catch {
    return [];
  }
}

export async function saveQueue(items: PendingSubmission[]): Promise<void> {
  if (items.length === 0) {
    await deleteRawQueue();
    return;
  }

  await writeRawQueue(JSON.stringify(items));
}

export async function enqueueSubmission(payload: MoodSubmission, deviceJwt: string): Promise<void> {
  const current = await loadQueue();

  const trimmed = current.length >= MAX_QUEUE_SIZE ? current.slice(1) : current;

  const next: PendingSubmission[] = [
    ...trimmed,
    {
      payload: MoodSubmissionSchema.parse(payload),
      deviceJwt,
      queuedAt: new Date().toISOString(),
    },
  ];

  await saveQueue(next);
}

export async function drainQueue(): Promise<void> {
  const queue = await loadQueue();

  if (queue.length === 0) {
    return;
  }

  const remaining: PendingSubmission[] = [...queue];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];

    try {
      await submitMoodSubmission(item.payload, item.deviceJwt);
      // Success — remove this item from the remaining list.
      remaining.shift();
    } catch (error) {
      if (error instanceof TypeError) {
        // Network error — stop draining and keep remaining items.
        break;
      }

      // 4xx or any other non-network error — item will never succeed, discard
      // and continue to the next one.
      remaining.shift();
    }
  }

  await saveQueue(remaining);
}

export async function submitMoodSubmissionWithQueue(
  payload: MoodSubmission,
  deviceJwt: string,
): Promise<void> {
  try {
    await submitMoodSubmission(payload, deviceJwt);
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error — queue for later and return normally so the caller
      // shows the optimistic confirmation overlay.
      await enqueueSubmission(payload, deviceJwt);
      return;
    }

    // Daily limit, auth error, 4xx, etc. — rethrow so the screen displays
    // the appropriate error message.
    throw error;
  }
}
