export type PublicNavigationItem = {
  label: string;
  href: string;
};

export type PublicNavigationLabels = {
  home: string;
  catalog: string;
  about: string;
  contact: string;
  headerWhatsapp: string;
  mobileWhatsapp: string;
};

export type ResolvedPublicNavigation = {
  labels: PublicNavigationLabels;
  items: PublicNavigationItem[];
};

const FALLBACK_LABELS: PublicNavigationLabels = {
  home: "Inicio",
  catalog: "Catálogo",
  about: "Nosotros",
  contact: "Contacto",
  headerWhatsapp: "WhatsApp",
  mobileWhatsapp: "Hablar por WhatsApp",
};

export const DESKTOP_NAVIGATION_LABEL_MAX_LENGTH = 24;
export const HEADER_WHATSAPP_LABEL_MAX_LENGTH = 24;
export const MOBILE_WHATSAPP_LABEL_MAX_LENGTH = 80;

function readLabel(
  source: Record<string, unknown>,
  field: string,
  fallback: string,
  maxLength: number,
): string {
  const value = source[field];
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : fallback;
}

export function resolvePublicNavigation(source?: unknown): ResolvedPublicNavigation {
  const record =
    source !== null && typeof source === "object" ? (source as Record<string, unknown>) : {};

  const labels: PublicNavigationLabels = {
    home: readLabel(
      record,
      "navigationHomeLabel",
      FALLBACK_LABELS.home,
      DESKTOP_NAVIGATION_LABEL_MAX_LENGTH,
    ),
    catalog: readLabel(
      record,
      "navigationCatalogLabel",
      FALLBACK_LABELS.catalog,
      DESKTOP_NAVIGATION_LABEL_MAX_LENGTH,
    ),
    about: readLabel(
      record,
      "navigationAboutLabel",
      FALLBACK_LABELS.about,
      DESKTOP_NAVIGATION_LABEL_MAX_LENGTH,
    ),
    contact: readLabel(
      record,
      "navigationContactLabel",
      FALLBACK_LABELS.contact,
      DESKTOP_NAVIGATION_LABEL_MAX_LENGTH,
    ),
    headerWhatsapp: readLabel(
      record,
      "headerWhatsappLabel",
      FALLBACK_LABELS.headerWhatsapp,
      HEADER_WHATSAPP_LABEL_MAX_LENGTH,
    ),
    mobileWhatsapp: readLabel(
      record,
      "mobileWhatsappLabel",
      FALLBACK_LABELS.mobileWhatsapp,
      MOBILE_WHATSAPP_LABEL_MAX_LENGTH,
    ),
  };

  return {
    labels,
    items: [
      { label: labels.home, href: "/" },
      { label: labels.catalog, href: "/catalogo" },
      { label: labels.about, href: "/nosotros" },
      { label: labels.contact, href: "/contacto" },
    ],
  };
}

export function isPublicNavigationActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/catalogo") {
    return (
      pathname.startsWith("/catalogo") ||
      pathname.startsWith("/categoria") ||
      pathname.startsWith("/producto")
    );
  }

  return pathname === href || pathname.startsWith(href + "/");
}
