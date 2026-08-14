import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/admin/session';
import { findAdminUserByDocumentId } from '@/lib/admin/strapi-admin';
import { AdminHeader } from '@/components/AdminHeader';
import { Breadcrumb } from './productos/Breadcrumb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/productos', label: 'Productos' },
  { href: '/admin/productos/nuevo', label: '+ Nuevo producto' },
  { href: '/admin/productos/importar', label: 'Importar (Excel)' },
  { href: '/admin/categorias', label: 'Categorías' },
  { href: '/admin/importaciones', label: 'Historial Excel' },
  // Leads inbox: contact-form submissions the admin marks as managed
  // (new → notified) or removes from the panel.
  { href: '/admin/leads', label: 'Leads' },
  // Batch 2: marketing-section editors. Order mirrors the visual order
  // on the public page (hero first, then about, then contact CTA,
  // then footer) so the sidebar reads top-to-bottom in the same
  // rhythm as the consumer-facing site.
  { href: '/admin/hero', label: 'Hero' },
  { href: '/admin/about', label: 'Nosotros (about)' },
  { href: '/admin/contacto-cta', label: 'Contacto CTA' },
  { href: '/admin/footer', label: 'Footer' },
  { href: '/admin/ajustes', label: 'Ajustes' },
];

/**
 * Shared chrome for every page under `/admin` (except `/admin/login`,
 * which intentionally renders its own focused two-column layout).
 *
 * Responsibilities:
 *   - Enforce authentication (redirect to /admin/login if no session).
 *   - Render the responsive brand header and mobile navigation.
 *   - Render the sidebar nav on desktop.
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

  const sidebarLinkClass =
    't-mono block px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-ink hover:bg-cream-soft/60';

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

      <AdminHeader user={{ name: user.name, role: user.role }} navItems={NAV_ITEMS} />

      {/* Body grid: sidebar on desktop, content full-width below it. */}
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 px-0 sm:px-10 lg:grid-cols-[16rem_1fr] lg:px-16">
        {/* Sidebar nav (desktop). */}
        <aside
          aria-label="Navegación del panel"
          className="hidden border-r border-ink-line py-10 lg:block"
        >
          <nav aria-label="Secciones del panel">
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href as never}
                    className={sidebarLinkClass}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content column. */}
        <div>
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
