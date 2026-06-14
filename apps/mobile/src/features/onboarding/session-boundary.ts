import {
  loadAnonymousSession,
  saveAnonymousSession,
} from "@/features/onboarding/session";
import {
  AnonymousSessionSchema,
  type AnonymousSession,
} from "@/features/onboarding/types";

export interface AnonymousSessionBootstrapParams {
  workspace_id?: string | string[];
  team_id?: string | string[];
  device_jwt?: string | string[];
}

export function getAnonymousSessionFromParams(
  params: AnonymousSessionBootstrapParams,
): AnonymousSession | null {
  const parsedSession = AnonymousSessionSchema.safeParse({
    workspaceId:
      typeof params.workspace_id === "string" ? params.workspace_id : undefined,
    teamId: typeof params.team_id === "string" ? params.team_id : undefined,
    deviceJwt:
      typeof params.device_jwt === "string" ? params.device_jwt : undefined,
  });

  if (!parsedSession.success) {
    return null;
  }

  return parsedSession.data;
}

export async function restoreAnonymousSession(
  params: AnonymousSessionBootstrapParams,
): Promise<AnonymousSession | null> {
  const bootstrapSession = getAnonymousSessionFromParams(params);

  if (bootstrapSession) {
    await saveAnonymousSession(bootstrapSession);
    return bootstrapSession;
  }

  return loadAnonymousSession();
}
