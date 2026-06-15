import type { MoodSubmission } from "@/contracts/mood-submission";
import { z } from "zod";

const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DeviceJwtSchema = z.string().trim().min(1);

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

export function createApiUrl(path: string): string {
  const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const apiBaseUrl = configuredApiBaseUrl || DEFAULT_API_BASE_URL;

  return new URL(path, apiBaseUrl).toString();
}

async function getSubmissionErrorMessage(response: Response): Promise<string> {
  try {
    const responseBody = (await response.json()) as { message?: unknown };

    if (
      typeof responseBody.message === "string" &&
      responseBody.message.trim()
    ) {
      return responseBody.message;
    }
  } catch {
    // Fall through to the stable default message.
  }

  return "Unable to submit mood right now.";
}
