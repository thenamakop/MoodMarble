import { UnauthorizedError } from "./device-jwt";

export const ADMIN_BOOTSTRAP_HEADER = "x-admin-bootstrap-secret" as const;

export class MissingAdminBootstrapSecretError extends Error {
  constructor() {
    super("Server configuration error.");
  }
}

export function verifyAdminBootstrapSecret(
  bootstrapHeader: string | undefined,
  configuredSecret: string | undefined,
): void {
  if (!configuredSecret) {
    throw new MissingAdminBootstrapSecretError();
  }

  if (!bootstrapHeader || bootstrapHeader !== configuredSecret) {
    throw new UnauthorizedError();
  }
}
