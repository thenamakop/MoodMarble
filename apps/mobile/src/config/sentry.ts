import * as Sentry from "@sentry/react-native";

let initialised = false;

export function initialiseSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

  if (initialised || !dsn) {
    if (!dsn && !__DEV__) {
      // In production builds without a DSN, log a warning to Metro.
      console.warn("[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash reporting disabled.");
    }
    return;
  }

  Sentry.init({
    dsn,
    // In development, show a red overlay for JS errors instead of
    // reporting to Sentry. In production, report silently.
    enableInExpoDevelopment: false,
    environment: __DEV__ ? "development" : "production",
    // Do not trace performance in development (too noisy).
    tracesSampleRate: __DEV__ ? 0 : 0.1,
    // Capture native stack frames for React Native crashes.
    enableNativeFramesTracking: true,
    // Automatically capture unhandled promise rejections.
    enableCaptureFailedRequests: false,
  });

  initialised = true;
}
