'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Admin-section breadcrumb. Driven by `usePathname()` so it stays in
 * sync with client-side navigation between `/admin` and
 * `/admin/productos/*` without prop-drilling the path from the server
 * layout. Matches the spec mapping in
 * `specs/admin-panel-ux/spec.md::Breadcrumb reflects current path`.
 *
 * Notes:
 *   - The product name on `/admin/productos/:id` is NOT preloaded here
 *     (it would require a client-side fetch). The spec allows the
 *     `Productos / Editar` fallback; we use it.
 *   - The login page (`/admin/login`) intentionally renders no
 *     breadcrumb so the visual is the focused login form.
 */

type Crumb = {
  label: string;
  href?: string;
};

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);

  // Not under /admin or on the login page: render nothing.
  if (segments[0] !== 'admin' || segments[1] === 'login') {
    return [];
  }

  // /admin (dashboard)
  if (segments.length === 1) {
    return [{ label: 'Productos', href: '/admin' }];
  }

  // /admin/productos (deep-link to index; same as dashboard)
  if (segments.length === 2 && segments[1] === 'productos') {
    return [{ label: 'Productos', href: '/admin' }];
  }

  // /admin/productos/nuevo
  if (
    segments.length === 3 &&
    segments[1] === 'productos' &&
    segments[2] === 'nuevo'
  ) {
    return [
      { label: 'Productos', href: '/admin' },
      { label: 'Nuevo' },
    ];
  }

  // /admin/productos/:id (and any other deeper path under productos)
  if (segments.length >= 3 && segments[1] === 'productos') {
    return [
      { label: 'Productos', href: '/admin' },
      { label: 'Editar' },
    ];
  }

  // /admin/categorias (index)
  if (segments.length === 2 && segments[1] === 'categorias') {
    return [
      { label: 'Productos', href: '/admin' },
      { label: 'Categorías', href: '/admin/categorias' },
    ];
  }

  // /admin/categorias/nuevo
  if (
    segments.length === 3 &&
    segments[1] === 'categorias' &&
    segments[2] === 'nuevo'
  ) {
    return [
      { label: 'Productos', href: '/admin' },
      { label: 'Categorías', href: '/admin/categorias' },
      { label: 'Nueva' },
    ];
  }

  // /admin/categorias/:id
  if (segments.length >= 3 && segments[1] === 'categorias') {
    return [
      { label: 'Productos', href: '/admin' },
      { label: 'Categorías', href: '/admin/categorias' },
      { label: 'Editar' },
    ];
  }

  // /admin/ajustes
  if (segments.length === 2 && segments[1] === 'ajustes') {
    return [
      { label: 'Productos', href: '/admin' },
      { label: 'Ajustes' },
    ];
  }

  return [];
}

export function Breadcrumb() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Ruta"
      className="border-b border-ink-line bg-paper-soft/40"
    >
      <ol className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-2 px-6 py-3 sm:px-10 lg:px-16">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const key = `${crumb.label}-${index}`;
          return (
            <li
              key={key}
              className="t-mono inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em]"
            >
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href as never}
                  className="text-ink-mute underline-offset-[6px] hover:text-taupe-deep hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'text-taupe-deep' : 'text-ink-mute'}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden className="text-ink-soft">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
