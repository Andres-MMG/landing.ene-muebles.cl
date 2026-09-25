export const DEFAULT_SITE_ORIGIN = "https://ene-muebles.cl";

function isRootPath(pathname: string): boolean {
  return pathname === "" || pathname === "/";
}

export function resolveSiteOrigin(value = process.env.NEXT_PUBLIC_SITE_URL): string {
  const candidate = value?.trim();
  if (!candidate) return DEFAULT_SITE_ORIGIN;

  try {
    const url = new URL(candidate);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username !== "" ||
      url.password !== "" ||
      !isRootPath(url.pathname) ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return DEFAULT_SITE_ORIGIN;
    }
    return url.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export function absoluteSiteUrl(path: string, origin = resolveSiteOrigin()): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalizedPath === "/" ? "" : normalizedPath}`;
}
