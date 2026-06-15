interface DeviceJwtPayload {
  exp?: unknown;
}

export function isDeviceJwtActive(
  deviceJwt: string,
  now = new Date(),
): boolean {
  const payload = decodeDeviceJwtPayload(deviceJwt);

  if (!payload || typeof payload.exp !== "number") {
    return false;
  }

  return payload.exp > Math.floor(now.getTime() / 1000);
}

function decodeDeviceJwtPayload(deviceJwt: string): DeviceJwtPayload | null {
  const tokenParts = deviceJwt.split(".");

  if (tokenParts.length !== 3) {
    return null;
  }

  const payloadJson = decodeBase64Url(tokenParts[1]);

  if (!payloadJson) {
    return null;
  }

  try {
    return JSON.parse(payloadJson) as DeviceJwtPayload;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string | null {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedValue = normalizedValue.padEnd(
    normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4),
    "=",
  );

  if (typeof globalThis.atob === "function") {
    try {
      return globalThis.atob(paddedValue);
    } catch {
      return null;
    }
  }

  const globalBuffer = (
    globalThis as typeof globalThis & {
      Buffer?: {
        from(
          input: string,
          encoding: string,
        ): { toString(encoding: string): string };
      };
    }
  ).Buffer;

  if (globalBuffer) {
    try {
      return globalBuffer.from(paddedValue, "base64").toString("utf-8");
    } catch {
      return null;
    }
  }

  return null;
}
