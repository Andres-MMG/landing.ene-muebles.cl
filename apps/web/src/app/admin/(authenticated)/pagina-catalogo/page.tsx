import { CatalogPageForm } from "./CatalogPageForm";
import { sectionFallbacks, type CatalogPage } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Página catálogo · Ene Muebles",
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");
const TOKEN = process.env.STRAPI_API_TOKEN?.trim();

type CatalogPageShape = Partial<CatalogPage>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getCatalogPageForAdmin(): Promise<CatalogPageShape> {
  const response = await fetch(STRAPI + "/api/catalog-page?status=draft", {
    ...(TOKEN ? { headers: { Authorization: "Bearer " + TOKEN } } : {}),
    cache: "no-store",
  });

  if (response.status === 404) return sectionFallbacks.catalogPage();
  if (!response.ok) {
    throw new Error("No se pudo cargar la página de catálogo (" + response.status + ")");
  }

  const json: unknown = await response.json();
  if (!isRecord(json) || !Object.prototype.hasOwnProperty.call(json, "data")) {
    throw new Error("Strapi devolvió una respuesta inválida para la página de catálogo");
  }

  if (json.data === null) return sectionFallbacks.catalogPage();
  if (!isRecord(json.data)) {
    throw new Error("Strapi devolvió contenido inválido para la página de catálogo");
  }

  return json.data as CatalogPageShape;
}

export default async function AdminCatalogPage() {
  const content = await getCatalogPageForAdmin();

  return (
    <div
      aria-label="Editor de la página de catálogo"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Contenido del sitio
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Página de catálogo</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Textos editoriales del catálogo público y de su versión imprimible. Productos, líneas,
          cantidades, agrupación y paginación siguen calculándose desde el catálogo.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <CatalogPageForm
          initial={{
            seoTitle: content.seoTitle ?? "",
            seoDescription: content.seoDescription ?? "",
            eyebrow: content.eyebrow ?? "",
            productCountSuffix: content.productCountSuffix ?? "",
            documentationText: content.documentationText ?? "",
            printCtaLabel: content.printCtaLabel ?? "",
            printCoverTitle: content.printCoverTitle ?? "",
            printCoverBody: content.printCoverBody ?? "",
            printIndexTitle: content.printIndexTitle ?? "",
            printCategorySubtitle: content.printCategorySubtitle ?? "",
            printPublishedProductsSuffix: content.printPublishedProductsSuffix ?? "",
          }}
        />
      </div>
    </div>
  );
}
