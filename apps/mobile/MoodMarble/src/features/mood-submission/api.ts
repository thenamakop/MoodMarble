import type { MoodSubmission } from "@/contracts/mood-submission";

const DEFAULT_API_BASE_URL = "http://localhost:3000";

export async function submitMoodSubmission(
  payload: MoodSubmission,
  deviceJwt: string,
): Promise<void> {
  const response = await fetch(createApiUrl("/mood"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deviceJwt}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to submit mood right now.");
  }
}

export function createApiUrl(path: string): string {
  const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const apiBaseUrl = configuredApiBaseUrl || DEFAULT_API_BASE_URL;

  return new URL(path, apiBaseUrl).toString();
}
