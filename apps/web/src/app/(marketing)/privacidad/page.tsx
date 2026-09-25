import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getLegalPage } from "@/lib/legal-pages";
import { FALLBACK_SITE_SETTINGS, getSiteSettings } from "@/lib/strapi";
import { buildSeoMetadata, FALLBACK_SHARE_IMAGE_ALT, resolveSeoText } from "@/lib/seo-metadata";

export const revalidate = 3600;
const LEGAL_METADATA_TITLE = "Política de privacidad";
const LEGAL_METADATA_DESCRIPTION =
  "Cómo Ene Muebles trata los datos personales que recibe a través de su sitio web, canales de contacto y procesos comerciales.";

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getLegalPage("privacy"),
    getSiteSettings().catch(() => FALLBACK_SITE_SETTINGS),
  ]);
  return buildSeoMetadata({
    title: resolveSeoText(page.metadataTitle) ?? LEGAL_METADATA_TITLE,
    description: resolveSeoText(page.metadataDescription) ?? LEGAL_METADATA_DESCRIPTION,
    path: "/privacidad",
    siteName: settings.siteName,
    imageAlt: resolveSeoText(settings.seoShareImageAlt) ?? FALLBACK_SHARE_IMAGE_ALT,
  });
}

export default async function PrivacidadPage() {
  return <LegalPage page={await getLegalPage("privacy")} />;
}
