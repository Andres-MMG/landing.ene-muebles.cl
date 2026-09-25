import { HomePageForm } from "./HomePageForm";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import { sectionFallbacks, type HomePage } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Inicio · Ene Muebles",
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");
type HomePageShape = Partial<HomePage>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getHomePageForAdmin(): Promise<HomePageShape> {
  const token = getStrapiAdminToken().trim();
  const response = await fetch(STRAPI + "/api/home-page?status=draft", {
    ...(token ? { headers: { Authorization: "Bearer " + token } } : {}),
    cache: "no-store",
  });

  if (response.status === 404) return sectionFallbacks.homePage();
  if (!response.ok) {
    throw new Error("No se pudo cargar la página de inicio (" + response.status + ")");
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error("Strapi devolvió una respuesta inválida para la página de inicio");
  }

  if (!isRecord(json) || !Object.prototype.hasOwnProperty.call(json, "data")) {
    throw new Error("Strapi devolvió una respuesta inválida para la página de inicio");
  }
  if (json.data === null) return sectionFallbacks.homePage();
  if (!isRecord(json.data)) {
    throw new Error("Strapi devolvió contenido inválido para la página de inicio");
  }

  return json.data as HomePageShape;
}

export default async function AdminHomePage() {
  const content = await getHomePageForAdmin();

  return (
    <div
      aria-label="Editor de la página de inicio"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Contenido del sitio
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Página de inicio</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Textos de las secciones «Líneas del catálogo» y «Productos destacados». Los productos,
          categorías y sus cantidades siguen calculándose desde el catálogo.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <HomePageForm
          initial={{
            seoTitle: content.seoTitle ?? "",
            seoDescription: content.seoDescription ?? "",
            catalogEyebrow: content.catalogEyebrow ?? "",
            catalogTitle: content.catalogTitle ?? "",
            catalogBody: content.catalogBody ?? "",
            catalogCtaLabel: content.catalogCtaLabel ?? "",
            featuredEyebrow: content.featuredEyebrow ?? "",
            featuredTitle: content.featuredTitle ?? "",
            featuredBody: content.featuredBody ?? "",
            featuredCtaLabel: content.featuredCtaLabel ?? "",
          }}
        />
      </div>
    </div>
  );
}
