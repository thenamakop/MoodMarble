import { createRequire } from "node:module";

import * as Sentry from "@sentry/node";

const sentryRequire = createRequire(process.cwd() + "/package.json");

let initialised = false;

function getProfilingIntegration(): unknown | undefined {
  try {
    const profiling = sentryRequire("@sentry/profiling-node") as {
      nodeProfilingIntegration?: () => unknown;
    };

    return profiling.nodeProfilingIntegration?.();
  } catch (error) {
    console.warn(
      "[Sentry] Profiling integration unavailable; continuing without profiling.",
      error instanceof Error ? error.message : error,
    );
    return undefined;
  }
}

export function initialiseSentry(dsn: string | undefined): void {
  if (initialised || !dsn) {
    if (!dsn) {
      console.warn("[Sentry] SENTRY_DSN not set — error reporting is disabled.");
    }
    return;
  }

  const integrations: Array<unknown> = [];
  const profilingIntegration = getProfilingIntegration();

  if (profilingIntegration) {
    integrations.push(profilingIntegration);
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "production",
    integrations,
    // Sample 10% of transactions for performance tracing.
    // Set to 0 to disable performance tracing on the free tier.
    tracesSampleRate: 0.1,
    // Sample 10% of profiled transactions.
    profilesSampleRate: 0.1,
  });

  initialised = true;
}

export function captureException(error: unknown): void {
  if (!initialised) return;
  Sentry.captureException(error);
}
