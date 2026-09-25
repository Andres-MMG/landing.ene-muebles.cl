import type { Metadata } from "next";
import Link from "next/link";
import { site as siteTokens } from "@ene/ui-tokens";
import { formatAddress } from "@/lib/address";
import {
  getCatalogPage,
  getCatalogSnapshot,
  getSiteSettings,
  pickMediaFormat,
  type CatalogPage,
  type Product,
  type SiteSetting,
} from "@/lib/strapi";
import { PrintButton } from "./PrintButton";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import { PRODUCTS_PER_REFERENCE_PAGE, REFERENCE_MANIFEST } from "./reference-manifest";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...buildSeoMetadata({
    title: "Catálogo para imprimir",
    description: "Catálogo imprimible de mobiliario escolar y de oficina de ENE-MUEBLES.",
    path: "/catalogo",
  }),
  robots: { index: false, follow: true },
};

const DESCRIPTION_LIMIT = 220;
const CATEGORIES_PER_INDEX_PAGE = 18;

const PRINT_CONTENT_FALLBACK = Object.freeze({
  eyebrow: "Catálogo institucional",
  productCountSuffix: "productos certificados para instituciones.",
  documentationText: "Cada producto se entrega con ficha técnica y declaración de materiales.",
  printCtaLabel: "Imprimir PDF",
  printCoverTitle: "Mobiliario institucional",
  printCoverBody:
    "Mobiliario para aulas, oficinas e instituciones. Información vigente al momento de la solicitud.",
  printIndexTitle: "Líneas de producto",
  printCategorySubtitle: "Mobiliario institucional",
  printPublishedProductsSuffix: "productos publicados",
}) satisfies CatalogPage;

const PRINT_SITE_FALLBACK = Object.freeze({
  siteName: siteTokens.brand,
  contactEmail: "contacto@ene-muebles.cl",
  contactPhone: "+56 9 9539 5339",
}) satisfies SiteSetting;

const PRINT_ADDRESS_FALLBACK = "Chile";

type ProductSubgroup = { name?: string; key: string; items: Product[] };
type ProductGroup = { name: string; slug: string; subgroups: ProductSubgroup[] };
type PrintContact = {
  siteName: string;
  wordmark: string;
  email: string;
  phone: string;
  telHref: string | null;
  address: string;
  coverage?: string;
  quoteResponseTime?: string;
  warranty?: string;
};

function optionalText(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function buildTelHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const prefix = phone.trim().startsWith("+") ? "+" : "";
  return "tel:" + prefix + digits;
}

function resolvePrintContact(settings: SiteSetting): PrintContact {
  const siteName = settings.siteName?.trim() || PRINT_SITE_FALLBACK.siteName;
  const email = optionalText(settings.contactEmail) || PRINT_SITE_FALLBACK.contactEmail;
  const phone = optionalText(settings.contactPhone) || PRINT_SITE_FALLBACK.contactPhone;

  return {
    siteName,
    wordmark: siteName.replace(/-/g, " ").replace(/\s+/g, " ").trim(),
    email,
    phone,
    telHref: buildTelHref(phone),
    address: formatAddress(settings) || PRINT_ADDRESS_FALLBACK,
    coverage: optionalText(settings.dispatchCoverage),
    quoteResponseTime: optionalText(settings.quoteResponseTimeText),
    warranty: optionalText(settings.warrantyText),
  };
}

function PhoneContact({ contact, className }: { contact: PrintContact; className?: string }) {
  return contact.telHref ? (
    <a href={contact.telHref} className={className}>
      {contact.phone}
    </a>
  ) : (
    <span className={className}>{contact.phone}</span>
  );
}

function trimDescription(value: string | undefined): string | null {
  const description = value?.trim();
  if (!description) return null;
  if (description.length <= DESCRIPTION_LIMIT) return description;
  return `${description
    .slice(0, DESCRIPTION_LIMIT)
    .replace(/\s+\S*$/, "")
    .trimEnd()}…`;
}

