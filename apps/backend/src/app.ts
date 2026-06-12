import Fastify, { type FastifyInstance } from "fastify";

import { registerMoodRoute } from "./routes/mood";
import type { MoodSubmissionStore } from "./services/mood-submissions";

interface BuildAppOptions {
  jwtSecret: string;
  moodSubmissionStore: MoodSubmissionStore;
  now?: () => Date;
}

export async function buildApp(
  options: BuildAppOptions,
): Promise<FastifyInstance> {
  const app = Fastify();

  await registerMoodRoute(app, {
    jwtSecret: options.jwtSecret,
    moodSubmissionStore: options.moodSubmissionStore,
    now: options.now,
  });

  return app;
}
