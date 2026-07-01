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

/**
 * Reads the persisted queue from storage.
 *
 * @returns The stored queue string, or `null` if no queue is saved.
 */
async function readRawQueue(): Promise<string | null> {
  if (Platform.OS === "web") {
    return webQueueMemoryFallback;
  }

  return SecureStore.getItemAsync(QUEUE_STORAGE_KEY);
}

/**
 * Persists the raw queue string.
 *
 * Uses an in-memory fallback on web and secure storage on native.
 *
 * @param value - The serialized queue data to store
 */
async function writeRawQueue(value: string): Promise<void> {
  if (Platform.OS === "web") {
    webQueueMemoryFallback = value;
    return;
  }

  await SecureStore.setItemAsync(QUEUE_STORAGE_KEY, value);
}

/**
 * Deletes the stored queue.
 */
async function deleteRawQueue(): Promise<void> {
  if (Platform.OS === "web") {
    webQueueMemoryFallback = null;
    return;
  }

  await SecureStore.deleteItemAsync(QUEUE_STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Public API
/**
 * Loads the persisted pending submission queue.
 *
 * @returns The stored pending submissions, or an empty array if none exists or the stored data is invalid.
 */

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

/**
 * Saves pending submissions to persistent storage.
 *
 * Clears the stored queue when `items` is empty.
 *
 * @param items - The pending submissions to store
 */
export async function saveQueue(items: PendingSubmission[]): Promise<void> {
  if (items.length === 0) {
    await deleteRawQueue();
    return;
  }

  await writeRawQueue(JSON.stringify(items));
}

/**
 * Enqueues a mood submission for later retry and keeps the queue within its size limit.
 *
 * @param payload - The mood submission to store
 * @param deviceJwt - The device token to associate with the queued submission
 */
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

/**
 * Attempts to submit queued mood submissions and updates the stored queue.
 *
 * Stops at the first network error and keeps the remaining items in the queue.
 * Items that fail with other errors are removed from the queue and the drain continues.
 */
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

/**
 * Submits a mood entry immediately, or queues it when the network is unavailable.
 *
 * @param payload - The mood submission to send.
 * @param deviceJwt - The device token used to authenticate the submission.
 * @throws Re-throws submission errors other than network failures.
 */
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
