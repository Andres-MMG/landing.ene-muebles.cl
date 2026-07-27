/**
 * Strapi v5 returns media URLs as RELATIVE paths (`/uploads/foo.jpg`).
 * The admin UI runs in the browser at the Next.js host (`localhost:4780`)
 * which has no /uploads route. We must prepend the PUBLIC Strapi origin
 * so the browser can fetch the binary.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_STRAPI_URL — the only env var that is inlined into
 *      the browser bundle. This is what the browser will use.
 *   2. STRAPI_INTERNAL_URL — server-only, only used when the helper
 *      runs in a Node.js server component AND the public env var is
 *      not set. We rewrite `http://cms:1337` (the Docker hostname) to
 *      `http://localhost:4781` so even server-rendered HTML embeds a
 *      URL the browser can resolve.
 *   3. Hardcoded `http://localhost:4781` as a last-resort default for
 *      local dev.
 *
 * In production, NEXT_PUBLIC_STRAPI_URL MUST be set to the public origin
 * of the Strapi admin (e.g. `https://cms.ene-muebles.cl`). Without it,
 * the browser will receive `http://cms:1337/...` URLs that it cannot
 * resolve, and every thumbnail in the admin panel will 404.
 */
function resolvePublicBase(): string {
  const fromPublic = process.env.NEXT_PUBLIC_STRAPI_URL;
  if (fromPublic) return fromPublic.replace(/\/+$/, '');

  const fromInternal = process.env.STRAPI_INTERNAL_URL;
  if (fromInternal) {
    // Translate the Docker internal hostname into the host-mapped port
    // so server-rendered HTML carries URLs the browser can resolve.
    return fromInternal.replace(/\/+$/, '').replace('http://cms:', 'http://localhost:');
  }

  return 'http://localhost:4781';
}

const STRAPI_PUBLIC_BASE = resolvePublicBase();

/**
 * Coerce a Strapi media URL into an absolute URL that the browser can
 * fetch. Returns null when the input is missing so callers can render
 * a placeholder rather than a 404.
 */
export function strapiMediaUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  if (input.startsWith('http://') || input.startsWith('https://')) return input;
  if (input.startsWith('//')) return `http:${input}`;
  if (input.startsWith('/')) return `${STRAPI_PUBLIC_BASE}${input}`;
  return `${STRAPI_PUBLIC_BASE}/${input}`;
}