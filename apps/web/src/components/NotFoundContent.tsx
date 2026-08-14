import Link from "next/link";

/**
 * B1 (U4) — shared Spanish 404 content.
 *
 * Rendered by BOTH the root `not-found.tsx` (unmatched URLs, outside
 * the marketing chrome) and the `(marketing)/not-found.tsx` (in-group
 * `notFound()` calls, wrapped in Header + Footer by the marketing
 * layout). Same copy, same home link — the two boundaries only differ
 * in the chrome around them.
 */
export function NotFoundContent() {
  return (
    <section aria-labelledby="not-found-heading" className="bg-paper">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start px-6 pt-32 pb-24 sm:px-10 sm:pt-40 sm:pb-32 lg:px-16 lg:pt-48">
        <div className="flex items-center gap-3">
          <span className="block h-px w-10 bg-taupe" aria-hidden />
          <span className="t-label text-taupe-text">Error 404</span>
        </div>
        <h1
          id="not-found-heading"
          className="t-display mt-8 max-w-[20ch] text-[clamp(2.5rem,1.25rem+5vw,5rem)] text-ink"
        >
          Página no encontrada.
        </h1>
        <p className="t-body mt-8 max-w-[55ch] text-lg text-ink-mute sm:text-xl">
          El enlace que seguiste no existe o fue movido. Revisa la URL o
          vuelve al inicio para seguir explorando el catálogo.
        </p>
        <Link
          href="/"
          className="mt-12 inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep"
        >
          Volver al inicio
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
