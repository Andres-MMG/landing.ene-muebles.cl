import type { SiteSetting } from "@/lib/strapi";
import { site } from "@ene/ui-tokens";

type FooterProps = {
  settings: SiteSetting;
};

const socialHref = (network: string, value: string): string => {
  if (!value) return "#";
  const v = value.replace(/^@/, "");
  switch (network) {
    case "instagram":
      return `https://instagram.com/${v}`;
    case "facebook":
      return `https://facebook.com/${v}`;
    case "tiktok":
      return `https://tiktok.com/@${v}`;
    case "linkedin":
      return v.startsWith("http") ? v : `https://linkedin.com/in/${v}`;
    default:
      return v;
  }
};

/**
 * Footer — institutional data dump.
 *
 * 4-column grid: brand identity, catalog links, contact channel, legal.
 * Above the grid: a hairline divider with the brand promise stretched
 * across the width. Below: copyright + RUT/horario in mono. No social
 * icons; social handles are listed as text (industrial, not decorative).
 */
export function Footer({ settings }: FooterProps) {
  const year = new Date().getFullYear();
  const socials = settings.socialLinks ?? {};

  return (
    <footer className="bg-ink text-paper">
      {/* Promise strip. */}
      <div className="border-t border-paper-line-on-ink">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-10 lg:px-16 lg:py-12">
          <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
            {site.footerCopy}
          </p>
        </div>
      </div>

      {/* 4-column grid. */}
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-6 pt-12 pb-16 sm:px-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10 lg:px-16 lg:pt-16 lg:pb-20">
        <div className="lg:col-span-4">
          <p className="t-h2 text-3xl text-paper sm:text-4xl">
            {settings.siteName}
          </p>
          {settings.tagline ? (
            <p className="t-body mt-4 max-w-[36ch] text-base text-paper-mute-on-ink">
              {settings.tagline}
            </p>
          ) : null}
          <p className="t-mono mt-8 text-[11px] uppercase tracking-[0.22em] text-taupe">
            RUT 76.XXX.XXX-X
          </p>
        </div>

        <div className="lg:col-span-2">
          <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
            {site.footerCatalog}
          </p>
          <ul className="mt-6 space-y-3">
            <li>
              <a
                href="/catalogo"
                className="t-body text-sm text-paper transition-colors hover:text-taupe"
              >
                Ver catálogo
              </a>
            </li>
            <li>
              <a
                href="/categoria/oficina"
                className="t-body text-sm text-paper transition-colors hover:text-taupe"
              >
                Línea oficina
              </a>
            </li>
            <li>
              <a
                href="/categoria/escolar"
                className="t-body text-sm text-paper transition-colors hover:text-taupe"
              >
                Línea escolar
              </a>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
            {site.footerContact}
          </p>
          <ul className="mt-6 space-y-3 t-mono text-sm text-paper-mute-on-ink">
            {settings.contactEmail ? (
              <li>
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="transition-colors hover:text-taupe"
                >
                  {settings.contactEmail}
                </a>
              </li>
            ) : null}
            {settings.contactPhone ? (
              <li>
                <a
                  href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                  className="transition-colors hover:text-taupe"
                >
                  {settings.contactPhone}
                </a>
              </li>
            ) : null}
            {settings.whatsappNumber ? (
              <li>{settings.whatsappNumber}</li>
            ) : null}
            {settings.address ? (
              <li className="text-xs">{settings.address}</li>
            ) : null}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
            {site.footerLegal}
          </p>
          <ul className="mt-6 space-y-3 t-mono text-sm text-paper-mute-on-ink">
            <li>© {year} {settings.siteName}</li>
            <li>Proveedor institucional · Chile</li>
            {settings.businessHours ? (
              <li className="text-xs">{settings.businessHours}</li>
            ) : null}
          </ul>
          {Object.keys(socials).length > 0 ? (
            <div className="mt-8">
              <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                Redes
              </p>
              <ul className="mt-4 space-y-2 t-mono text-xs text-paper-mute-on-ink">
                {Object.entries(socials).map(([network, handle]) => {
                  if (!handle) return null;
                  return (
                    <li key={network}>
                      <a
                        href={socialHref(network, handle)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-taupe"
                      >
                        {network} · {handle}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-paper-line-on-ink">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start justify-between gap-2 px-6 py-6 sm:flex-row sm:items-center sm:px-10 lg:px-16">
          <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
            Catálogo institucional · 2026
          </p>
          <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
            Respaldo escrito · Garantía 1 año
          </p>
        </div>
      </div>
    </footer>
  );
}
