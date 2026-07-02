import * as Device from "expo-device";
import { Platform } from "react-native";

export const LOCALHOST_API_BASE_URL = "http://127.0.0.1:3000";
export const ANDROID_EMULATOR_API_BASE_URL = "http://10.0.2.2:3000";

// Abort any API request that doesn't receive a response within this window.
// Prevents silent hangs when the backend is unreachable (e.g. wrong IP,
// server not started, network change mid-session).
export const API_REQUEST_TIMEOUT_MS = 8000;

let _resolvedBaseUrl: string | undefined;

export function resolveApiBaseUrl(): string {
  const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (Platform.OS === "web") {
    return LOCALHOST_API_BASE_URL;
  }

  if (Platform.OS === "android" && !Device.isDevice) {
    return ANDROID_EMULATOR_API_BASE_URL;
  }

  if (!Device.isDevice) {
    return LOCALHOST_API_BASE_URL;
  }

  throw new Error("EXPO_PUBLIC_API_BASE_URL must be set when running on a physical device.");
}

/**
 * Logs the resolved API base URL once per app session (dev builds only).
 *
 * Call this during app startup so the Metro console immediately shows which
 * backend the app is pointed at. Helps diagnose stale env-var overrides and
 * wrong-IP failures without opening the network inspector.
 */
export function logResolvedApiBaseUrl(): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  let resolved: string;

  try {
    resolved = resolveApiBaseUrl();
  } catch (err) {
    console.warn(
      "[MoodMarble] API base URL: UNRESOLVED —",
      err instanceof Error ? err.message : err,
    );
    return;
  }

  if (_resolvedBaseUrl === resolved) {
    return; // already logged this session
  }

  _resolvedBaseUrl = resolved;
  const source = process.env.EXPO_PUBLIC_API_BASE_URL?.trim()
    ? "EXPO_PUBLIC_API_BASE_URL"
    : `runtime default (${Platform.OS})`;
  console.info(`[MoodMarble] API base URL: ${resolved}  [source: ${source}]`);
}

export function createApiUrl(path: string): string {
  return new URL(path, resolveApiBaseUrl()).toString();
}

export function getApiRequestErrorMessage(
  stableMessage: string,
  error: unknown,
  requestUrl?: string,
): string {
  if (process.env.NODE_ENV === "production") {
    return stableMessage;
  }

  const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  return requestUrl
    ? `${stableMessage} Dev details: ${details} (${requestUrl})`
    : `${stableMessage} Dev details: ${details}`;
}

/**
 * Creates an AbortController pre-wired to a timeout.
 *
 * Returns both the signal (for `fetch`) and a `cancel` function. Call
 * `cancel()` in a `finally` block to clear the timer when the request
 * completes before the timeout fires.
 */
export function createRequestTimeout(ms: number = API_REQUEST_TIMEOUT_MS): {
  signal: AbortSignal;
  cancel: () => void;
} {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(id),
  };
}
