import * as Device from "expo-device";
import { Platform } from "react-native";

export const LOCALHOST_API_BASE_URL = "http://127.0.0.1:3000";
export const ANDROID_EMULATOR_API_BASE_URL = "http://10.0.2.2:3000";

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
