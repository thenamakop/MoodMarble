import { SubmissionDateSchema } from "./schemas";

export function getLocalSubmissionDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return SubmissionDateSchema.parse(`${year}-${month}-${day}`);
}