function groupByCategoryAndSubcategory(products: Product[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();

  for (const product of products) {
    const name = product.category?.name?.trim() || "Catálogo general";
    const slug = product.category?.slug || "catalogo-general";
    const group = groups.get(slug) ?? { name, slug, subgroups: [] };
    const subcategory = product.subcategory?.trim() || undefined;
    const subcategoryKey = subcategory?.toLocaleLowerCase("es-CL") || "__without-subcategory__";
    const subgroup = group.subgroups.find((candidate) => candidate.key === subcategoryKey);

    if (subgroup) {
      subgroup.items.push(product);
    } else {
      group.subgroups.push({ name: subcategory, key: subcategoryKey, items: [product] });
    }
    groups.set(slug, group);
  }

  // The snapshot is already ordered by CMS `order` then name. Map insertion
  // order retains that factual hierarchy instead of inventing a new one.
  return [...groups.values()];
}

function chunkProducts(products: Product[]): Product[][] {
  return Array.from(
    { length: Math.ceil(products.length / PRODUCTS_PER_REFERENCE_PAGE) },
    (_, index) =>
      products.slice(
        index * PRODUCTS_PER_REFERENCE_PAGE,
        (index + 1) * PRODUCTS_PER_REFERENCE_PAGE,
      ),
  );
}

function chunkIndexGroups(groups: ProductGroup[]): ProductGroup[][] {
  if (groups.length === 0) return [[]];

  return Array.from({ length: Math.ceil(groups.length / CATEGORIES_PER_INDEX_PAGE) }, (_, index) =>
    groups.slice(index * CATEGORIES_PER_INDEX_PAGE, (index + 1) * CATEGORIES_PER_INDEX_PAGE),
  );
}

function CatalogFooter({ pageLabel, contact }: { pageLabel: string; contact: PrintContact }) {
  return (
    <footer className="print-page-footer" aria-label="Pie de página">
      <span className="print-footer-contact print-bounded-single">
        {contact.email} · {contact.phone}
        {contact.coverage ? " · " + contact.coverage : null}
      </span>
      <span data-page-number="true">{pageLabel}</span>
    </footer>
  );
}

function PrintCoverPage({
  printedAt,
  content,
  contact,
}: {
  printedAt: string;
  content: CatalogPage;
  contact: PrintContact;
}) {
  return (
    <header
      className="print-page print-cover"
      aria-labelledby="print-title"
      data-page-family="cover"
    >
      <div className="print-cover-content">
        <p className="print-cover-kicker print-bounded-single">{contact.siteName}</p>
        <p className="print-cover-catalog">CATÁLOGO</p>
        <h1 id="print-title" className="print-cover-title print-bounded-lines print-lines-3">
          {content.printCoverTitle}
        </h1>
        <p className="print-cover-copy print-bounded-lines print-lines-5">
          {content.printCoverBody}
        </p>
        <address className="print-cover-contact">
          <a href={"mailto:" + contact.email} className="print-bounded-single">
            {contact.email}
          </a>
          <PhoneContact contact={contact} className="print-bounded-single" />
          <span className="print-cover-address print-bounded-lines print-lines-2">
            {contact.address}
          </span>
        </address>
      </div>
      <p className="print-cover-mark print-bounded-single" aria-label={contact.wordmark}>
        {contact.wordmark}
      </p>
      <p className="print-cover-updated">Actualizado {printedAt}</p>
    </header>
  );
}

function PrintIndexPage({
  groups,
  totalProducts,
  isTruncated,
  pageNumber,
  pageCount,
  content,
  contact,
}: {
  groups: ProductGroup[];
  totalProducts: number;
  isTruncated: boolean;
  pageNumber: number;
  pageCount: number;
  content: CatalogPage;
  contact: PrintContact;
}) {
  const splitAt = Math.ceil(groups.length / 2);
  const columns = [groups.slice(0, splitAt), groups.slice(splitAt)];
  const titleId = `print-index-title-${pageNumber}`;

  return (
    <section
      className="print-page print-index"
      aria-labelledby={titleId}
      data-page-family="index"
      data-index-page={`${pageNumber}/${pageCount}`}
    >
      <header className="print-index-header">
        <div>
          <p className="print-section-label">
            ÍNDICE{pageCount > 1 ? ` · ${pageNumber}/${pageCount}` : ""}
          </p>
          <h2 id={titleId} className="print-index-title print-bounded-lines print-lines-2">
            {content.printIndexTitle}
          </h2>
        </div>
        <p className="print-index-wordmark print-bounded-single" aria-label={contact.wordmark}>
          {contact.wordmark}
        </p>
      </header>
      {groups.length > 0 ? (
        <div className="print-index-columns">
          {columns.map((column, columnIndex) => (
            <ol key={columnIndex} className="print-index-list">
              {column.map((group, index) => {
                const count = group.subgroups.reduce(
                  (total, subgroup) => total + subgroup.items.length,
                  0,
                );
                const color = (index + columnIndex * splitAt) % 2 === 0 ? "ochre" : "green";
                return (
                  <li key={group.slug}>
                    <a href={`#categoria-${group.slug}`} className="print-index-link">
                      <span
                        className={`print-index-bullet print-index-bullet-${color}`}
                        aria-hidden
                      />
                      <span className="print-index-name">{group.name}</span>
                      <span aria-label={`${count} productos`}>{count}</span>
                    </a>
                  </li>
                );
              })}
            </ol>
          ))}
        </div>
      ) : (
        <p className="print-index-empty" role="status">
          El catálogo aún no tiene productos publicados.
        </p>
      )}
      {isTruncated ? (
        <p className="print-truncated" role="status" data-catalog-truncated="true">
          Se muestran los primeros {totalProducts} productos disponibles. El catálogo excede el
          límite de carga configurado.
        </p>
      ) : null}
      <aside className="print-contact-panel" aria-label={"Contacto " + contact.siteName}>
        <p className="print-contact-site-name print-bounded-single">{contact.siteName}</p>
        <a href={"mailto:" + contact.email} className="print-bounded-single">
          {contact.email}
        </a>
        <PhoneContact contact={contact} className="print-bounded-single" />
        <span className="print-contact-product-count print-bounded-single">
          {totalProducts} {content.printPublishedProductsSuffix}
        </span>
        {contact.quoteResponseTime ? (
          <span className="print-contact-fact print-bounded-lines print-lines-2">
            {contact.quoteResponseTime}
          </span>
        ) : null}
        {contact.warranty ? (
          <span className="print-contact-fact print-bounded-lines print-lines-2">
            {contact.warranty}
          </span>
        ) : null}
      </aside>
      <CatalogFooter pageLabel="Índice" contact={contact} />
    </section>
  );
}

function ProductPrintSlot({ product }: { product: Product }) {
  const image = product.images?.[0];
  const imageUrl = image ? pickMediaFormat(image, "large") : null;
  const description = trimDescription(product.description || product.shortDescription);
  const categoryLabel = [product.category?.name?.trim(), product.subcategory?.trim()]
    .filter((label): label is string => Boolean(label))
    .join(" · ");

  return (
    <article className="print-product-slot" data-product-slug={product.slug}>
      <div className="print-product-media">
        {imageUrl ? (
          <img src={imageUrl} alt={image?.alternativeText || product.name} />
        ) : (
          <div
            className="print-image-fallback"
            role="img"
            aria-label={`Sin imagen: ${product.name}`}
          >
            Sin imagen disponible
          </div>
        )}
      </div>
      <div className="print-product-body">
        <p className="print-product-category">{categoryLabel || "Catálogo"}</p>
        <h3>{product.name}</h3>
        {description ? <p className="print-product-description">{description}</p> : null}
      </div>
    </article>
  );
}

function PrintCategoryPage({
  group,
  subgroup,
  products,
  pageNumber,
  pageCount,
  isFirstCategoryPage,
  content,
  contact,
}: {
  group: ProductGroup;
  subgroup: ProductSubgroup;
  products: Product[];
  pageNumber: number;
  pageCount: number;
  isFirstCategoryPage: boolean;
  content: CatalogPage;
  contact: PrintContact;
}) {
  return (
    <section
      id={isFirstCategoryPage ? `categoria-${group.slug}` : undefined}
      className="print-page print-category"
      aria-labelledby={`titulo-${group.slug}-${pageNumber}`}
      data-page-family="category"
      data-category-slug={group.slug}
      data-subcategory={subgroup.name}
    >
      <header className="print-category-header">
        <div className="print-category-title">
          <p className="print-section-label">CATEGORÍA</p>
          <h2 id={`titulo-${group.slug}-${pageNumber}`}>{group.name}</h2>
          {subgroup.name ? (
            <p className="print-category-context">Subcategoría · {subgroup.name}</p>
          ) : null}
        </div>
        <div className="print-category-brand" aria-label={contact.wordmark}>
          <p className="print-category-wordmark print-bounded-single">{contact.wordmark}</p>
          <p className="print-category-subtitle print-bounded-lines print-lines-2">
            {content.printCategorySubtitle}
          </p>
        </div>
        <p className="print-category-progress">
          {pageNumber} / {pageCount}
        </p>
      </header>
      <div className="print-product-grid" aria-label={`Productos de ${group.name}`}>
        {products.map((product) => (
          <ProductPrintSlot key={product.id} product={product} />
        ))}
      </div>
      <CatalogFooter pageLabel={"Página " + pageNumber} contact={contact} />
    </section>
  );
}

function PrintErrorState() {
  return (
    <section className="print-document print-status" role="status" aria-live="polite">
      <p>Catálogo no disponible</p>
      <h1>No pudimos cargar el catálogo en este momento.</h1>
      <p>Intenta nuevamente en unos minutos o vuelve al catálogo en línea.</p>
      <Link href="/catalogo">Volver al catálogo</Link>
    </section>
  );
}

export default async function CatalogoImprimirPage() {
  let snapshot: Awaited<ReturnType<typeof getCatalogSnapshot>>;
  let content: CatalogPage;
  let settings: SiteSetting;

  try {
    [snapshot, content, settings] = await Promise.all([
      getCatalogSnapshot(),
      getCatalogPage().catch(() => PRINT_CONTENT_FALLBACK),
      getSiteSettings().catch(() => PRINT_SITE_FALLBACK),
    ]);
  } catch {
    return <PrintErrorState />;
  }

  const contact = resolvePrintContact(settings);
  const groups = groupByCategoryAndSubcategory(snapshot.products);
  const printedAt = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(snapshot.fetchedAt));
  const categoryPages = groups.flatMap((group) => {
    const subgroupPages = group.subgroups.flatMap((subgroup) =>
      chunkProducts(subgroup.items).map((products) => ({ group, subgroup, products })),
    );

    return subgroupPages.map((page, index) => ({ ...page, isFirstCategoryPage: index === 0 }));
  });
  const indexPages = chunkIndexGroups(groups);

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="no-print print-toolbar">
        <div>
          <p>Versión imprimible</p>
          <strong>Catálogo de productos · {snapshot.products.length} ítems</strong>
        </div>
        <div>
          <PrintButton />
          <Link href="/catalogo">
            Volver al catálogo <span aria-hidden>←</span>
          </Link>
        </div>
      </div>
      <div
        className="print-catalog print-document"
        data-reference-version={REFERENCE_MANIFEST.version}
      >
        <PrintCoverPage printedAt={printedAt} content={content} contact={contact} />
        {indexPages.map((indexGroups, index) => (
          <PrintIndexPage
            key={`index-${index}`}
            groups={indexGroups}
            totalProducts={snapshot.products.length}
            isTruncated={snapshot.truncated && index === 0}
            pageNumber={index + 1}
            pageCount={indexPages.length}
            content={content}
            contact={contact}
          />
        ))}
        {categoryPages.map(({ group, subgroup, products, isFirstCategoryPage }, index) => (
          <PrintCategoryPage
            key={`${group.slug}-${subgroup.key}-${index}`}
            group={group}
            subgroup={subgroup}
            products={products}
            pageNumber={index + 1}
            pageCount={categoryPages.length}
            isFirstCategoryPage={isFirstCategoryPage}
            content={content}
            contact={contact}
          />
        ))}
        {groups.length === 0 ? (
          <section className="print-empty" role="status">
            <h2>No hay productos disponibles para imprimir.</h2>
            <p>Vuelve a intentarlo cuando existan productos publicados y activos.</p>
          </section>
        ) : null}
      </div>
    </>
  );
}

