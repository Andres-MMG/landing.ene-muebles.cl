import Link from "next/link";
import { getServerSession } from "@/lib/admin/session";
import { ImportarProductosForm } from "./ImportarProductosForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Importar productos · Ene Muebles",
  robots: { index: false, follow: false },
};

export default async function ImportProductsPage() {
  const session = await getServerSession();
  const allowed = session?.role === "owner";

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
      <header className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe">
          Importación de catálogo
        </p>
        <h1 className="t-display mt-3 text-4xl">Importar productos</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-mute">
          Revisá y corregí el catálogo antes de enviarlo. El archivo se procesa únicamente en este
          navegador.
        </p>
      </header>
      <div className="mt-10">
        {allowed ? (
          <ImportarProductosForm />
        ) : (
          <div className="border border-ink-line bg-paper-pure p-8">
            <p>No tenés permisos para importar catálogos. Esta acción está reservada al dueño.</p>
            <Link
              href="/admin/productos"
              className="mt-4 inline-block underline underline-offset-4"
            >
              Volver al panel
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
