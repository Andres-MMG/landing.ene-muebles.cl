import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Acceso · Ene Muebles',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ from?: string | string[]; expired?: string | string[] }>;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const rawFrom = sp.from;
  const from = Array.isArray(rawFrom) ? rawFrom[0] : rawFrom;
  // Defense in depth: only allow internal redirects.
  const safeFrom =
    from && from.startsWith('/admin') && !from.startsWith('//') ? from : null;

  const rawExpired = sp.expired;
  const expiredValue = Array.isArray(rawExpired) ? rawExpired[0] : rawExpired;
  const expired = expiredValue === '1';

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-2">
        {/* Visual side — institutional reference photo. */}
        <aside
          aria-hidden
          className="relative hidden bg-ink lg:block"
        >
          <div className="flex h-full flex-col justify-between p-12 text-paper">
            <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
              Catálogo institucional · 2026
            </p>
            <div>
              <p className="t-display text-5xl leading-[0.95] text-paper">
                Panel de administración
              </p>
              <p className="t-mono mt-6 max-w-[36ch] text-sm text-paper-mute-on-ink">
                Acceso restringido al equipo autorizado de Ene Muebles.
                Cualquier uso no autorizado queda registrado en los logs del
                servidor.
              </p>
            </div>
            <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
              Regiones desde Valparaíso hasta Los Lagos · 7–15 d.h.
            </p>
          </div>
        </aside>

        {/* Form side. */}
        <section className="flex items-center px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
          <div className="w-full max-w-md">
            <header className="mb-12">
              <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
                Panel de administración
              </p>
              <h1 className="t-display mt-3 text-3xl text-ink">Ene Muebles</h1>
              <p className="t-mono mt-4 text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
                Iniciar sesión
              </p>
            </header>

            <LoginForm from={safeFrom ?? ''} expired={expired} />

            <p className="mt-12 border-t border-ink-line pt-6 text-sm text-ink-mute">
              Si perdiste el acceso, escribinos a{' '}
              <a
                href="mailto:contacto@ene-muebles.cl"
                className="text-ink underline-offset-[6px] hover:underline"
              >
                contacto@ene-muebles.cl
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
