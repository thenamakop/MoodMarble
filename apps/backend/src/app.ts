import Fastify, { type FastifyInstance } from "fastify";

import { registerMoodRoute } from "./routes/mood";
import type { MoodSubmissionStore } from "./services/mood-submissions";
import {
  InMemorySubmissionRateLimiter,
  type SubmissionRateLimiter,
} from "./services/submission-rate-limit";

interface BuildAppOptions {
  jwtSecret: string;
  moodSubmissionStore: MoodSubmissionStore;
  submissionRateLimiter?: SubmissionRateLimiter;
  now?: () => Date;
}

export async function buildApp(
  options: BuildAppOptions,
): Promise<FastifyInstance> {
  const app = Fastify();

  await registerMoodRoute(app, {
    jwtSecret: options.jwtSecret,
    moodSubmissionStore: options.moodSubmissionStore,
    submissionRateLimiter:
      options.submissionRateLimiter ?? new InMemorySubmissionRateLimiter(),
    now: options.now,
  });

  return app;
}
