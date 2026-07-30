import { FooterBlockForm } from './FooterBlockForm';
import { resolveSection, sectionFallbacks } from '@/lib/strapi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Footer · Ene Muebles',
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');
const TOKEN = process.env.STRAPI_API_TOKEN ?? '';

type FooterResponse = {
  data: FooterShape | null;
};

type FooterShape = {
  copyrightText?: string;
  tagline?: string;
  legalSnippet?: string;
};

/**
 * Read the `footer-block` singleton with the admin token and apply
 * the same fallback the public read helper applies when Strapi
 * responds with `data: null` or an empty object. Exported so the
 * matching test (see `page.test.ts`) can exercise the fallback
 * contract without rendering the page.
 */
export async function getFooterBlock(): Promise<FooterShape> {
  try {
    const res = await fetch(`${STRAPI}/api/footer-block`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) return sectionFallbacks.footer();
    const json = (await res.json().catch(() => null)) as FooterResponse | null;
    return resolveSection(json?.data ?? null, sectionFallbacks.footer());
  } catch {
    return sectionFallbacks.footer();
  }
}

/**
 * Admin editor for the public site footer. The four column-header
 * labels stay on `@ene/ui-tokens`; the legal routes /terminos and
 * /privacidad remain static pages. The three fields here are the
 * pieces of copy that the editor actually owns.
 */
export default async function AdminFooterPage() {
  const setting = await getFooterBlock();

  return (
    <div
      aria-label="Editor del footer"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div aria-label="Cabecera del footer" className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Contenido del sitio
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Footer del sitio</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Línea de copyright, frase promesa del strip superior y el
          eslogan de cierre. Las páginas legales (/terminos, /privacidad)
          son rutas estáticas y no se editan aquí.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <FooterBlockForm
          initial={{
            copyrightText: setting.copyrightText ?? '',
            tagline: setting.tagline ?? '',
            legalSnippet: setting.legalSnippet ?? '',
          }}
        />
      </div>
    </div>
  );
}
