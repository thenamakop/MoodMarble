import { createHash, randomUUID } from "node:crypto";

import type { MoodSubmission } from "../../../../packages/shared";
import type { NewMoodSubmission } from "../db/schema";

export interface MoodSubmissionStore {
  createSubmission(submission: NewMoodSubmission): Promise<void>;
}

export function buildMoodSubmissionRecord(
  submission: MoodSubmission,
  now = new Date(),
): NewMoodSubmission {
  return {
    id: createMarbleId(),
    teamId: submission.team_id,
    moodType: submission.mood_type,
    tags: submission.tags,
    noteHash: hashOptionalNote(submission.note),
    hourOfDay: submission.hour_of_day,
    submissionDate: now.toISOString().slice(0, 10),
  };
}

export function getSubmissionDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function createMarbleId(): string {
  return `mr_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function hashOptionalNote(note: string | undefined): string | null {
  if (!note) {
    return null;
  }

  return createHash("sha256").update(note).digest("hex");
}
