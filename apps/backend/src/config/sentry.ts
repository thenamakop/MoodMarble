import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

let initialised = false;

export function initialiseSentry(dsn: string | undefined): void {
  if (initialised || !dsn) {
    if (!dsn) {
      console.warn("[Sentry] SENTRY_DSN not set — error reporting is disabled.");
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "production",
    integrations: [nodeProfilingIntegration()],
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
