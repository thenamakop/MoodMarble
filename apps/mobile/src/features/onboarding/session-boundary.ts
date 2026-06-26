import {
  loadAnonymousSession,
  saveAnonymousSession,
} from "@/features/onboarding/session";
import { isDeviceJwtActive } from "@/features/onboarding/device-jwt";
import {
  AnonymousSessionSchema,
  type AnonymousSession,
} from "@/features/onboarding/types";

export interface AnonymousSessionBootstrapParams {
  workspace_id?: string | string[];
  team_id?: string | string[];
  device_jwt?: string | string[];
}

/**
 * Reads an anonymous session from URL search params (web only).
 *
 * No current mobile or join-code flow injects these params into the
 * home route URL. On native, params will always be absent and this
 * returns null, falling through to the stored session. The web path
 * is kept for forward compatibility but is currently unused.
 *
 * SECURITY NOTES — URL-param JWT bootstrap:
 *
 *  1. The `device_jwt` value is a bearer token. Delivering it as a URL
 *     query parameter exposes it in browser history, proxy/server access
 *     logs, and the Referer header on subsequent navigations.
 *
 *  2. This function performs only a client-side expiry check
 *     (`isDeviceJwtActive`). It does NOT verify the JWT signature —
 *     signature verification happens server-side on every API call.
 *     A tampered token will be accepted here but rejected by the backend
 *     on the first mood submission.
 *
 *  3. The caller (apps/mobile/src/app/(tabs)/index.tsx) immediately calls
 *     `scrubUrl()` after processing a param-bootstrapped session. This
 *     removes the token from the address bar and browser history entry
 *     after the first render, limiting the window of exposure on web.
 *
 *  4. If this path is ever activated for production use, the link must be
 *     delivered over HTTPS and the token lifetime should be short (< 1 h).
 */
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

  if (!isDeviceJwtActive(parsedSession.data.deviceJwt)) {
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
