/**
 * Social profile URL builder (social URLs must never break).
 *
 * Accepts either a bare handle (normalized: leading `@` stripped,
 * canonical `https://<host>/<handle>` built) or a full `https` URL
 * (used as-is ONLY when its host belongs to the expected network —
 * `www.` and other subdomains of the canonical host are accepted).
 *
 * Invalid, empty, or mismatched values produce `null` so callers can
 * skip rendering instead of emitting `#`, arbitrary schemes, or
 * broken destinations.
 */

export const SOCIAL_NETWORKS = ["instagram", "facebook", "tiktok", "linkedin"] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export function isSocialNetwork(value: string): value is SocialNetwork {
  return (SOCIAL_NETWORKS as readonly string[]).includes(value);
}

type NetworkProfile = {
  host: string;
  handlePath: (handle: string) => string;
};

const NETWORK_PROFILES: Record<SocialNetwork, NetworkProfile> = {
  instagram: { host: "instagram.com", handlePath: (handle) => `/${handle}` },
  facebook: { host: "facebook.com", handlePath: (handle) => `/${handle}` },
  tiktok: { host: "tiktok.com", handlePath: (handle) => `/@${handle}` },
  linkedin: { host: "linkedin.com", handlePath: (handle) => `/in/${handle}` },
};

/**
 * Resolve a stored social value to a canonical profile URL, or `null`
 * when the value cannot be safely normalized. Never returns `#` or a
 * non-https destination.
 */
export function socialHref(
  network: SocialNetwork,
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") return null;

  // Full URL: keep it only when it is `https` AND its host belongs to
  // this network. `http://` (or any other scheme) is not a safe social
  // destination — omit it. A mismatched host is a misconfiguration —
  // omit it rather than emit a cross-site destination.
  if (/^https:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const expected = NETWORK_PROFILES[network].host;
      const matchesHost =
        url.hostname === expected || url.hostname.endsWith(`.${expected}`);
      return matchesHost ? url.toString() : null;
    } catch {
      return null;
    }
  }

  // Bare handle: strip the leading `@` shorthand, reject anything that
  // cannot be a plain handle (scheme chars, whitespace, path/query
  // syntax, quotes).
  const handle = trimmed.replace(/^@+/, "");
  if (handle === "" || /[\s@:/?#<>"]/.test(handle)) return null;

  return `https://${NETWORK_PROFILES[network].host}${NETWORK_PROFILES[network].handlePath(handle)}`;
}
