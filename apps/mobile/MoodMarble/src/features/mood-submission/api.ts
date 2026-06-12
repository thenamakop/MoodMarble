import type { MoodSubmission } from "@/contracts/mood-submission";

export async function submitMoodSubmission(
  payload: MoodSubmission,
  deviceJwt: string,
): Promise<void> {
  const response = await fetch("/mood", {
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
