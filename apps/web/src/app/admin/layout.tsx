import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/admin/session';
import { findAdminUserByDocumentId } from '@/lib/admin/strapi-admin';
import { Breadcrumb } from './productos/Breadcrumb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Shared chrome for every page under `/admin` (except `/admin/login`,
 * which intentionally renders its own focused two-column layout).
 *
 * Responsibilities:
 *   - Enforce authentication (redirect to /admin/login if no session).
 *   - Render the brand header (wordmark + user.name + role pill + logout form).
 *   - Render the sidebar nav (md+) and the stacked-tabs nav (sm).
 *   - Mount a skip-link as the first focusable element on the page.
 *   - Render the breadcrumb above the page content.
 *
 * Pages rendered inside this layout MUST NOT render their own <header>
 * or <main> — those are owned here. The pages are expected to render
 * their own inner content wrapper (the `mx-auto w-full max-w-[1440px]`
 * container used today).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth: middleware also redirects unauthenticated users,
  // but server layouts run on every render and a redirect here is the
  // last line before the React tree mounts.
  const session = await getServerSession();
  if (!session) {
    redirect('/admin/login' as never);
  }
  const user = await findAdminUserByDocumentId(session.sub);
  if (!user || !user.active) {
    redirect('/admin/login' as never);
  }

  const rolePillClass =
    't-mono inline-block border border-ink-line px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-ink';

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Skip-link: first focusable element on the page so a keyboard
          user can jump past the chrome straight to the main content. */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Saltar al contenido
      </a>

      {/* Brand header. */}
      <header className="border-b border-ink-line">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-6 px-6 py-6 sm:px-10 lg:px-16">
          <Link
            href={'/admin' as never}
            className="t-display text-xl font-semibold tracking-tight text-ink"
          >
            Ene Muebles
          </Link>
          <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
            Panel · {user.name}
          </p>
          <nav
            aria-label="Acciones de sesión"
            className="ml-auto flex items-center gap-4"
          >
            <span className={rolePillClass} aria-label={`Rol: ${user.role}`}>
              {user.role}
            </span>
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="t-label text-ink underline-offset-[6px] hover:text-taupe-deep hover:underline"
              >
                Cerrar sesión
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* Body grid: sidebar (md+) on the left, content on the right. */}
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 px-0 sm:px-10 md:grid-cols-[16rem_1fr] md:px-10 lg:px-16">
        {/* Sidebar nav (md+). */}
        <aside
          aria-label="Navegación del panel"
          className="hidden border-r border-ink-line py-10 md:block"
        >
          <nav aria-label="Secciones del panel">
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href={'/admin' as never}
                  className="t-mono block px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-ink hover:bg-cream-soft/60"
                >
                  Productos
                </Link>
              </li>
              <li>
                <Link
                  href={'/admin/productos/nuevo' as never}
                  className="t-mono block px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-ink hover:bg-cream-soft/60"
                >
                  + Nuevo producto
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Content column. */}
        <div>
          {/* Stacked-tabs nav (sm only). */}
          <nav
            aria-label="Secciones del panel"
            className="border-b border-ink-line md:hidden"
          >
            <ul className="flex flex-col">
              <li>
                <Link
                  href={'/admin' as never}
                  className="t-mono block px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-ink hover:bg-cream-soft/60"
                >
                  Productos
                </Link>
              </li>
              <li>
                <Link
                  href={'/admin/productos/nuevo' as never}
                  className="t-mono block px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-ink hover:bg-cream-soft/60"
                >
                  + Nuevo producto
                </Link>
              </li>
            </ul>
          </nav>

          <main
            id="admin-main"
            tabIndex={-1}
            className="min-h-[calc(100vh-5rem)] bg-paper text-ink focus:outline-none"
          >
            <Breadcrumb />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
