import jwt from "jsonwebtoken";
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

export function verifyDeviceJwt(
  authorizationHeader: string | undefined,
  jwtSecret: string,
): DeviceJwtPayload {
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
