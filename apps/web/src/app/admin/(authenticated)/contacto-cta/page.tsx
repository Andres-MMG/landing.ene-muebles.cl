import { ContactCtaSectionForm } from './ContactCtaSectionForm';
import { resolveSection, sectionFallbacks } from '@/lib/strapi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Contacto CTA · Ene Muebles',
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');
const TOKEN = process.env.STRAPI_API_TOKEN ?? '';

type ContactCtaResponse = {
  data: ContactCtaShape | null;
};

type ContactCtaShape = {
  title?: string;
  body?: string;
  buttonLabel?: string;
  buttonHref?: string;
};

/**
 * Read the `contact-cta-section` singleton with the admin token and
 * apply the same fallback the public read helper applies when
 * Strapi responds with `data: null` or an empty object. Exported so
 * the matching test (see `page.test.ts`) can exercise the fallback
 * contract without rendering the page.
 */
export async function getContactCtaSection(): Promise<ContactCtaShape> {
  try {
    const res = await fetch(`${STRAPI}/api/contact-cta-section`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) return sectionFallbacks.contactCta();
    const json = (await res.json().catch(() => null)) as ContactCtaResponse | null;
    return resolveSection(json?.data ?? null, sectionFallbacks.contactCta());
  } catch {
    return sectionFallbacks.contactCta();
  }
}

/**
 * Admin editor for the dark contact call-to-action block that closes
 * the home page and the /contacto page. The CTA href is optional:
 * when left empty the public component builds a WhatsApp link from
 * `settings.whatsappNumber`. Setting an explicit href (e.g. a
 * mailto: or an external URL) overrides that behavior.
 */
export default async function AdminContactCtaPage() {
  const setting = await getContactCtaSection();

  return (
    <div
      aria-label="Editor del bloque 'contacto CTA'"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div aria-label="Cabecera del contacto CTA" className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Contenido del sitio
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Bloque «Contacto CTA»</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Bloque oscuro de cierre en / y /contacto. Si dejas la URL vacía,
          el botón redirige a WhatsApp (usando el número del sitio).
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <ContactCtaSectionForm
          initial={{
            title: setting.title ?? '',
            body: setting.body ?? '',
            buttonLabel: setting.buttonLabel ?? '',
            buttonHref: setting.buttonHref ?? '',
          }}
        />
      </div>
    </div>
  );
}
