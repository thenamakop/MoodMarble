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
    if (process.env.NODE_ENV !== "production") {
      warnIfHostLooksMismatched(configuredApiBaseUrl);
    }
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

function warnIfHostLooksMismatched(configuredUrl: string): void {
  let hostname: string | undefined;

  try {
    hostname = new URL(configuredUrl).hostname;
  } catch {
    return;
  }

  if (!hostname) {
    return;
  }

  const isPrivateLan =
    /^127\./.test(hostname) === false &&
    (/^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      /^192\.168\./.test(hostname));

  const isAndroidEmulator = Platform.OS === "android" && !Device.isDevice;
  const isIosSimulator = Platform.OS === "ios" && !Device.isDevice;

  if (isAndroidEmulator && hostname !== "10.0.2.2") {
    console.warn(
      `[MoodMarble] EXPO_PUBLIC_API_BASE_URL is set to ${configuredUrl}. ` +
        `Android emulator traffic cannot reach a LAN/private host; ` +
        `clear this override to use the platform default ${ANDROID_EMULATOR_API_BASE_URL}.`,
    );
    return;
  }

  if (isIosSimulator && isPrivateLan) {
    console.warn(
      `[MoodMarble] EXPO_PUBLIC_API_BASE_URL is set to ${configuredUrl}. ` +
        `iOS simulator should use ${LOCALHOST_API_BASE_URL}; ` +
        `only set a LAN override when testing on a physical device.`,
    );
  }
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

  if (isAbortError(error)) {
    const connectivityHint = requestUrl
      ? `Request timed out — check that the backend is reachable at ${requestUrl}`
      : "Request timed out — check that the backend is reachable";
    return `${stableMessage} Dev details: ${connectivityHint}`;
  }

  return requestUrl
    ? `${stableMessage} Dev details: ${details} (${requestUrl})`
    : `${stableMessage} Dev details: ${details}`;
}

export function isAbortError(error: unknown): boolean {
  if (hasErrorName(error, "AbortError")) {
    return true;
  }

  if (hasErrorMessage(error, /aborted|abort/i)) {
    return true;
  }

  const cause = hasErrorCause(error) ? (error as { cause?: unknown }).cause : undefined;
  if (cause) {
    return isAbortError(cause);
  }

  return false;
}

function hasErrorName(error: unknown, name: string): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === name;
}

function hasErrorMessage(error: unknown, pattern: RegExp): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    pattern.test(error.message)
  );
}

function hasErrorCause(error: unknown): boolean {
  return typeof error === "object" && error !== null && "cause" in error;
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
