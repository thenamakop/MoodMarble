const DEBUG_SERVER_URL = "http://10.0.2.2:7777/event";
const DEBUG_SESSION_ID = "e2e-manual-edit-audit";

function reportMobileDebugEvent(
  hypothesisId: string,
  msg: string,
  data: Record<string, unknown>,
) {
  fetch(DEBUG_SERVER_URL, {
    method: "POST",
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: "pre-fix",
      hypothesisId,
      location: "apps/mobile/src/app/+native-intent.tsx",
      msg,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
}

/**
 * +native-intent.tsx
 *
 * Expo Router calls redirectSystemPath() with every incoming
 * native deep-link URL on Android and iOS. Return the internal Expo
 * Router path to navigate to, or null to let the default handler run.
 *
 * Handles: moodmarble://manager?workspace_id=...&manager_jwt=...&...
 * Produces: /manager?workspace_id=...&manager_jwt=...&...
 */

export function resolveSystemHref(url: string): string {
  try {
    const parsed = new URL(url);

    // moodmarble://manager → /manager (with all query params preserved)
    if (parsed.hostname === "manager") {
      const qs = parsed.searchParams.toString();
      // #region debug-point E:native-intent-manager
      reportMobileDebugEvent(
        "E",
        "[DEBUG] resolveSystemHref normalized manager URL.",
        {
          url,
          normalizedHref: qs ? `/manager?${qs}` : "/manager",
        },
      );
      // #endregion
      return qs ? `/manager?${qs}` : "/manager";
    }

    // moodmarble://admin → /admin (future-proofing)
    if (parsed.hostname === "admin") {
      const qs = parsed.searchParams.toString();
      // #region debug-point E:native-intent-admin
      reportMobileDebugEvent(
        "E",
        "[DEBUG] resolveSystemHref normalized admin URL.",
        {
          url,
          normalizedHref: qs ? `/admin?${qs}` : "/admin",
        },
      );
      // #endregion
      return qs ? `/admin?${qs}` : "/admin";
    }
  } catch {
    // malformed URL — let the default handler run
  }

  // If it's the dev client launch URL, just return root so the app boots normally
  if (url.includes("expo-development-client")) {
    // #region debug-point E:native-intent-dev-client
    reportMobileDebugEvent(
      "E",
      "[DEBUG] resolveSystemHref normalized Expo dev-client URL.",
      {
        url,
        normalizedHref: "/",
      },
    );
    // #endregion
    return "/";
  }

  // #region debug-point E:native-intent-fallback
  reportMobileDebugEvent(
    "E",
    "[DEBUG] resolveSystemHref returned fallback URL.",
    {
      url,
    },
  );
  // #endregion
  return url;
}

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string | Promise<string> {
  return resolveSystemHref(path);
}
