/**
 * +native-intent.tsx
 *
 * Expo Router calls redirectSystemPath() with every incoming
 * native deep-link URL on Android and iOS. Return the internal Expo
 * Router path to navigate to, or null to let the default handler run.
 *
 * Intentionally does NOT handle moodmarble://manager — managers must
 * authenticate via the in-app manager join-code flow (join-manager screen).
 */

export function resolveSystemHref(url: string): string {
  try {
    const parsed = new URL(url);

    // moodmarble://admin-login → /admin-login
    if (parsed.hostname === "admin-login") {
      return "/admin-login";
    }

    // moodmarble://join-manager → /join-manager
    if (parsed.hostname === "join-manager") {
      return "/join-manager";
    }
  } catch {
    // malformed URL — let the default handler run
  }

  // If it's the dev client launch URL, just return root so the app boots normally
  if (url.includes("expo-development-client")) {
    return "/";
  }

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
