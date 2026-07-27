import { SiteSettingForm } from './SiteSettingForm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Ajustes · Ene Muebles',
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');
const TOKEN = process.env.STRAPI_API_TOKEN ?? '';

type SiteSetting = {
  brandName?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialLinkedIn?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  footerCopy?: string;
};

async function getSiteSetting(): Promise<SiteSetting | null> {
  const res = await fetch(`${STRAPI}/api/site-setting?populate=*`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as
    | { data: SiteSetting | null }
    | null;
  return json?.data ?? null;
}

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
            brandName: setting?.brandName ?? '',
            tagline: setting?.tagline ?? '',
            contactEmail: setting?.contactEmail ?? '',
            contactPhone: setting?.contactPhone ?? '',
            address: setting?.address ?? '',
            socialInstagram: setting?.socialInstagram ?? '',
            socialFacebook: setting?.socialFacebook ?? '',
            socialLinkedIn: setting?.socialLinkedIn ?? '',
            heroTitle: setting?.heroTitle ?? '',
            heroSubtitle: setting?.heroSubtitle ?? '',
            footerCopy: setting?.footerCopy ?? '',
          }}
        />
      </div>
    </div>
  );
}