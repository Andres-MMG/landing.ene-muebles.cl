"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { productListReturnTarget } from "../_lib/productListState";

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

function buildCrumbs(pathname: string, productListHref = "/admin/productos"): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);

  // Not under /admin or on the login page: render nothing.
  if (segments[0] !== "admin" || segments[1] === "login") {
    return [];
  }

  // /admin (dashboard)
  if (segments.length === 1) {
    return [{ label: "Productos", href: "/admin/productos" }];
  }

  // /admin/productos (deep-link to index; same as dashboard)
  if (segments.length === 2 && segments[1] === "productos") {
    return [{ label: "Productos", href: "/admin/productos" }];
  }

  // /admin/productos/nuevo
  if (segments.length === 3 && segments[1] === "productos" && segments[2] === "nuevo") {
    return [{ label: "Productos", href: productListHref }, { label: "Nuevo" }];
  }

  // /admin/productos/importar
  if (segments.length === 3 && segments[1] === "productos" && segments[2] === "importar") {
    return [{ label: "Productos", href: "/admin/productos" }, { label: "Importar (Excel)" }];
  }

  // /admin/productos/:id (and any other deeper path under productos)
  if (segments.length >= 3 && segments[1] === "productos") {
    return [{ label: "Productos", href: productListHref }, { label: "Editar" }];
  }

  // /admin/categorias (index)
  if (segments.length === 2 && segments[1] === "categorias") {
    return [
      { label: "Productos", href: "/admin/productos" },
      { label: "Categorías", href: "/admin/categorias" },
    ];
  }

  // /admin/categorias/nuevo
  if (segments.length === 3 && segments[1] === "categorias" && segments[2] === "nuevo") {
    return [
      { label: "Productos", href: "/admin/productos" },
      { label: "Categorías", href: "/admin/categorias" },
      { label: "Nueva" },
    ];
  }

  // /admin/categorias/:id
  if (segments.length >= 3 && segments[1] === "categorias") {
    return [
      { label: "Productos", href: "/admin/productos" },
      { label: "Categorías", href: "/admin/categorias" },
      { label: "Editar" },
    ];
  }

  // /admin/ajustes
  if (segments.length === 2 && segments[1] === "ajustes") {
    return [{ label: "Productos", href: "/admin/productos" }, { label: "Ajustes" }];
  }

  // Batch 2: marketing-section breadcrumb branches. Same shape as
  // the existing single-segment leaves (one deep link to the parent
  // dashboard plus the current page label).
  if (segments.length === 2 && segments[1] === "hero") {
    return [{ label: "Productos", href: "/admin/productos" }, { label: "Hero" }];
  }
  if (segments.length === 2 && segments[1] === "about") {
    return [{ label: "Productos", href: "/admin/productos" }, { label: "Nosotros (about)" }];
  }
  if (segments.length === 2 && segments[1] === "contacto-cta") {
    return [{ label: "Productos", href: "/admin/productos" }, { label: "Contacto CTA" }];
  }
  if (segments.length === 2 && segments[1] === "footer") {
    return [{ label: "Productos", href: "/admin/productos" }, { label: "Footer" }];
  }

  return [];
}

export function Breadcrumb() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const crumbs = buildCrumbs(pathname, productListReturnTarget(searchParams.get("from")));

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Ruta" className="border-b border-ink-line bg-paper-soft/40">
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
                  className={isLast ? "text-taupe-deep" : "text-ink-mute"}
                  aria-current={isLast ? "page" : undefined}
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
