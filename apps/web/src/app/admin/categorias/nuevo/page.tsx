import { CategoryForm } from '../CategoryForm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Nueva categoría · Ene Muebles',
  robots: { index: false, follow: false },
};

export default async function NewCategoryPage() {
  // Auth + user lookup are owned by the shared admin layout.
  return (
    <div
      aria-label="Crear nueva categoría"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div
        aria-label="Cabecera de nueva categoría"
        className="border-b border-ink-line pb-8"
      >
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Nueva categoría
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Crear categoría</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Las imágenes se podrán cargar una vez creada la categoría.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <CategoryForm
          mode="create"
          initial={{
            name: '',
            slug: '',
            description: '',
            order: 0,
            active: true,
          }}
        />
      </div>
    </div>
  );
}