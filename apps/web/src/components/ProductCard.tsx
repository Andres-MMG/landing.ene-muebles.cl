import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/strapi";
import { formatPrice, pickMediaFormat } from "@/lib/strapi";
import { formatDimensions } from "@/lib/product-attributes";
import { buildWhatsAppHandoff } from "@/lib/whatsapp";

type ProductCardProps = {
  product: Product;
  whatsappNumber?: string;
  variant?: "default" | "hero" | "wide";
  priority?: boolean;
};

/**
 * ProductCard — institutional product readout.
 *
 * No border + no shadow on the same element (ghost-card pattern). The
 * container relies on whitespace and a thin taupe top edge to mark the
 * spec block. SKU is mono, name is sans, price is mono. Materials and
 * dimensions are always visible (they are the institutional sell).
 */
export function ProductCard({
  product,
  whatsappNumber,
  variant = "default",
  priority = false,
}: ProductCardProps) {
  const cover = product.images?.[0];
  const isHero = variant === "hero";
  // Slot-aware media (ISR milestone): card grids render the smallest
  // Strapi responsive format that fits (`small`, falling back upward),
  // cutting transferred bytes per card. The hero variant keeps the
  // ORIGINAL url — it is an LCP image and must not be degraded.
  const coverUrl = cover
    ? isHero
      ? cover.url
      : (pickMediaFormat(cover, "small") ?? cover.url)
    : null;
  // whatsapp-handoff spec: the per-product message names the published
  // product (never price, availability, or visitor data). The builder
  // returns null when no verified number is configured.
  const whatsappHref =
    buildWhatsAppHandoff({ whatsappNumber }, { product: { name: product.name } })?.href ??
    null;
  // B1 (T5) — the card reads the same source as the product page: the
  // structured width/height/depth when present, the raw `source`
  // string from the Excel import otherwise. English W/H/D abbreviations
  // are gone; the row is a compact Spanish "Medidas:" readout.
  const dimensions = formatDimensions(product);

  const imageAspect = isHero ? "aspect-[16/10]" : variant === "wide" ? "aspect-[3/2]" : "aspect-[4/5]";

  return (
    <article className="group flex h-full flex-col">
      <Link
        href={`/producto/${product.slug}` as never}
        aria-label={product.name}
        className="img-zoom relative block overflow-hidden bg-cream-soft"
      >
        <div className={`relative w-full ${imageAspect}`}>
          {cover ? (
            <Image
              src={coverUrl!}
              alt={cover.alternativeText || product.name}
              fill
              sizes={
                isHero
                  ? "(min-width: 1024px) 60vw, 100vw"
                  : variant === "wide"
                  ? "(min-width: 1024px) 50vw, 100vw"
                  : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              }
              priority={priority}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft-text">
                Sin imagen
              </span>
            </div>
          )}
        </div>
        {product.featured ? (
          <span className="t-mono absolute left-4 top-4 bg-paper px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-ink">
            Destacado
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 pt-5">
        <div className="flex items-baseline justify-between gap-3 border-t border-taupe-faint pt-4">
          <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-taupe-text">
            {product.category?.name ?? "Catálogo"}
          </span>
          <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
            {`SKU · ${product.slug.toUpperCase().slice(0, 12)}`}
          </span>
        </div>

        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3
              className={`t-h2 text-ink transition-colors duration-500 group-hover:text-taupe-deep ${
                isHero ? "text-3xl sm:text-4xl" : "text-xl"
              }`}
            >
              {product.name}
            </h3>
            {(product.productType || product.subcategory) && (
              <p
                data-testid="product-meta-chips"
                className="t-mono mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-taupe-text"
              >
                {product.productType ? (
                  <span className="border border-taupe-faint px-2 py-0.5">
                    {product.productType}
                  </span>
                ) : null}
                {product.subcategory ? (
                  <span className="border border-taupe-faint px-2 py-0.5">
                    {product.subcategory}
                  </span>
                ) : null}
              </p>
            )}
          </div>
          {product.price > 0 ? (
            <p className="t-mono whitespace-nowrap text-base text-ink sm:text-lg">
              {formatPrice({ price: product.price, currency: product.currency })}
            </p>
          ) : null}
        </header>

        {(product.shortDescription || dimensions || product.materials?.length) && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute sm:grid-cols-2">
            {dimensions ? (
              <div className="flex items-baseline justify-between gap-2 sm:justify-start sm:gap-4">
                <dt className="text-ink-soft-text">Medidas</dt>
                <dd className="text-ink">{dimensions}</dd>
              </div>
            ) : null}
            {product.materials && product.materials.length > 0 ? (
              <div className="flex items-baseline justify-between gap-2 sm:justify-start sm:gap-4">
                <dt className="text-ink-soft-text">Mat</dt>
                <dd className="text-ink normal-case">{product.materials.join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        )}

        {product.shortDescription ? (
          <p className="t-body text-sm text-ink-mute line-clamp-2">
            {product.shortDescription}
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-6 pt-2">
          <Link
            href={`/producto/${product.slug}` as never}
            className="t-label inline-flex items-center gap-2 text-ink underline-offset-[6px] transition-colors hover:text-taupe-text hover:underline tap-target"
          >
            Ver detalle
            <span aria-hidden>→</span>
          </Link>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="t-label ml-auto text-ink-soft-text transition-colors hover:text-ink tap-target"
            >
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
