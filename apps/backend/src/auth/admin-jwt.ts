import jwt from "jsonwebtoken";

import { type AdminJwtPayload, AdminJwtPayloadSchema } from "../../../../packages/shared";

import { MissingJwtSecretError, UnauthorizedError } from "./device-jwt";

export const ADMIN_JWT_EXPIRES_IN = "30d" as const;

export function verifyAdminJwt(
  authorizationHeader: string | undefined,
  jwtSecret: string | undefined,
): AdminJwtPayload {
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
    return AdminJwtPayloadSchema.parse({
      workspace_id: decoded.workspace_id,
      role: decoded.role,
    });
  } catch {
    throw new UnauthorizedError();
  }
}

export function createAdminJwt(
  jwtSecret: string | undefined,
  payload: AdminJwtPayload,
): { adminJwt: string } {
  if (!jwtSecret) {
    throw new MissingJwtSecretError();
  }

  const parsedPayload = AdminJwtPayloadSchema.parse(payload);
  const adminJwt = jwt.sign(parsedPayload, jwtSecret, {
    expiresIn: ADMIN_JWT_EXPIRES_IN,
  });

  return { adminJwt };
}
