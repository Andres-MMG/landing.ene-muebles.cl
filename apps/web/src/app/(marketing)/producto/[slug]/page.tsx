import { notFound } from "next/navigation";
import { ContactCTA } from "@/components/ContactCTA";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import {
  getProductBySlug,
  getProducts,
  getSiteSettings,
  formatPrice,
} from "@/lib/strapi";
import { buildWhatsAppHandoff } from "@/lib/whatsapp";
import {
  THEME_COLOR,
  buildJsonLdAdditionalProperty,
  buildMetaDescription,
  buildProductJsonLd,
  buildSpecsStrip,
  parseDimensions,
} from "@/lib/product-attributes";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto" };

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "https://ene-muebles.cl";
  const canonical = `${SITE_URL}/producto/${product.slug}`;

  const coverUrl = product.images?.[0]?.url;
  const ogImages = coverUrl
    ? [
        {
          url: coverUrl.startsWith("http") ? coverUrl : `${SITE_URL}${coverUrl}`,
          width: 1200,
          height: 630,
          alt: product.images?.[0]?.alternativeText || product.name,
        },
      ]
    : [];

  // Catalog-import (S4) — meta description now weaves the
  // catalog-import attributes (subcategory, color, material, usage)
  // into the existing shortDescription when present. Capped at 280
  // chars for the regular `<meta name="description">` and 200 chars
  // for the OG variant. `buildMetaDescription` returns null when
  // nothing is available so we can fall back to the legacy
  // `shortDescription || description` shape.
  const metaDescription =
    buildMetaDescription(product) ??
    product.shortDescription ??
    product.description;
  const ogDescription =
    buildMetaDescription(product, 200) ??
    product.shortDescription ??
    product.description;

  return {
    title: product.name,
    description: metaDescription,
    alternates: { canonical },
    openGraph: {
      title: `${product.name} · ENE-MUEBLES`,
      description: ogDescription,
      url: canonical,
      siteName: "ENE-MUEBLES",
      locale: "es_CL",
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: ogDescription,
      images: ogImages.map((i) => i.url),
    },
    other: {
      ...(product.externalId
        ? { "product:retailer_item_id": product.externalId }
        : {}),
      "theme-color": THEME_COLOR,
    },
  };
}

