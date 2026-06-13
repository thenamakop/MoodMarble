import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { DeviceTokenSchema } from "../../../../packages/shared";

const DeviceJwtPayloadSchema = z.object({
  device_token: DeviceTokenSchema,
});

export type DeviceJwtPayload = z.infer<typeof DeviceJwtPayloadSchema>;

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export class MissingJwtSecretError extends Error {
  constructor() {
    super("Server configuration error.");
  }
}

export function verifyDeviceJwt(
  authorizationHeader: string | undefined,
  jwtSecret: string | undefined,
): DeviceJwtPayload {
  if (!jwtSecret) {
    throw new MissingJwtSecretError();
  }

  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError();
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  let decoded: string | jwt.JwtPayload;

  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch {
    throw new UnauthorizedError();
  }

  if (!decoded || typeof decoded !== "object") {
    throw new UnauthorizedError();
  }

  try {
    return DeviceJwtPayloadSchema.parse(decoded);
  } catch {
    throw new UnauthorizedError();
  }
}

export function createDeviceJwt(jwtSecret: string | undefined): {
  deviceJwt: string;
  deviceToken: string;
} {
  if (!jwtSecret) {
    throw new MissingJwtSecretError();
  }

  const deviceToken = randomUUID();
  const deviceJwt = jwt.sign(
    {
      device_token: deviceToken,
    },
    jwtSecret,
    {
      expiresIn: "30d",
    },
  );

  return {
    deviceJwt,
    deviceToken,
  };
}
