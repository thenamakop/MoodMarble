const DAILY_SUBMISSION_LIMIT = 5;

export interface SubmissionRateLimitResult {
  allowed: boolean;
}

export interface SubmissionRateLimiter {
  consume(deviceToken: string, submissionDate: string): Promise<SubmissionRateLimitResult>;
}

export class InMemorySubmissionRateLimiter implements SubmissionRateLimiter {
  private readonly counters = new Map<string, number>();

  async consume(
    deviceToken: string,
    submissionDate: string,
  ): Promise<SubmissionRateLimitResult> {
    const key = `${deviceToken}:${submissionDate}`;
    const currentCount = this.counters.get(key) ?? 0;

    if (currentCount >= DAILY_SUBMISSION_LIMIT) {
      return { allowed: false };
    }

    this.counters.set(key, currentCount + 1);
    return { allowed: true };
  }
}

export class SubmissionRateLimitExceededError extends Error {
  constructor() {
    super("Daily mood submission limit reached.");
  }
}
