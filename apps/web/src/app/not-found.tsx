import { NotFoundContent } from "@/components/NotFoundContent";

/**
 * B1 (U4) — root not-found boundary.
 *
 * Renders for unmatched URLs (no route matches at all), which do NOT
 * pass through the (marketing) route group layout — this page is
 * self-contained by design: Spanish copy + home link, no site chrome.
 * In-group 404s (e.g. an unknown /producto/[slug]) hit
 * `(marketing)/not-found.tsx` instead and keep the Header + Footer.
 */
export default function NotFound() {
  // Root 404 renders without any layout chrome (no Header/Footer), so
  // the main landmark must be provided here. `tabIndex={-1}` lets
  // client-side navigation move focus to the heading target.
  return (
    <main id="main-content" tabIndex={-1}>
      <NotFoundContent />
    </main>
  );
}
