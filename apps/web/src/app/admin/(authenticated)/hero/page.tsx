import { HeroSectionForm } from './HeroSectionForm';
import { resolveSection, sectionFallbacks } from '@/lib/strapi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Hero · Ene Muebles',
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');
const TOKEN = process.env.STRAPI_API_TOKEN ?? '';

type HeroResponse = {
  data: HeroShape | null;
};

type HeroShape = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

/**
 * Read the `hero-section` singleton with the admin token and apply
 * the same fallback the public read helper applies when Strapi
 * responds with `data: null` or an empty object. Exported so the
 * matching test (see `page.test.ts`) can exercise the fallback
 * contract without rendering the page.
 */
export async function getHeroSection(): Promise<HeroShape> {
  try {
    const res = await fetch(`${STRAPI}/api/hero-section?populate=*`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) return sectionFallbacks.hero();
    const json = (await res.json().catch(() => null)) as HeroResponse | null;
    return resolveSection(json?.data ?? null, sectionFallbacks.hero());
  } catch {
    return sectionFallbacks.hero();
  }
}

/**
 * Admin editor for the `hero-section` singleton. Image upload is
 * deliberately out of scope for this batch — it lives behind the same
 * dedicated upload flow as `SiteSettingForm.heroImage` and product
 * images. The form edits copy + CTA targets only.
 */
export default async function AdminHeroPage() {
  const setting = await getHeroSection();

  return (
    <div
      aria-label="Editor del hero"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div aria-label="Cabecera del hero" className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Contenido del sitio
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Hero de la portada</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Eyebrow, título, bajada y los dos botones (CTA principal + secundario).
          Afecta solo a la página de inicio.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <HeroSectionForm
          initial={{
            eyebrow: setting.eyebrow ?? '',
            title: setting.title ?? '',
            subtitle: setting.subtitle ?? '',
            primaryCtaLabel: setting.primaryCtaLabel ?? '',
            primaryCtaHref: setting.primaryCtaHref ?? '',
            secondaryCtaLabel: setting.secondaryCtaLabel ?? '',
            secondaryCtaHref: setting.secondaryCtaHref ?? '',
          }}
        />
      </div>
    </div>
  );
}
