import * as Crypto from "expo-crypto";

import { DeviceTokenSchema } from "@/contracts/mood-submission";

const DEVICE_TOKEN_STORAGE_KEY = "moodmarble.anonymous-device-token";
let webDeviceTokenMemoryFallback: string | null = null;

export async function getOrCreateDeviceToken(): Promise<string> {
  const storedValue = await readStoredDeviceToken();

  if (storedValue) {
    const parsedDeviceToken = DeviceTokenSchema.safeParse(storedValue);

    if (parsedDeviceToken.success) {
      return parsedDeviceToken.data;
    }
  }

  const deviceToken = createDeviceToken();
  await saveDeviceToken(deviceToken);
  return deviceToken;
}

export async function saveDeviceToken(deviceToken: string): Promise<void> {
  const parsedDeviceToken = DeviceTokenSchema.parse(deviceToken);
  const webStorage = getWebSessionStorage();

  if (webStorage) {
    try {
      webStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, parsedDeviceToken);
      webDeviceTokenMemoryFallback = parsedDeviceToken;
      return;
    } catch {
      webDeviceTokenMemoryFallback = parsedDeviceToken;
      return;
    }
  }

  if (typeof window !== "undefined") {
    webDeviceTokenMemoryFallback = parsedDeviceToken;
  }
}

export async function clearDeviceToken(): Promise<void> {
  const webStorage = getWebSessionStorage();

  if (webStorage) {
    try {
      webStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
    } finally {
      webDeviceTokenMemoryFallback = null;
    }
    return;
  }

  if (typeof window !== "undefined") {
    webDeviceTokenMemoryFallback = null;
  }
}

async function readStoredDeviceToken(): Promise<string | null> {
  const webStorage = getWebSessionStorage();

  if (webStorage) {
    try {
      return (
        webStorage.getItem(DEVICE_TOKEN_STORAGE_KEY) ??
        webDeviceTokenMemoryFallback
      );
    } catch {
      return webDeviceTokenMemoryFallback;
    }
  }

  if (typeof window !== "undefined") {
    return webDeviceTokenMemoryFallback;
  }

  return null;
}

function createDeviceToken(): string {
  try {
    return DeviceTokenSchema.parse(Crypto.randomUUID());
  } catch {
    // Fall through to the runtime crypto fallback for environments where
    // Expo crypto is unavailable but Web Crypto is present.
  }

  const cryptoObject = globalThis.crypto as
    | {
        randomUUID?: () => string;
        getRandomValues?: (array: Uint8Array) => Uint8Array;
      }
    | undefined;

  if (typeof cryptoObject?.randomUUID === "function") {
    return DeviceTokenSchema.parse(cryptoObject.randomUUID());
  }

  if (typeof cryptoObject?.getRandomValues === "function") {
    const randomBytes = new Uint8Array(16);
    cryptoObject.getRandomValues(randomBytes);
    randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
    randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;

    const hex = Array.from(randomBytes, (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");

    return DeviceTokenSchema.parse(
      `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`,
    );
  }

  throw new Error("Unable to create anonymous device token.");
}

function getWebSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}
