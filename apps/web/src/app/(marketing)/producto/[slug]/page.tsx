import Image from "next/image";
import { notFound } from "next/navigation";
import { ContactCTA } from "@/components/ContactCTA";
import { ProductCard } from "@/components/ProductCard";
import {
  getProductBySlug,
  getProducts,
  getSiteSettings,
  formatPrice,
  buildWhatsAppLink,
} from "@/lib/strapi";

export const revalidate = 60;
export const dynamic = "force-dynamic";

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

  return {
    title: product.name,
    description: product.shortDescription || product.description,
    alternates: { canonical },
    openGraph: {
      title: `${product.name} · Ene Muebles`,
      description: product.shortDescription || product.description,
      url: canonical,
      siteName: "Ene Muebles",
      locale: "es_CL",
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.shortDescription || product.description,
      images: ogImages.map((i) => i.url),
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
    ? (await getProducts(product.category.slug))
        .filter((p) => p.id !== product.id)
        .slice(0, 3)
    : [];

  const whatsappHref = settings.whatsappNumber
    ? buildWhatsAppLink(
        settings.whatsappNumber,
        `Hola, me gustaría cotizar ${product.name} para mi institución.`
      )
    : null;

  const cover = product.images?.[0];
  const gallery = product.images?.slice(1, 4) ?? [];

  // JSON-LD structured data. Helps Google display rich snippets
  // (price, availability, image) directly in search results. Built
  // once on the server and inlined as a <script> tag.
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "https://ene-muebles.cl";

  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    image: product.images?.map((i) =>
      i.url.startsWith("http") ? i.url : `${SITE_URL}${i.url}`
    ),
    category: product.category?.name,
    brand: { "@type": "Brand", name: "Ene Muebles" },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/producto/${product.slug}`,
      price: product.price,
      priceCurrency: product.currency,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Ene Muebles",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Safe: the payload is built from a typed object, no untrusted
        // user input is interpolated.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <article>
        <section aria-labelledby="producto-heading" className="bg-paper">
          <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-6 pt-16 pb-16 sm:px-10 sm:pt-20 lg:grid-cols-12 lg:gap-16 lg:px-16 lg:pt-24 lg:pb-24">
            <div className="lg:col-span-7 space-y-4">
              <div className="img-zoom relative aspect-[4/5] overflow-hidden bg-cream-soft">
                {cover ? (
                  <Image
                    src={cover.url}
                    alt={cover.alternativeText || product.name}
                    fill
                    priority
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink-mute">
                    Sin imagen
                  </div>
                )}
              </div>
              {gallery.length > 0 ? (
                <ul className="grid grid-cols-3 gap-3">
                  {gallery.map((image) => (
                    <li
                      key={image.id}
                      className="img-zoom relative aspect-square overflow-hidden bg-cream-soft"
                    >
                      <Image
                        src={image.url}
                        alt={image.alternativeText || `${product.name} detalle`}
                        fill
                        sizes="(min-width: 1024px) 16vw, 33vw"
                        className="object-cover"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center gap-3">
                <span className="block h-px w-10 bg-taupe" aria-hidden />
                <span className="t-label text-taupe-deep">
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
              <p className="t-mono mt-4 text-2xl text-ink">
                {formatPrice({ price: product.price, currency: product.currency })}
              </p>
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

              {product.dimensions ? (
                <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ink-line pt-6">
                  {fmtDim(product.dimensions.width, "cm") ? (
                    <div>
                      <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                        Ancho
                      </dt>
                      <dd className="mt-2 t-mono text-base text-ink">
                        {fmtDim(product.dimensions.width, "cm")}
                      </dd>
                    </div>
                  ) : null}
                  {fmtDim(product.dimensions.height, "cm") ? (
                    <div>
                      <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                        Altura
                      </dt>
                      <dd className="mt-2 t-mono text-base text-ink">
                        {fmtDim(product.dimensions.height, "cm")}
                      </dd>
                    </div>
                  ) : null}
                  {fmtDim(product.dimensions.depth, "cm") ? (
                    <div>
                      <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                        Profundidad
                      </dt>
                      <dd className="mt-2 t-mono text-base text-ink">
                        {fmtDim(product.dimensions.depth, "cm")}
                      </dd>
                    </div>
                  ) : null}
                  {fmtDim(product.dimensions.weight, "kg") ? (
                    <div>
                      <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                        Peso
                      </dt>
                      <dd className="mt-2 t-mono text-base text-ink">
                        {fmtDim(product.dimensions.weight, "kg")}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {Array.isArray(product.materials) && product.materials.length > 0 ? (
                <div className="mt-8 border-t border-ink-line pt-6">
                  <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
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
                      `Consulta: ${product.name}`
                    )}`}
className="t-label text-ink underline-offset-[6px] hover:text-taupe-deep hover:underline tap-target"
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
              <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
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
