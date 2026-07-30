import { AboutSectionForm } from './AboutSectionForm';
import { resolveSection, sectionFallbacks } from '@/lib/strapi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Nosotros (about) · Ene Muebles',
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');
const TOKEN = process.env.STRAPI_API_TOKEN ?? '';

type AboutResponse = {
  data: AboutShape | null;
};

type AboutShape = {
  eyebrow?: string;
  title?: string;
  intro?: string;
  body?: string;
  // B2 batch 2 fix: label (kicker) and heading (h2) are separate fields.
  missionLabel?: string;
  missionHeading?: string;
  missionBody?: string;
  visionLabel?: string;
  visionHeading?: string;
  visionBody?: string;
  valuesLabel?: string;
  valuesHeading?: string;
  values?: Array<{ title?: string; body?: string }>;
};

/**
 * Read the `about-section` singleton with the admin token and apply
 * the same fallback the public read helper applies when Strapi
 * responds with `data: null` or an empty object. Exported so the
 * matching test (see `page.test.ts`) can exercise the fallback
 * contract without rendering the page.
 */
export async function getAboutSection(): Promise<AboutShape> {
  try {
    const res = await fetch(`${STRAPI}/api/about-section?populate=*`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) return sectionFallbacks.about();
    const json = (await res.json().catch(() => null)) as AboutResponse | null;
    return resolveSection(json?.data ?? null, sectionFallbacks.about());
  } catch {
    return sectionFallbacks.about();
  }
}

const EMPTY_VALUES = {
  eyebrow: '',
  title: '',
  intro: '',
  body: '',
  missionLabel: '',
  missionHeading: '',
  missionBody: '',
  visionLabel: '',
  visionHeading: '',
  visionBody: '',
  valuesLabel: '',
  valuesHeading: '',
  values: [
    { title: '', body: '' },
    { title: '', body: '' },
    { title: '', body: '' },
    { title: '', body: '' },
  ],
} as const;

export default async function AdminAboutPage() {
  const setting = await getAboutSection();

  return (
    <div
      aria-label="Editor de la sección 'sobre nosotros'"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div
        aria-label="Cabecera de about"
        className="border-b border-ink-line pb-8"
      >
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Contenido del sitio
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Sección «Nosotros»</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Eyebrow, título, intro, cuerpo, misión, visión y los cuatro
          compromisos por escrito. Afecta a la página de inicio y a /nosotros.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <AboutSectionForm
          initial={{
            eyebrow: setting.eyebrow ?? '',
            title: setting.title ?? '',
            intro: setting.intro ?? '',
            body: setting.body ?? '',
            missionLabel: setting.missionLabel ?? '',
            missionHeading: setting.missionHeading ?? '',
            missionBody: setting.missionBody ?? '',
            visionLabel: setting.visionLabel ?? '',
            visionHeading: setting.visionHeading ?? '',
            visionBody: setting.visionBody ?? '',
            valuesLabel: setting.valuesLabel ?? '',
            valuesHeading: setting.valuesHeading ?? '',
            values: (() => {
              const stored = setting.values ?? [];
              const out = [
                ...stored,
                ...EMPTY_VALUES.values,
              ].slice(0, 4).map((v) => ({ title: v.title ?? '', body: v.body ?? '' }));
              while (out.length < 4) out.push({ title: '', body: '' });
              return out;
            })(),
          }}
        />
      </div>
    </div>
  );
}
