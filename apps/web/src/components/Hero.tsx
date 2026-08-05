"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getPublicRut, type HeroSection, type SiteSetting } from "@/lib/strapi";
import { site } from "@ene/ui-tokens";

type HeroProps = {
  settings: SiteSetting;
  /**
   * Batch 2: hero copy and CTA targets come from the Strapi
   * `hero-section` singleton (always returns a typed fallback). The
   * legacy `settings.heroImage` and `settings.tagline` keep working
   * as a bottom-of-the-chain fallback for environments where the
   * singleton has not been seeded yet.
   */
  section?: HeroSection;
  /**
   * B2 batch 2 fix: opt-out for the hero's secondary CTA. The home
   * page already has a near-the-end WhatsApp CTA in the dark
   * `ContactCTA` block; rendering the secondary "Solicitar
   * cotización" anchor in the hero would stack two same-intent CTAs
   * ~1900 px apart. Other pages (`/contacto`, `/nosotros`) keep the
   * secondary CTA — they don't have a terminal dark block.
   */
  omitSecondaryCta?: boolean;
};

/**
 * Hero — type-driven identity statement.
 *
 * Single source of authority: the display serif headline. No kicker above
 * it (the brand name already lives in the navigation). One photo element
 * if a hero image is resolved; otherwise a typographic "system
 * card" that doubles as a brand-spec readout. The bottom rail is a mono
 * one-liner that consolidates the proof points.
 */

const HERO_GALLERY = [
  "/images/4.webp",
  "/images/6.webp",
  "/images/3_1.webp",
];

export function Hero({ settings, section, omitSecondaryCta = false }: HeroProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_GALLERY.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  const eyebrow = section?.eyebrow ?? `${site.brand} · Proveedor institucional`;
  const headline = section?.title?.trim() || settings.tagline?.trim() || site.promise;
  const subtitle =
    section?.subtitle ??
    "Sillas, escritorios, estanterías y mesones para colegios, universidades, municipalidades y oficinas. Melamina 18 mm, cantos PVC termosellados, estructura reforzada. Catálogo certificado, despacho desde la región de Valparaíso hasta Los Lagos y garantía escrita.";
  const primaryLabel = section?.primaryCtaLabel ?? site.catalogAll;
  const primaryHref = section?.primaryCtaHref ?? "/catalogo";
  const secondaryLabel = section?.secondaryCtaLabel ?? site.quoteCta;
  const secondaryHref = section?.secondaryCtaHref ?? "#contacto";
  const image = section?.image ?? settings.heroImage ?? null;
  const hasPhoto = Boolean(image?.url);

  return (
    <section aria-labelledby="hero-heading" className="relative isolate bg-paper">
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-16 px-6 pt-28 pb-20 sm:px-10 sm:pt-32 sm:pb-24 lg:grid-cols-12 lg:gap-12 lg:px-16 lg:pt-40 lg:pb-28">
        {/* Type block — 7 of 12 cols on desktop. */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-3">
            <span className="block h-px w-10 bg-ink" aria-hidden />
            <span className="t-label text-ink">{eyebrow}</span>
          </div>

          <h1
            id="hero-heading"
            className="t-display mt-10 max-w-[18ch] text-[clamp(2.75rem,1.25rem+5.5vw,5.5rem)] text-ink"
          >
            {headline}
          </h1>

          <p className="t-body mt-10 max-w-[52ch] text-lg text-ink-mute sm:text-xl">{subtitle}</p>

          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href={(primaryHref || "/catalogo") as never}
              className="group inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep"
            >
              {primaryLabel}
              <span
                aria-hidden
                className="transition-transform duration-500 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
            {!omitSecondaryCta && secondaryLabel ? (
              <Link
                href={(secondaryHref || "#contacto") as never}
                className="text-sm font-medium uppercase tracking-[0.18em] text-ink underline-offset-[6px] transition-colors hover:text-taupe-deep hover:underline tap-target"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>

        {/* Visual block — 5 of 12 cols on desktop. */}
        <div className="lg:col-span-5">
          <div className="relative ml-auto w-full max-w-xl">
            {hasPhoto ? (
              <figure className="img-zoom relative aspect-[4/5] w-full overflow-hidden">
                <Image
                  src={image!.url}
                  alt={image!.alternativeText || site.brand}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  priority
                  className="object-cover"
                />
                <figcaption className="t-mono absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink/85 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-paper">
                  <span>Catálogo 2026</span>
                  <span className="opacity-60">F.05</span>
                </figcaption>
              </figure>
            ) : (
              <div className="relative aspect-[4/5] w-full overflow-hidden border border-ink bg-paper-pure group">
                {HERO_GALLERY.map((src, idx) => (
                  <Image
                    key={src}
                    src={src}
                    alt={`${site.brand} galería ${idx + 1}`}
                    fill
                    className={`object-cover transition-opacity duration-1000 ${
                      idx === currentImageIndex ? "opacity-100" : "opacity-0"
                    }`}
                    priority={idx === 0}
                  />
                ))}
                <div className="t-mono absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink/85 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-paper">
                  <span>Galería de Productos</span>
                  <span className="opacity-60">
                    {currentImageIndex + 1} / {HERO_GALLERY.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom rail — mono proof line. */}
      <div className="border-t border-ink-line">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-8 gap-y-2 px-6 py-5 sm:px-10 lg:px-16">
          <span className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
            {site.dispatch}
          </span>
          <span className="t-mono ml-auto text-[11px] uppercase tracking-[0.22em] text-ink-soft">
            Santiago · Chile
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * SystemCard — typographic placeholder used when no hero image is set.
 * Functions as a brand-spec readout: brand name, contact essence, RUT-lite.
 */
function SystemCard({ settings }: { settings: SiteSetting }) {
  const rut = getPublicRut(settings.rut);

  return (
    <aside
      className="relative aspect-[4/5] w-full overflow-hidden border border-ink bg-paper-pure"
      aria-label={`${site.brand} — datos`}
    >
      <div className="t-mono absolute inset-x-0 top-0 flex items-center justify-between border-b border-ink-line px-5 py-3 text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        <span>F.01</span>
        <span>Catálogo 2026</span>
      </div>

      <div className="flex h-full flex-col justify-between p-7 pt-16">
        <div>
          <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">Proveedor</p>
          <p className="t-h2 mt-2 text-3xl text-ink sm:text-4xl">{settings.siteName}</p>
          {rut ? (
            <p className="t-mono mt-3 text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
              {`RUT ${rut}`}
            </p>
          ) : null}
        </div>

        <div className="border-y border-ink-line py-5">
          <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
            Pliego público
          </p>
          <p className="t-h3 mt-2 text-base text-ink">
            Muebles certificados bajo normativa vigente. Ficha técnica y declaración de materiales
            por escrito.
          </p>
        </div>

        <dl className="space-y-3">
          {settings.contactPhone ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">Tel</dt>
              <dd className="t-mono text-sm text-ink">{settings.contactPhone}</dd>
            </div>
          ) : null}
          {settings.contactEmail ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                Email
              </dt>
              <dd className="t-mono text-sm text-ink">{settings.contactEmail}</dd>
            </div>
          ) : null}
          {settings.businessHours ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                Horario
              </dt>
              <dd className="t-mono text-sm text-ink">{settings.businessHours}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </aside>
  );
}
