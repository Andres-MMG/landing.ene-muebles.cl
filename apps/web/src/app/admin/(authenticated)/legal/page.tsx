import Link from "next/link";

export const metadata = {
  title: "Páginas legales · Ene Muebles",
  robots: { index: false, follow: false },
};

export default function LegalSelectorPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
      <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
        Contenido del sitio
      </p>
      <h1 className="t-display mt-3 text-4xl text-ink">Páginas legales</h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Link
          href={"/admin/legal/terminos" as never}
          className="border border-ink-line bg-paper-pure p-8 hover:bg-cream-soft"
        >
          Términos y condiciones
        </Link>
        <Link
          href={"/admin/legal/privacidad" as never}
          className="border border-ink-line bg-paper-pure p-8 hover:bg-cream-soft"
        >
          Política de privacidad
        </Link>
      </div>
    </div>
  );
}