const fmtDim = (n: number | undefined, unit: string) =>
  n ? `${n} ${unit}` : null;

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const [settings, product] = await Promise.all([
    getSiteSettings(),
    getProductBySlug(slug),
  ]);

  if (!product) notFound();

  const related = product.category?.slug
    ? (await getProducts({ categorySlug: product.category.slug })).products
        .filter((p) => p.id !== product.id)
        .slice(0, 3)
    : [];

  // whatsapp-handoff spec: the handoff for a product page ALWAYS names
  // the published product; the operator's generic default message is
  // only a fallback for non-product CTAs. The builder returns null
  // when no verified number is configured (email CTA remains).
  const whatsappHref =
    buildWhatsAppHandoff(settings, { product: { name: product.name } })?.href ?? null;

  // JSON-LD structured data. Helps Google display rich snippets
  // (price, availability, image) directly in search results. Built
  // once on the server and inlined as a <script> tag.
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "https://ene-muebles.cl";

  // Catalog-import (S4) — `buildProductJsonLd` is strictly additive:
  // every previously-existing field is preserved verbatim, and the
  // catalog-import fields surface as `additionalProperty` entries
  // only when populated. See `product-attributes.ts`.
  const productJsonLd = buildProductJsonLd(product, SITE_URL);
  // Smoke check — keeps the additionalProperty branch alive even if
  // the helper inlines the property block. Cheap O(1) assertion.
  const additional = buildJsonLdAdditionalProperty(product);
  if (additional.length > 0) {
    productJsonLd.additionalProperty = additional;
  }

  // Catalog-import (S4) — pre-compute the visual specs strip that
  // appears under the price. The helper returns an empty array when
  // nothing is populated so the strip itself is skipped.
  const specsStrip = buildSpecsStrip(product);
  // B1 (T5) — measurements drive the detail dl from the same merged
  // source as the strip: structured width/height/depth when present,
  // the importer's raw `source` string otherwise. The dl is skipped
  // entirely when nothing parses so the hairline border does not
  // render as an empty box — EXCEPT for a weight-only product, which
  // still renders its Peso row (weight lives outside the parsed
  // dimensions shape).
  const parsedDimensions = parseDimensions(product.dimensions);
  const weightValue = fmtDim(product.dimensions?.weight, "kg");
  const hasDimensionsReadout = parsedDimensions !== null || weightValue !== null;
  const hasObservation = Boolean(product.observation?.trim());
  const hasSource = Boolean(product.source?.trim());

  return (
    <>
      <script
        type="application/ld+json"
        // Safe: the payload is built from a typed object, no untrusted
        // user input is interpolated.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {/* Catalog-import (S4) — sr-only aside so screen readers and AEO
          engines can see the transparency metadata (observation notes +
          source PDF reference). Hidden visually but reachable by AT. */}
      {(hasObservation || hasSource) && (
        <aside className="sr-only" aria-label="Metadatos del catálogo">
          {hasObservation ? <p>{product.observation}</p> : null}
          {hasSource ? <p>Fuente: {product.source}</p> : null}
        </aside>
      )}
      <article>
        <section aria-labelledby="producto-heading" className="bg-paper">
          <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-6 pt-16 pb-16 sm:px-10 sm:pt-20 lg:grid-cols-12 lg:gap-16 lg:px-16 lg:pt-24 lg:pb-24">
            <div className="lg:col-span-7">
              <ProductGallery
                images={product.images ?? []}
                productName={product.name}
              />
            </div>

            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center gap-3">
                <span className="block h-px w-10 bg-taupe" aria-hidden />
                <span className="t-label text-taupe-text">
                  {product.category?.name
                    ? `Línea ${product.category.name}`
                    : "Catálogo"}
                </span>
              </div>
              <h1
                id="producto-heading"
                className="t-h2 mt-6 text-[clamp(2rem,1.4rem+2.5vw,3.5rem)] text-ink"
              >
                {product.name}
              </h1>
              {product.price > 0 ? (
                <p className="t-mono mt-4 text-2xl text-ink">
                  {formatPrice({ price: product.price, currency: product.currency })}
                </p>
              ) : null}
              {/* Catalog-import (S4) — visual specs strip under the
                  price. Only populated fields are emitted. Hairline
                  border + t-mono micro-labels match the existing
                  typography system. */}
              {specsStrip.length > 0 ? (
                <dl
                  data-testid="specs-strip"
                  className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-ink-line pt-5 sm:grid-cols-3"
                >
                  {specsStrip.map((entry) => (
                    <div key={entry.label}>
                      <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                        {entry.label}
                      </dt>
                      <dd className="mt-1.5 t-mono text-sm text-ink">
                        {entry.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {product.shortDescription ? (
                <p className="t-body mt-8 text-lg text-ink">
                  {product.shortDescription}
                </p>
              ) : null}

              <div className="mt-8 space-y-5 text-pretty text-base leading-[1.7] text-ink-mute">
                {product.description
                  .split(/\n{2,}|(?<=\.)\s+/)
                  .filter((paragraph) => paragraph.trim().length > 0)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>

              {hasDimensionsReadout ? (
                <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ink-line pt-6">
                  {fmtDim(parsedDimensions?.width, "cm") ? (
                    <div>
                      <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                        Ancho
                      </dt>
                      <dd className="mt-2 t-mono text-base text-ink">
                        {fmtDim(parsedDimensions?.width, "cm")}
                      </dd>
                    </div>
                  ) : null}
                  {fmtDim(parsedDimensions?.height, "cm") ? (
                    <div>
                      <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                        Altura
                      </dt>
                      <dd className="mt-2 t-mono text-base text-ink">
                        {fmtDim(parsedDimensions?.height, "cm")}
                      </dd>
                    </div>
                  ) : null}
                  {fmtDim(parsedDimensions?.depth, "cm") ? (
                    <div>
                      <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                        Profundidad
                      </dt>
                      <dd className="mt-2 t-mono text-base text-ink">
                        {fmtDim(parsedDimensions?.depth, "cm")}
                      </dd>
                    </div>
                  ) : null}
                  {weightValue ? (
                    <div>
                      <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                        Peso
                      </dt>
                      <dd className="mt-2 t-mono text-base text-ink">
                        {weightValue}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {Array.isArray(product.materials) && product.materials.length > 0 ? (
                <div className="mt-8 border-t border-ink-line pt-6">
                  <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                    Materialidad
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {product.materials.map((material) => (
                      <li
                        key={material}
                        className="t-mono rounded-full border border-ink-line px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink"
                      >
                        {material}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-12 flex flex-wrap items-center gap-4">
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep"
                  >
                    Consultar por WhatsApp
                    <span aria-hidden>→</span>
                  </a>
                ) : null}
                {settings.contactEmail ? (
                  <a
                    href={`mailto:${settings.contactEmail}?subject=${encodeURIComponent(
                      `Consulta: ${product.name}`,
                    )}`}
                    className="t-label text-ink underline-offset-[6px] hover:text-taupe-text hover:underline tap-target"
                  >
                    Enviar correo
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {related.length > 0 ? (
          <section className="mx-auto w-full max-w-[1440px] px-6 pt-16 pb-20 sm:px-10 sm:pt-20 sm:pb-24 lg:px-16 lg:pt-24 lg:pb-28">
            <header className="border-b border-ink-line pb-8">
              <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                Más de la línea
              </p>
              <h2 className="t-h2 mt-3 text-[clamp(1.5rem,1rem+1.5vw,2.25rem)] text-ink">
                {product.category?.name || "esta categoría"}
              </h2>
            </header>
            <ul className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 sm:gap-y-14 lg:grid-cols-3 lg:gap-y-16">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard
                    product={p}
                    whatsappNumber={settings.whatsappNumber}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>

      <ContactCTA settings={settings} />
    </>
  );
}
