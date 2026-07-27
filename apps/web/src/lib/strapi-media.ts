/**
 * Strapi v5 returns media URLs as RELATIVE paths (`/uploads/foo.jpg`).
 * The admin UI runs in the browser at the Next.js host (`localhost:4780`)
 * which has no /uploads route. We must prepend the public Strapi origin
 * so the browser can fetch the binary.
 *
 * The public origin comes from `NEXT_PUBLIC_STRAPI_URL` (so it works in
 * both server components and client components). When that env var is
 * missing we fall back to `STRAPI_INTERNAL_URL` (server-only) and finally
 * to `http://localhost:4781` so local dev works out of the box.
 */
const STRAPI_PUBLIC_BASE = (process.env.NEXT_PUBLIC_STRAPI_URL
  ?? process.env.STRAPI_INTERNAL_URL
  ?? 'http://localhost:4781').replace(/\/+$/, '');

/**
 * Coerce a Strapi media URL into an absolute URL that the browser can
 * fetch. Returns null when the input is missing or already broken so
 * callers can render a placeholder rather than a 404.
 */
export function strapiMediaUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  if (input.startsWith('http://') || input.startsWith('https://')) return input;
  if (input.startsWith('//')) return `http:${input}`;
  if (input.startsWith('/')) return `${STRAPI_PUBLIC_BASE}${input}`;
  return `${STRAPI_PUBLIC_BASE}/${input}`;
}