"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type NavItem = { label: string; href: string };

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  pathname: string;
  isActive: (pathname: string, href: string) => boolean;
  whatsappHref?: string | null;
  contactPhone?: string;
  contactEmail?: string;
};

/**
 * MobileMenu — full-screen overlay.
 *
 * Closes on backdrop click, on link click, and on Escape. Locks body
 * scroll while open. Reduced-motion respected: no transition when the
 * user has the OS preference set.
 */
export function MobileMenu({
  open,
  onClose,
  items,
  pathname,
  isActive,
  whatsappHref,
  contactPhone,
  contactEmail,
}: MobileMenuProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      html.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menú"
      aria-hidden={!open}
      className={`fixed inset-0 z-50 bg-paper transition-opacity duration-300 ease-out-quint ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-ink-line px-6 sm:px-10">
        <span className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">
          Menú
        </span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="inline-flex h-11 w-11 items-center justify-center border border-ink text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <line x1="0" y1="0" x2="12" y2="12" />
            <line x1="12" y1="0" x2="0" y2="12" />
          </svg>
        </button>
      </div>

      <nav className="flex h-[calc(100vh-4rem)] flex-col px-6 py-12 sm:px-10">
        <ul className="space-y-6">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href as never}
                  onClick={onClose}
                  className={`t-display block min-h-[44px] py-2 text-[clamp(2.5rem,1.5rem+5vw,4rem)] leading-none ${
                    active ? "text-ink" : "text-ink-mute"
                  } transition-colors hover:text-taupe-deep`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                  <span className="ml-4 align-middle text-[11px] uppercase tracking-[0.22em] text-ink-soft">
                    {String(items.indexOf(item) + 1).padStart(2, "0")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto space-y-5 border-t border-ink-line pt-6">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-ink px-6 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors hover:bg-taupe-deep"
            >
              Hablar por WhatsApp
              <span aria-hidden>→</span>
            </a>
          ) : null}
          {contactPhone ? (
            <a
              href={`tel:${contactPhone.replace(/\s/g, "")}`}
              className="t-mono block min-h-[44px] py-2 text-base text-ink"
            >
              <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                Tel
              </span>
              <span className="mt-1 block">{contactPhone}</span>
            </a>
          ) : null}
          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              className="t-mono block min-h-[44px] py-2 text-base text-ink"
            >
              <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                Email
              </span>
              <span className="mt-1 block">{contactEmail}</span>
            </a>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
