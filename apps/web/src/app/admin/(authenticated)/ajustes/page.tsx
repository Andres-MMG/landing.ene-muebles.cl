import { SiteSettingForm } from './SiteSettingForm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Ajustes · Ene Muebles',
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');
const TOKEN = process.env.STRAPI_API_TOKEN ?? '';

type SettingsResponse = {
  data: SettingsShape | null;
};

type SettingsShape = {
  siteName?: string;
  tagline?: string;
  rut?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  whatsappDefaultMessage?: string;
  address?: string;
  dispatchCoverage?: string;
  addressCity?: string;
  addressRegion?: string;
  businessHours?: string;
  aboutText?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
  };
};

/**
 * Read the `site-setting` singleton with the admin token and return
 * `null` when Strapi is unreachable or has no record yet. The admin
 * page treats `null` as "show blank inputs" so the operator can
 * type the values from scratch. Exported (re-exported below) so the
 * matching test (see `page.test.ts`) can exercise the upstream
 * payload contract without rendering the page.
 */
async function getSiteSetting(): Promise<SettingsShape | null> {
  try {
    const res = await fetch(`${STRAPI}/api/site-setting?populate=*`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as SettingsResponse | null;
    return json?.data ?? null;
  } catch {
    return null;
  }
}

// Re-exported so the matching test (see `page.test.ts`) can exercise
// the upstream-payload contract without rendering the page. The page
// wires the loader's return value into `SiteSettingForm`'s `initial`
// prop, which is verified by the static-check test in `page.test.ts`.
export { getSiteSetting };

export default async function AdminSettingsPage() {
  // Auth + user lookup are owned by the shared admin layout.
  const setting = await getSiteSetting();

  return (
    <div
      aria-label="Ajustes del sitio"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div
        aria-label="Cabecera de ajustes"
        className="border-b border-ink-line pb-8"
      >
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Configuración
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Ajustes del sitio</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Datos de marca, contacto y portada. Afectan al sitio público al
          siguiente request.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <SiteSettingForm
          initial={{
            siteName: setting?.siteName ?? '',
            tagline: setting?.tagline ?? '',
            rut: setting?.rut ?? '',
            contactEmail: setting?.contactEmail ?? '',
            contactPhone: setting?.contactPhone ?? '',
            whatsappNumber: setting?.whatsappNumber ?? '',
            whatsappDefaultMessage: setting?.whatsappDefaultMessage ?? '',
            address: setting?.address ?? '',
            dispatchCoverage: setting?.dispatchCoverage ?? '',
            addressCity: setting?.addressCity ?? '',
            addressRegion: setting?.addressRegion ?? '',
            businessHours: setting?.businessHours ?? '',
            aboutText: setting?.aboutText ?? '',
            socialInstagram: setting?.socialLinks?.instagram ?? '',
            socialFacebook: setting?.socialLinks?.facebook ?? '',
            socialLinkedIn: setting?.socialLinks?.linkedin ?? '',
            socialTiktok: setting?.socialLinks?.tiktok ?? '',
          }}
        />
      </div>
    </div>
  );
}