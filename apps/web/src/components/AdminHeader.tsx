"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { MobileMenu, type NavItem } from "./MobileMenu";

type AdminHeaderProps = {
  user: {
    name: string;
    role: string;
  };
  navItems: NavItem[];
};

function isActive(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminHeader({ user, navItems }: AdminHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ink-line bg-paper lg:static">
        <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-10 lg:min-h-20 lg:px-16">
          <Link
            href={'/admin' as never}
            className="t-display text-xl font-semibold tracking-tight text-ink"
          >
            Ene Muebles
          </Link>
          <p className="hidden t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute sm:block">
            Panel · {user.name}
          </p>
          <nav
            aria-label="Acciones de sesión"
            className="ml-auto hidden items-center gap-4 lg:flex"
          >
            <span
              className="t-mono inline-block border border-ink-line px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-ink"
              aria-label={`Rol: ${user.role}`}
            >
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
          <button
            type="button"
            ref={menuTriggerRef}
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir navegación del panel"
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-menu"
            className="ml-auto inline-flex h-11 w-11 items-center justify-center border border-ink text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink lg:hidden"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <line x1="0" y1="3" x2="14" y2="3" />
              <line x1="0" y1="7" x2="14" y2="7" />
              <line x1="0" y1="11" x2="14" y2="11" />
            </svg>
          </button>
        </div>
      </header>
      <MobileMenu
        id="admin-mobile-menu"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={navItems}
        pathname={pathname}
        isActive={isActive}
        brand="Ene Muebles"
        menuLabel="Navegación del panel"
        footer={
          <>
            <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
              Panel · {user.name} · {user.role}
            </p>
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="t-label inline-flex min-h-11 items-center text-ink underline-offset-[6px] hover:text-taupe-deep hover:underline"
              >
                Cerrar sesión
              </button>
            </form>
          </>
        }
        triggerRef={menuTriggerRef}
      />
    </>
  );
}
