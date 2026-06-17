import { z } from "zod";

import {
  HourOfDaySchema,
  MoodSubmissionTagsSchema,
  MoodSubmissionSchema,
  SubmissionDateSchema,
  type MoodSubmission,
  MoodSchema,
} from "@/contracts/mood-submission";

export const LocalMoodHistoryRecordIdSchema = z.string().min(1);
export const LocalMoodHistoryRecordedAtSchema = z.string().datetime();

export const LocalMoodHistoryRecordInputSchema = z
  .object({
    mood_type: MoodSchema,
    tags: MoodSubmissionTagsSchema,
    hour_of_day: HourOfDaySchema,
    submission_date: SubmissionDateSchema,
  })
  .strict();

export const LocalMoodHistoryRecordSchema =
  LocalMoodHistoryRecordInputSchema.extend({
    id: LocalMoodHistoryRecordIdSchema,
    recorded_at: LocalMoodHistoryRecordedAtSchema,
  }).strict();

export const LocalMoodHistoryDayGroupSchema = z
  .object({
    submission_date: SubmissionDateSchema,
    records: z.array(LocalMoodHistoryRecordSchema),
  })
  .strict();

export type LocalMoodHistoryRecordInput = z.infer<
  typeof LocalMoodHistoryRecordInputSchema
>;
export type LocalMoodHistoryRecord = z.infer<
  typeof LocalMoodHistoryRecordSchema
>;
export type LocalMoodHistoryDayGroup = z.infer<
  typeof LocalMoodHistoryDayGroupSchema
>;

interface CreateLocalMoodHistoryRecordOptions {
  idGenerator?: () => string;
  now?: () => Date;
}

export function extractLocalMoodHistoryRecordInput(
  submission: MoodSubmission,
): LocalMoodHistoryRecordInput {
  MoodSubmissionSchema.parse(submission);

  return LocalMoodHistoryRecordInputSchema.parse({
    mood_type: submission.mood_type,
    tags: submission.tags,
    hour_of_day: submission.hour_of_day,
    submission_date: submission.submission_date,
  });
}

export function createLocalMoodHistoryRecord(
  input: LocalMoodHistoryRecordInput,
  options: CreateLocalMoodHistoryRecordOptions = {},
): LocalMoodHistoryRecord {
  const normalizedInput = LocalMoodHistoryRecordInputSchema.parse(input);
  const idGenerator = options.idGenerator ?? createLocalHistoryId;
  const now = options.now ?? (() => new Date());

  return LocalMoodHistoryRecordSchema.parse({
    ...normalizedInput,
    id: idGenerator(),
    recorded_at: now().toISOString(),
  });
}

export function normalizeLocalMoodHistoryRecords(
  records: LocalMoodHistoryRecord[],
): LocalMoodHistoryRecord[] {
  return records
    .map((record) => LocalMoodHistoryRecordSchema.parse(record))
    .sort(compareHistoryRecords);
}

export function groupLocalMoodHistoryByDay(
  records: LocalMoodHistoryRecord[],
): LocalMoodHistoryDayGroup[] {
  const normalizedRecords = normalizeLocalMoodHistoryRecords(records);
  const groups = new Map<string, LocalMoodHistoryRecord[]>();

  for (const record of normalizedRecords) {
    const currentRecords = groups.get(record.submission_date) ?? [];
    currentRecords.push(record);
    groups.set(record.submission_date, currentRecords);
  }

  return Array.from(groups.entries()).map(([submissionDate, dayRecords]) =>
    LocalMoodHistoryDayGroupSchema.parse({
      submission_date: submissionDate,
      records: dayRecords,
    }),
  );
}

export function getLocalMoodHistoryDayKeys(
  records: LocalMoodHistoryRecord[],
): string[] {
  return groupLocalMoodHistoryByDay(records).map(
    (group) => group.submission_date,
  );
}

function compareHistoryRecords(
  left: LocalMoodHistoryRecord,
  right: LocalMoodHistoryRecord,
): number {
  if (left.submission_date !== right.submission_date) {
    return right.submission_date.localeCompare(left.submission_date);
  }

  return right.recorded_at.localeCompare(left.recorded_at);
}

function createLocalHistoryId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `history-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
