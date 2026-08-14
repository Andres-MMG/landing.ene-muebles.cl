import { NotFoundContent } from "@/components/NotFoundContent";

/**
 * B1 (U4) — marketing-group not-found boundary.
 *
 * Lives inside the (marketing) route group so `notFound()` calls from
 * marketing pages (producto/[slug], categoria/[slug]) render WITH the
 * public site chrome (Header + Footer from `(marketing)/layout.tsx`).
 * Unmatched URLs fall to the root `not-found.tsx`.
 */
export default function MarketingNotFound() {
  return <NotFoundContent />;
}
