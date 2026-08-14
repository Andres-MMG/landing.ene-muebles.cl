import Link from "next/link";
import { getAllProducts } from "@/lib/strapi";
import { formatDimensions } from "@/lib/product-attributes";
import { PrintButton } from "./PrintButton";

// Print pages must NOT be statically prerendered at build time: the
// CMS is unreachable during `next build` (Strapi boots at deploy time),
// so a static fetch here fails the whole build. force-dynamic keeps the
// printout always fresh and decoupled from the build pipeline.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catálogo para imprimir",
  description:
    "Versión imprimible del catálogo de mobiliario escolar y de oficina de Ene Muebles, con medidas y materiales por producto.",
};

/**
 * Group products by their category name for the print layout. Products
 * without a category fall into a "Catálogo general" group so nothing
 * is silently dropped from the printout.
 */
const groupByCategory = (products: Awaited<ReturnType<typeof getAllProducts>>) => {
  const groups = new Map<string, typeof products>();
  for (const product of products) {
    const key = product.category?.name ?? "Catálogo general";
    const list = groups.get(key) ?? [];
    list.push(product);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([name, items]) => ({ name, items }));
};

export default async function CatalogoImprimirPage() {
  let products: Awaited<ReturnType<typeof getAllProducts>>;
  try {
    products = await getAllProducts();
  } catch {
    // The CMS may be briefly unavailable; the print page must degrade
    // to a readable error instead of throwing a 500.
    return (
      <section className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-20 sm:px-10 lg:px-16">
        <h1 className="t-h2 text-3xl text-ink">Catálogo no disponible</h1>
        <p className="t-body mt-4 max-w-xl text-base text-ink-mute">
          No pudimos cargar el catálogo en este momento. Intenta nuevamente en unos
          minutos o vuelve al catálogo en línea.
        </p>
        <Link
          href="/catalogo"
          className="t-label mt-8 inline-flex items-center gap-2 text-ink underline-offset-[6px] hover:text-taupe-text hover:underline"
        >
          Volver al catálogo
          <span aria-hidden>←</span>
        </Link>
      </section>
    );
  }
  const groups = groupByCategory(products);
  const printedAt = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      <style>{`
        /* Print-only chrome rules: the (marketing) layout renders the
           site Header/Footer around this page; the print stylesheet
           hides them (and any .no-print element, e.g. the toolbar) so
           the PDF contains only the catalog. */
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { background: #fff !important; }
          header, footer, nav { display: none !important; }
          /* B2/U13 — the layout's skip link is off-canvas chrome; it
             must not appear in the printed catalog. */
          .skip-link { display: none !important; }
          .no-print { display: none !important; }
          .print-catalog { padding: 0 !important; max-width: none !important; }
          .print-section { break-before: page; }
          .print-section:first-of-type { break-before: avoid; }
          .print-row { break-inside: avoid; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>

      <section className="print-catalog mx-auto w-full max-w-[1440px] px-6 pt-24 pb-20 sm:px-10 lg:px-16">
        {/* Toolbar — hidden when printing. */}
        <div className="no-print mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-ink-line pb-8">
          <div>
            <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-taupe-text">
              Versión imprimible
            </p>
            <h1 className="t-h2 mt-2 text-3xl text-ink">
              Catálogo de productos · {products.length} ítems
            </h1>
            <p className="t-mono mt-2 text-[11px] uppercase tracking-[0.22em] text-ink-mute">
              {printedAt}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <PrintButton />
            <Link
              href="/catalogo"
              className="t-label inline-flex items-center gap-2 text-ink underline-offset-[6px] hover:text-taupe-text hover:underline tap-target"
            >
              Volver al catálogo
              <span aria-hidden>←</span>
            </Link>
          </div>
        </div>

        {/* Print header — repeats on the first page only. */}
        <header className="mb-8 flex items-baseline justify-between border-b border-ink pb-4">
          <p className="t-h2 text-2xl text-ink">ENE-MUEBLES · Catálogo institucional</p>
          <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
            Medidas en cm · An x Al x Pr · {printedAt}
          </p>
        </header>

        {products.length === 0 ? (
          <p className="py-20 text-center text-base text-ink-mute">
            El catálogo aún no tiene productos publicados.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.name} className="print-section mb-10">
              <h2 className="t-mono border-b border-ink-line pb-2 text-xs uppercase tracking-[0.22em] text-taupe-text">
                {group.name}
              </h2>
              <ul className="mt-4">
                {group.items.map((product) => {
                  const medidas = formatDimensions(product);
                  const materiales =
                    Array.isArray(product.materials) && product.materials.length > 0
                      ? product.materials.join(", ")
                      : product.observableMaterial;
                  return (
                    <li
                      key={product.id}
                      className="print-row flex items-baseline justify-between gap-6 border-b border-ink-line/50 py-2"
                    >
                      <div className="flex min-w-0 items-baseline gap-4">
                        <span className="t-body text-base text-ink">{product.name}</span>
                        {medidas ? (
                          <span className="t-mono text-xs text-ink-mute">
                            Medidas: {medidas}
                          </span>
                        ) : null}
                        {materiales ? (
                          <span className="t-mono text-xs text-ink-mute">
                            {materiales}
                          </span>
                        ) : null}
                      </div>
                      <span className="t-mono shrink-0 text-[11px] uppercase tracking-[0.18em] text-ink-soft-text">
                        {product.category?.name ?? "Catálogo"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </section>
    </>
  );
}
