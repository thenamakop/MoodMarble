import Fastify, { type FastifyInstance } from "fastify";

import { registerHealthRoutes } from "./routes/health";
import { registerMoodRoute } from "./routes/mood";
import { registerWorkspaceJoinRoute } from "./routes/workspace-join";
import {
  InMemoryMoodSubmissionStore,
  type MoodSubmissionStore,
} from "./services/mood-submissions";
import {
  InMemorySubmissionRateLimiter,
  type SubmissionRateLimiter,
} from "./services/submission-rate-limit";
import {
  InMemoryWorkspaceDirectory,
  type WorkspaceDirectory,
} from "./services/workspace-directory";

interface BuildAppOptions {
  jwtSecret?: string;
  moodSubmissionStore?: MoodSubmissionStore;
  workspaceDirectory?: WorkspaceDirectory;
  submissionRateLimiter?: SubmissionRateLimiter;
  now?: () => Date;
}

export async function buildApp(
  options: BuildAppOptions,
): Promise<FastifyInstance> {
  const app = Fastify();

  await registerHealthRoutes(app);
  await registerWorkspaceJoinRoute(app, {
    jwtSecret: options.jwtSecret,
    workspaceDirectory:
      options.workspaceDirectory ?? new InMemoryWorkspaceDirectory(),
  });
  await registerMoodRoute(app, {
    jwtSecret: options.jwtSecret,
    moodSubmissionStore:
      options.moodSubmissionStore ?? new InMemoryMoodSubmissionStore(),
    submissionRateLimiter:
      options.submissionRateLimiter ?? new InMemorySubmissionRateLimiter(),
    now: options.now,
  });

  return app;
}
