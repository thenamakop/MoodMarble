import jwt from "jsonwebtoken";

import { type ManagerJwtPayload, ManagerJwtPayloadSchema } from "../../../../packages/shared";

import { MissingJwtSecretError, UnauthorizedError } from "./device-jwt";

export const MANAGER_JWT_EXPIRES_IN = "30d" as const;

export function verifyManagerJwt(
  authorizationHeader: string | undefined,
  jwtSecret: string | undefined,
): ManagerJwtPayload {
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
    return ManagerJwtPayloadSchema.parse({
      workspace_id: decoded.workspace_id,
      team_id: decoded.team_id,
      role: decoded.role,
    });
  } catch {
    throw new UnauthorizedError();
  }
}

export function createManagerJwt(
  jwtSecret: string | undefined,
  payload: ManagerJwtPayload,
): { managerJwt: string } {
  if (!jwtSecret) {
    throw new MissingJwtSecretError();
  }

  const parsedPayload = ManagerJwtPayloadSchema.parse(payload);
  const managerJwt = jwt.sign(parsedPayload, jwtSecret, {
    expiresIn: MANAGER_JWT_EXPIRES_IN,
  });

  return { managerJwt };
}
