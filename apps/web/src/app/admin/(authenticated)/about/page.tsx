import { AboutSectionForm } from "./AboutSectionForm";
import { sectionFallbacks, type AboutSection } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Nosotros (about) · Ene Muebles",
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");
const TOKEN = process.env.STRAPI_API_TOKEN?.trim();

type AboutPageCopy = {
  pageEyebrow?: string;
  pageTitle?: string;
  yearsInBusinessLabel?: string;
  productCountLabel?: string;
  productLineCountLabel?: string;
  coverageLabel?: string;
  warrantyLabel?: string;
  projectCtaTitle?: string;
  projectCtaBody?: string;
  projectCtaLabel?: string;
};

type AboutShape = Partial<AboutSection & AboutPageCopy>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getAboutSectionForAdmin(): Promise<AboutShape> {
  const response = await fetch(STRAPI + "/api/about-section?populate=*&status=draft", {
    ...(TOKEN ? { headers: { Authorization: "Bearer " + TOKEN } } : {}),
    cache: "no-store",
  });

  if (response.status === 404) return sectionFallbacks.about() as AboutShape;
  if (!response.ok) {
    throw new Error("No se pudo cargar la sección Nosotros (" + response.status + ")");
  }

  const json: unknown = await response.json();
  if (!isRecord(json) || !Object.prototype.hasOwnProperty.call(json, "data")) {
    throw new Error("Strapi devolvió una respuesta inválida para la sección Nosotros");
  }

  if (json.data === null) return sectionFallbacks.about() as AboutShape;
  if (!isRecord(json.data)) {
    throw new Error("Strapi devolvió contenido inválido para la sección Nosotros");
  }

  return json.data as AboutShape;
}

const EMPTY_VALUE_ROWS = [
  { title: "", body: "" },
  { title: "", body: "" },
  { title: "", body: "" },
  { title: "", body: "" },
];

export default async function AdminAboutPage() {
  const content = await getAboutSectionForAdmin();
  const storedValues = Array.isArray(content.values) ? content.values : [];
  const values = [...storedValues, ...EMPTY_VALUE_ROWS]
    .slice(0, 4)
    .map((value) => ({ title: value.title ?? "", body: value.body ?? "" }));

  return (
    <div
      aria-label="Editor de la sección 'sobre nosotros'"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div aria-label="Cabecera de about" className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Contenido del sitio
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Sección «Nosotros»</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Administra el bloque de inicio, la página Nosotros, sus métricas, misión, visión, valores
          y llamado final. Las cantidades y los años se calculan desde los datos vigentes.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <AboutSectionForm
          initial={{
            seoTitle: content.seoTitle ?? "",
            seoDescription: content.seoDescription ?? "",
            eyebrow: content.eyebrow ?? "",
            title: content.title ?? "",
            intro: content.intro ?? "",
            body: content.body ?? "",
            missionLabel: content.missionLabel ?? "",
            missionHeading: content.missionHeading ?? "",
            missionBody: content.missionBody ?? "",
            visionLabel: content.visionLabel ?? "",
            visionHeading: content.visionHeading ?? "",
            visionBody: content.visionBody ?? "",
            valuesLabel: content.valuesLabel ?? "",
            valuesHeading: content.valuesHeading ?? "",
            pageEyebrow: content.pageEyebrow ?? "",
            pageTitle: content.pageTitle ?? "",
            yearsInBusinessLabel: content.yearsInBusinessLabel ?? "",
            productCountLabel: content.productCountLabel ?? "",
            productLineCountLabel: content.productLineCountLabel ?? "",
            coverageLabel: content.coverageLabel ?? "",
            warrantyLabel: content.warrantyLabel ?? "",
            projectCtaTitle: content.projectCtaTitle ?? "",
            projectCtaBody: content.projectCtaBody ?? "",
            projectCtaLabel: content.projectCtaLabel ?? "",
            values,
          }}
        />
      </div>
    </div>
  );
}
