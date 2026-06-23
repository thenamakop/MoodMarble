const APP_SCHEME_FALLBACK = "moodmarble:///";

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  return resolveSystemHref(path);
}

export function resolveSystemHref(path: string): string {
  try {
    const url = new URL(path, APP_SCHEME_FALLBACK);
    const normalizedPathname = normalizeExpoPathname(url.pathname);
    const isManagerLink =
      url.hostname === "manager" || normalizedPathname === "/manager";

    if (isManagerLink) {
      return buildRoutePath("/manager", url.searchParams);
    }

    if (normalizedPathname === "/") {
      return buildRoutePath("/", url.searchParams);
    }

    return path;
  } catch {
    return path;
  }
}

function normalizeExpoPathname(pathname: string): string {
  const strippedPathname = pathname.replace(/^\/--(?=\/|$)/, "");

  if (!strippedPathname || strippedPathname === "/") {
    return "/";
  }

  return strippedPathname.startsWith("/")
    ? strippedPathname
    : `/${strippedPathname}`;
}

function buildRoutePath(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
