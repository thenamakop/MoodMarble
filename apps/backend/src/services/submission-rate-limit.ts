import type Redis from "ioredis";

const DAILY_SUBMISSION_LIMIT = 5;
const RATE_LIMIT_TTL_SECONDS = 60 * 60 * 24 * 2;

export interface SubmissionRateLimitResult {
  allowed: boolean;
}

export interface SubmissionRateLimiter {
  consume(deviceToken: string, submissionDate: string): Promise<SubmissionRateLimitResult>;
}

export class InMemorySubmissionRateLimiter implements SubmissionRateLimiter {
  private readonly counters = new Map<string, number>();

  async consume(deviceToken: string, submissionDate: string): Promise<SubmissionRateLimitResult> {
    const key = `${deviceToken}:${submissionDate}`;
    const currentCount = this.counters.get(key) ?? 0;

    if (currentCount >= DAILY_SUBMISSION_LIMIT) {
      return { allowed: false };
    }

    this.counters.set(key, currentCount + 1);
    return { allowed: true };
  }
}

export class RedisSubmissionRateLimiter implements SubmissionRateLimiter {
  constructor(private readonly redis: Redis) {}

  async consume(deviceToken: string, submissionDate: string): Promise<SubmissionRateLimitResult> {
    const key = `moodmarble:submission-limit:${deviceToken}:${submissionDate}`;
    const currentCount = await this.redis.incr(key);

    if (currentCount === 1) {
      await this.redis.expire(key, RATE_LIMIT_TTL_SECONDS);
    }

    return {
      allowed: currentCount <= DAILY_SUBMISSION_LIMIT,
    };
  }
}

export class SubmissionRateLimitExceededError extends Error {
  constructor() {
    super("Daily mood submission limit reached.");
  }
}
