/**
 * +native-intent.tsx
 *
 * Expo Router calls redirectSystemNotification() with every incoming
 * native deep-link URL on Android and iOS. Return the internal Expo
 * Router path to navigate to, or null to let the default handler run.
 *
 * Handles: moodmarble://manager?workspace_id=...&manager_jwt=...&...
 * Produces: /manager?workspace_id=...&manager_jwt=...&...
 */
export function redirectSystemNotification(url: string): string | null {
  try {
    const parsed = new URL(url);

    // moodmarble://manager → /manager (with all query params preserved)
    if (parsed.hostname === "manager") {
      const qs = parsed.searchParams.toString();
      return qs ? `/manager?${qs}` : "/manager";
    }

    // moodmarble://admin → /admin (future-proofing)
    if (parsed.hostname === "admin") {
      const qs = parsed.searchParams.toString();
      return qs ? `/admin?${qs}` : "/admin";
    }
  } catch {
    // malformed URL — let the default handler run
  }

  return null;
}
