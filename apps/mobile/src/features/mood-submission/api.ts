import type { MoodSubmission } from "@/contracts/mood-submission";
import { createApiUrl } from "@/lib/api";
import { z } from "zod";

const DeviceJwtSchema = z.string().trim().min(1);
const SAFE_SUBMISSION_ERROR_MESSAGES = new Set([
  "Daily mood submission limit reached.",
]);

export async function submitMoodSubmission(
  payload: MoodSubmission,
  deviceJwt: string,
): Promise<void> {
  const authorizationValue = DeviceJwtSchema.safeParse(deviceJwt);

  if (!authorizationValue.success) {
    throw new Error("Anonymous session missing. Join your workspace again.");
  }

  const response = await fetch(createApiUrl("/mood"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authorizationValue.data}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getSubmissionErrorMessage(response));
  }
}

async function getSubmissionErrorMessage(response: Response): Promise<string> {
  try {
    const responseBody = (await response.json()) as { message?: unknown };
    const publicErrorMessage =
      typeof responseBody.message === "string"
        ? responseBody.message.trim()
        : "";

    if (SAFE_SUBMISSION_ERROR_MESSAGES.has(publicErrorMessage)) {
      return publicErrorMessage;
    }
  } catch {
    // Fall through to the stable default message.
  }

  return "Unable to submit mood right now.";
}