const PRINT_STYLES = `
  .print-catalog { --print-ink: #292929; --print-taupe: #b49d7c; --print-paper: #f5f1e8; --print-ochre: #b77b2b; --print-green: #617356; --print-rule: #b9b4ac; color: var(--print-ink); font-family: var(--font-body), Arial, sans-serif; }
  .print-catalog *, .print-toolbar * { box-sizing: border-box; }
  .print-toolbar { width: min(100% - 2rem, 1188px); margin: 2rem auto; display: flex; justify-content: space-between; gap: 1rem; align-items: center; border-bottom: 1px solid #d7d0c8; padding-bottom: 1rem; color: #292929; }
  .print-toolbar p { margin: 0; font-size: .75rem; letter-spacing: .14em; text-transform: uppercase; }.print-toolbar strong { display: block; margin-top: .35rem; font-size: 1.15rem; }.print-toolbar > div:last-child { display: flex; gap: 1rem; align-items: center; }.print-toolbar a { font-size: .8rem; text-decoration: underline; text-underline-offset: .3em; }
  .print-page { width: 297mm; height: 210mm; position: relative; overflow: hidden; background: #fff; break-after: page; break-inside: avoid; page-break-after: always; page-break-inside: avoid; }
  .print-page:last-child { break-after: auto; page-break-after: auto; }
  .print-cover { background: linear-gradient(90deg, var(--print-ink) 0 56%, var(--print-taupe) 56% 100%); color: #fff; padding: 22mm 18mm; }.print-cover-content { width: 52%; }.print-cover-kicker, .print-cover-catalog, .print-section-label { margin: 0; font-size: 8pt; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }.print-cover-catalog { margin-top: 26mm; color: var(--print-taupe); }.print-cover h1 { margin: 4mm 0 0; max-width: 105mm; color: #fff; font-size: 33pt; line-height: .94; letter-spacing: -.025em; }.print-cover-copy { margin: 7mm 0 0; width: 87mm; font-size: 10.5pt; line-height: 1.45; }.print-cover-contact { display: grid; gap: 1mm; margin-top: 13mm; font-style: normal; font-size: 8.5pt; }.print-cover-contact a { color: inherit; }.print-cover-mark { position: absolute; right: 17mm; bottom: 18mm; margin: 0; color: var(--print-ink); font-size: 50pt; font-weight: 800; letter-spacing: -.1em; }.print-cover-updated { position: absolute; bottom: 10mm; left: 18mm; margin: 0; font-size: 7pt; letter-spacing: .1em; text-transform: uppercase; }
  .print-index { padding: 18mm; background: #fff; }.print-index-header { display: flex; align-items: flex-start; justify-content: space-between; }.print-index h2 { margin: 3mm 0 0; font-size: 28pt; line-height: .95; letter-spacing: -.025em; }.print-index-wordmark, .print-category-wordmark { margin: 0; font-size: 22pt; font-weight: 800; letter-spacing: -.1em; }.print-index-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-top: 14mm; }.print-index-list { margin: 0; padding: 0; list-style: none; }.print-index-link { display: grid; grid-template-columns: 4mm 1fr auto; gap: 3mm; align-items: center; min-height: 10mm; border-bottom: 1px solid var(--print-rule); color: inherit; text-decoration: none; font-size: 10pt; }.print-index-bullet { width: 2.5mm; height: 2.5mm; border-radius: 50%; }.print-index-bullet-ochre { background: var(--print-ochre); }.print-index-bullet-green { background: var(--print-green); }.print-index-name { font-weight: 600; }.print-truncated { position: absolute; bottom: 18mm; left: 18mm; width: 91mm; margin: 0; padding: 4mm; border: 1px solid var(--print-ochre); color: #5a4424; font-size: 7.5pt; line-height: 1.35; }.print-contact-panel { position: absolute; right: 18mm; bottom: 18mm; width: 91mm; display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 5mm; padding: 6mm; background: var(--print-ink); color: #fff; font-size: 8pt; }.print-contact-panel p { grid-column: 1 / -1; margin: 0; font-weight: 700; letter-spacing: .14em; }.print-contact-panel a { color: inherit; }.print-contact-panel span { grid-column: 1 / -1; color: #dcd8d2; }
  .print-category { padding: 0 18mm 15mm; display: flex; flex-direction: column; }.print-category-header { min-height: 35mm; margin: 0 -18mm 8mm; padding: 8mm 18mm 7mm 23mm; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; background: var(--print-ink); border-left: 5mm solid var(--print-ochre); color: #fff; }.print-category-title .print-section-label { color: var(--print-taupe); }.print-category h2 { margin: 2mm 0 0; color: #fff; font-size: 23pt; line-height: .95; letter-spacing: -.025em; }.print-category-wordmark { color: #fff; }.print-category-progress { justify-self: end; margin: 0; font-size: 8pt; letter-spacing: .16em; }.print-product-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 5mm; flex: 1; min-height: 0; }.print-product-slot { min-width: 0; overflow: hidden; border-top: 1.25mm solid var(--print-taupe); background: #fff; }.print-product-media { height: 64%; background: var(--print-paper); }.print-product-media img { width: 100%; height: 100%; object-fit: contain; }.print-image-fallback { display: grid; width: 100%; height: 100%; place-items: center; padding: 5mm; color: #5a554d; text-align: center; font-size: 7pt; text-transform: uppercase; letter-spacing: .12em; }.print-product-body { padding: 3mm 0 0; }.print-product-category { margin: 0; color: #605a51; font-size: 6.5pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }.print-product-slot h3 { margin: 1.5mm 0 0; color: var(--print-ink); font-size: 11pt; line-height: 1.05; }.print-product-description { margin: 2mm 0 0; font-size: 7.2pt; line-height: 1.32; }.print-product-specs { display: grid; gap: 1mm; margin: 2mm 0 0; font-size: 6.5pt; line-height: 1.25; }.print-product-specs div { display: grid; grid-template-columns: 15mm 1fr; gap: 1mm; }.print-product-specs dt { color: #605a51; }.print-product-specs dd { margin: 0; }.print-page-footer { display: flex; justify-content: space-between; gap: 5mm; margin-top: 5mm; padding-top: 2.5mm; border-top: 1px solid var(--print-ink); font-size: 6.5pt; letter-spacing: .04em; }.print-index .print-page-footer { position: absolute; right: 18mm; bottom: 8mm; left: 18mm; }.print-index-empty, .print-empty, .print-status { padding: 18mm; }
  /* Fixed content budgets keep dynamic CMS descriptions intentional rather than clipped. */
  .print-cover-mark { font-size: 29pt; letter-spacing: -.055em; white-space: nowrap; }
  .print-index-wordmark { font-size: 14pt; letter-spacing: -.055em; white-space: nowrap; }
  .print-category-header { grid-template-columns: minmax(0, 1fr) minmax(42mm, 70mm) minmax(0, 1fr); }
  .print-category-title { min-width: 0; }
  .print-category-context { margin: 2mm 0 0; color: #dcd8d2; font-size: 7pt; line-height: 1.2; }
  .print-category-brand { width: 70mm; min-width: 0; max-width: 70mm; overflow: hidden; text-align: center; }
  .print-category-wordmark { font-size: 14pt; letter-spacing: -.055em; line-height: 1; white-space: nowrap; }
  .print-category-subtitle { max-height: 6mm; margin: 1.5mm 0 0; color: #dcd8d2; font-size: 6.5pt; line-height: 1; letter-spacing: .08em; text-transform: uppercase; white-space: normal; }
  /* Configurable CMS copy stays inside deterministic A4 regions. */
  .print-bounded-single { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .print-bounded-lines { display: -webkit-box; min-width: 0; overflow: hidden; overflow-wrap: anywhere; word-break: break-word; -webkit-box-orient: vertical; }
  .print-lines-2 { -webkit-line-clamp: 2; }
  .print-lines-3 { -webkit-line-clamp: 3; }
  .print-lines-5 { -webkit-line-clamp: 5; }
  .print-cover-content { min-width: 0; max-width: 136mm; }
  .print-cover-kicker { max-width: 105mm; }
  .print-cover-title { max-height: 31mm; }
  .print-cover-copy { max-height: 28mm; }
  .print-cover-contact { max-width: 105mm; overflow: hidden; }
  .print-cover-contact > * { max-width: 105mm; }
  .print-cover-address { max-height: 8mm; }
  .print-cover-mark { max-width: 105mm; text-align: right; }
  .print-index-header { gap: 12mm; }
  .print-index-header > div { min-width: 0; max-width: 150mm; }
  .print-index-title { max-height: 20mm; }
  .print-index-wordmark { flex: 0 1 80mm; max-width: 80mm; text-align: right; }
  .print-contact-panel { max-height: 42mm; overflow: hidden; gap: 1mm 5mm; grid-auto-rows: min-content; }
  .print-contact-panel > * { min-width: 0; }
  .print-contact-site-name, .print-contact-product-count, .print-contact-fact { grid-column: 1 / -1; }
  .print-contact-fact.print-lines-2 { max-height: 7mm; }
  .print-page-footer { min-width: 0; }
  .print-footer-contact { flex: 1 1 auto; }
  .print-page-footer [data-page-number="true"] { flex: 0 0 auto; }
  .print-product-slot { display: grid; grid-template-rows: 42mm minmax(0, 1fr); min-height: 0; border-top-width: 1mm; }
  .print-product-media { height: auto; min-height: 0; }
  .print-product-body { display: grid; grid-template-rows: auto auto minmax(0, 1fr); min-height: 0; overflow: hidden; padding: 3mm 2.5mm 2.5mm; }
  .print-product-category { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .print-product-slot h3 { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
  .print-product-description { display: -webkit-box; overflow: hidden; margin-bottom: 0; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
  @media screen { .print-catalog { display: grid; gap: 2rem; width: min-content; margin: 0 auto 3rem; }.print-page { box-shadow: 0 8px 28px rgb(0 0 0 / .18); } }
  @media print { @page { size: A4 landscape; margin: 0; } html, body { margin: 0 !important; background: #fff !important; } body:has(.print-document) > header, body:has(.print-document) > footer, body:has(.print-document) nav, body:has(.print-document) .skip-link, .no-print { display: none !important; } body:has(.print-document) main { margin: 0 !important; padding: 0 !important; background: #fff !important; } .print-catalog { display: block; } .print-page { box-shadow: none; } .print-catalog, .print-catalog * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } a { color: inherit !important; text-decoration: none !important; } }
`;
