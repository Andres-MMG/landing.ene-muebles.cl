import Link from "next/link";
import { site as siteTokens } from "@ene/ui-tokens";
import {
  formatPrice,
  getCatalogSnapshot,
  pickMediaFormat,
  type Product,
} from "@/lib/strapi";
import { formatDimensions, hasVerifiedOffer } from "@/lib/product-attributes";
import { PrintButton } from "./PrintButton";

// Print pages must remain request-time pages: CMS availability must not be
// coupled to the production build. The snapshot helper still owns the
// bounded, tagged 60-second cache boundary.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catálogo para imprimir",
  description:
    "Catálogo imprimible de mobiliario escolar y de oficina de ENE-MUEBLES.",
};

const DESCRIPTION_LIMIT = 280;

type ProductGroup = {
  name: string;
  slug: string;
  items: Product[];
};

function trimDescription(value: string | undefined): string | null {
  const description = value?.trim();
  if (!description) return null;
  if (description.length <= DESCRIPTION_LIMIT) return description;
  return `${description.slice(0, DESCRIPTION_LIMIT).replace(/\s+\S*$/, "").trimEnd()}…`;
}

function groupByCategory(products: Product[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();

  for (const product of products) {
    const category = product.category;
    const name = category?.name?.trim() || "Catálogo general";
    const slug = category?.slug || "catalogo-general";
    const current = groups.get(slug) ?? { name, slug, items: [] };
    current.items.push(product);
    groups.set(slug, current);
  }

  return [...groups.values()].sort((left, right) => {
    if (left.slug === "catalogo-general") return 1;
    if (right.slug === "catalogo-general") return -1;
    return left.name.localeCompare(right.name, "es-CL");
  });
}

function ProductPrintCard({ product }: { product: Product }) {
  const image = product.images?.[0];
  const imageUrl = image ? pickMediaFormat(image, "medium") : null;
  const description = trimDescription(product.description || product.shortDescription);
  const dimensions = formatDimensions(product);
  const materials = product.materials?.filter(Boolean).join(", ") || product.observableMaterial;
  const price = hasVerifiedOffer(product)
    ? formatPrice({ price: product.price, currency: product.currency })
    : null;

  return (
    <article className="print-product" data-product-slug={product.slug}>
      <div className="print-product-media">
        {imageUrl ? (
          <img src={imageUrl} alt={image?.alternativeText || product.name} />
        ) : (
          <div className="print-image-fallback" role="img" aria-label={`Sin imagen: ${product.name}`}>
            Sin imagen
          </div>
        )}
      </div>
      <div className="print-product-body">
        <p className="print-product-category">{product.productType || product.category?.name || "Catálogo"}</p>
        <h3>{product.name}</h3>
        {description ? <p className="print-product-description">{description}</p> : null}
        <dl className="print-product-specs">
          {dimensions ? (
            <div>
              <dt>Medidas</dt>
              <dd>{dimensions}</dd>
            </div>
          ) : null}
          {materials ? (
            <div>
              <dt>Material</dt>
              <dd>{materials}</dd>
            </div>
          ) : null}
          {product.observableColor ? (
            <div>
              <dt>Color</dt>
              <dd>{product.observableColor}</dd>
            </div>
          ) : null}
        </dl>
        {price ? <p className="print-product-price">{price}</p> : null}
      </div>
    </article>
  );
}

function PrintErrorState() {
  return (
    <>
      <style>{`@media print { html, body { margin: 0 !important; background: #fff !important; } body:has(.print-document) > header, body:has(.print-document) > footer, body:has(.print-document) nav, body:has(.print-document) .skip-link { display: none !important; } body:has(.print-document) main { margin: 0 !important; padding: 0 !important; } }`}</style>
      <section className="print-catalog print-document print-status" role="status" aria-live="polite">
        <p className="print-status-label">Catálogo no disponible</p>
        <h1>No pudimos cargar el catálogo en este momento.</h1>
        <p>Intenta nuevamente en unos minutos o vuelve al catálogo en línea.</p>
        <Link href="/catalogo">Volver al catálogo</Link>
      </section>
    </>
  );
}

export default async function CatalogoImprimirPage() {
  let snapshot: Awaited<ReturnType<typeof getCatalogSnapshot>>;
  try {
    snapshot = await getCatalogSnapshot();
  } catch {
    return <PrintErrorState />;
  }

  const groups = groupByCategory(snapshot.products);
  const printedAt = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(snapshot.fetchedAt));
  const totalProducts = snapshot.products.length;

  return (
    <>
      <style>{`
        .print-catalog { --print-ink: #2c2c2c; --print-paper: #f9f8f6; --print-taupe: #a69076; --print-line: #d7d0c8; }
        .print-catalog, .print-catalog * { box-sizing: border-box; }
        .print-catalog { color: var(--print-ink); background: var(--print-paper); }
        .print-document { min-height: 100%; }
        .print-page { position: relative; }
        .print-cover { min-height: 70vh; display: flex; flex-direction: column; justify-content: space-between; padding: 4rem 0; border-top: 0.35rem solid var(--print-ink); }
        .print-wordmark { font-size: 1.4rem; font-weight: 700; letter-spacing: 0.12em; }
        .print-cover-title { max-width: 42rem; font-size: clamp(3rem, 8vw, 7rem); line-height: .92; letter-spacing: -.03em; }
        .print-cover-rule { width: 7rem; border-top: 0.25rem solid var(--print-taupe); }
        .print-index, .print-category { padding-top: 3rem; }
        .print-index-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem 2rem; margin-top: 1.5rem; }
        .print-index-link { display: flex; justify-content: space-between; gap: 1rem; border-bottom: 1px solid var(--print-line); padding: .6rem 0; color: inherit; text-decoration: none; }
        .print-index-link:focus-visible { outline: 2px solid var(--print-ink); outline-offset: 4px; }
        .print-category-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; border-bottom: 2px solid var(--print-ink); padding-bottom: .75rem; }
        .print-category-heading h2 { break-after: avoid; }
        .print-product-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; margin-top: 1.5rem; }
        .print-product { break-inside: avoid; border: 1px solid var(--print-line); background: #fff; }
        .print-product-media { aspect-ratio: 4 / 3; background: #ebe2d9; }
        .print-product-media img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .print-image-fallback { display: grid; height: 100%; place-items: center; color: #5b5148; font-size: .75rem; text-transform: uppercase; letter-spacing: .14em; }
        .print-product-body { padding: 1rem; }
        .print-product-category, .print-status-label { font-size: .7rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; }
        .print-product h3 { margin-top: .5rem; font-size: 1.2rem; line-height: 1.1; }
        .print-product-description { margin-top: .7rem; font-size: .85rem; line-height: 1.45; }
        .print-product-specs { display: grid; gap: .25rem; margin-top: .85rem; font-size: .72rem; }
        .print-product-specs div { display: grid; grid-template-columns: 5rem 1fr; gap: .5rem; }
        .print-product-specs dt { color: #625a53; }
        .print-product-price { margin-top: .85rem; font-size: .85rem; font-weight: 600; }
        .print-status { max-width: 42rem; min-height: 60vh; padding: 6rem 0; }
        .print-status h1 { margin-top: .75rem; font-size: 2rem; line-height: 1.1; }
        .print-status p:not(.print-status-label) { margin-top: 1rem; }
        .print-status a { display: inline-block; margin-top: 2rem; text-decoration: underline; text-underline-offset: 4px; }
        .print-footer { display: flex; justify-content: space-between; gap: 1rem; margin-top: 3rem; border-top: 1px solid var(--print-ink); padding-top: .75rem; font-size: .7rem; }
        .page-number::after { content: counter(page); }
        @media (max-width: 700px) { .print-index-list, .print-product-grid { grid-template-columns: 1fr; } }
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          html, body { margin: 0 !important; background: #fff !important; }
          body:has(.print-document) > header,
          body:has(.print-document) > footer,
          body:has(.print-document) nav,
          body:has(.print-document) .skip-link,
          body:has(.print-document) .no-print { display: none !important; }
          body:has(.print-document) main { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .print-catalog { max-width: none !important; padding: 0 !important; background: var(--print-paper) !important; }
          .print-cover { break-before: avoid; min-height: 245mm; }
          .print-index, .print-category { break-before: page; }
          .print-category-heading { break-after: avoid; }
          .print-product-grid { gap: 8mm; }
          .print-product, .print-product-media, .print-product-body, img { break-inside: avoid; }
          .print-category-heading + .print-product-grid { break-before: avoid; }
          .print-footer { position: running(print-footer); }
          a { color: inherit !important; text-decoration: none !important; }
          .print-catalog { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <section className="print-catalog print-document print-page mx-auto w-full max-w-[1440px] px-6 pt-24 pb-20 sm:px-10 lg:px-16">
        <div className="no-print mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-ink-line pb-8">
          <div>
            <p className="t-overline text-ink-mute">Versión imprimible</p>
            <p className="t-h2 mt-2 text-3xl text-ink">Catálogo de productos · {totalProducts} ítems</p>
            <p className="t-overline mt-2 text-ink-mute">{printedAt}</p>
            <p className="no-print mt-3 max-w-xl text-sm text-ink-mute">
              La paginación puede variar entre navegadores. Usa la vista previa de impresión para confirmar los saltos antes de guardar el PDF.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <PrintButton />
            <Link href="/catalogo" className="t-label tap-target text-ink underline-offset-[6px] hover:underline">
              Volver al catálogo <span aria-hidden>←</span>
            </Link>
          </div>
        </div>

        <header className="print-cover" aria-labelledby="print-title">
          <div>
            <p className="print-wordmark" aria-label="ENE-MUEBLES">{siteTokens.brand}</p>
            <p className="t-overline mt-6 text-ink-mute">Catálogo institucional · {new Date(snapshot.fetchedAt).getFullYear()}</p>
          </div>
          <div>
            <div className="print-cover-rule" aria-hidden />
            <h1 id="print-title" className="print-cover-title mt-8">Mobiliario institucional.</h1>
            <p className="t-body mt-6 max-w-xl text-base text-ink-mute">
              Mobiliario para aulas, oficinas e instituciones. Fichas de producto con información vigente al momento de la solicitud.
            </p>
          </div>
          <div className="print-footer">
            <span>ENE-MUEBLES · Chile</span>
            <span>Actualizado {printedAt}</span>
          </div>
        </header>

        <section className="print-index" aria-labelledby="print-index-title">
          <div className="print-category-heading">
            <h2 id="print-index-title" className="t-h2 text-3xl">Índice de categorías</h2>
            <span className="t-overline text-ink-mute">{groups.length} categorías · {totalProducts} productos</span>
          </div>
          {groups.length > 0 ? (
            <ol className="print-index-list">
              {groups.map((group) => (
                <li key={group.slug}>
                  <a className="print-index-link" href={`#categoria-${group.slug}`}>
                    <span>{group.name}</span>
                    <span aria-label={`${group.items.length} productos`}>{group.items.length}</span>
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-6 text-ink-mute" role="status">El catálogo aún no tiene productos publicados.</p>
          )}
          {snapshot.truncated ? (
            <p className="mt-6 border border-taupe-faint bg-cream-soft p-4 text-sm" role="status">
              Se muestran los primeros {totalProducts} productos disponibles. El catálogo excede el límite de carga configurado.
            </p>
          ) : null}
        </section>

        {groups.map((group) => (
          <section key={group.slug} id={`categoria-${group.slug}`} className="print-category" aria-labelledby={`titulo-${group.slug}`}>
            <div className="print-category-heading">
              <h2 id={`titulo-${group.slug}`} className="t-h2 text-3xl">{group.name}</h2>
              <span className="t-overline text-ink-mute">{group.items.length} productos</span>
            </div>
            <div className="print-product-grid">
              {group.items.map((product) => <ProductPrintCard key={product.id} product={product} />)}
            </div>
          </section>
        ))}

        {groups.length === 0 ? (
          <section className="print-status" role="status">
            <p className="print-status-label">Estado del catálogo</p>
            <h2 className="mt-3 text-2xl">No hay productos disponibles para imprimir.</h2>
            <p className="mt-3 text-ink-mute">Vuelve a intentarlo cuando existan productos publicados y activos.</p>
          </section>
        ) : null}

        <footer className="print-footer" aria-label="Pie del catálogo">
          <span>{siteTokens.brand} · Catálogo vigente al {printedAt}</span>
            <span>Página <span className="page-number" data-page-number="true" aria-label="Número de página" /></span>
        </footer>
      </section>
    </>
  );
}
