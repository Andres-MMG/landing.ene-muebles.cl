import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getLegalPage } from "@/lib/legal-pages";
import { FALLBACK_SITE_SETTINGS, getSiteSettings } from "@/lib/strapi";
import { buildSeoMetadata, FALLBACK_SHARE_IMAGE_ALT, resolveSeoText } from "@/lib/seo-metadata";

export const revalidate = 3600;
const LEGAL_METADATA_TITLE = "Términos y condiciones";
const LEGAL_METADATA_DESCRIPTION =
  "Términos y condiciones que regulan el uso del sitio web de Ene Muebles y la relación comercial con clientes institucionales.";

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getLegalPage("terms"),
    getSiteSettings().catch(() => FALLBACK_SITE_SETTINGS),
  ]);
  return buildSeoMetadata({
    title: resolveSeoText(page.metadataTitle) ?? LEGAL_METADATA_TITLE,
    description: resolveSeoText(page.metadataDescription) ?? LEGAL_METADATA_DESCRIPTION,
    path: "/terminos",
    siteName: settings.siteName,
    imageAlt: resolveSeoText(settings.seoShareImageAlt) ?? FALLBACK_SHARE_IMAGE_ALT,
  });
}

export default async function TerminosPage() {
  return <LegalPage page={await getLegalPage("terms")} />;
}
