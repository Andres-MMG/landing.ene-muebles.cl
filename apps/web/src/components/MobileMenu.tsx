"use client";

import Link from "next/link";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
} from "react";

export type NavItem = { label: string; href: string };

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  pathname: string;
  isActive: (pathname: string, href: string) => boolean;
  whatsappHref?: string | null;
  contactPhone?: string;
  contactEmail?: string;
  brand?: string;
  menuLabel?: string;
  footer?: ReactNode;
  id?: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

function canRestoreFocus(trigger: HTMLButtonElement | null): trigger is HTMLButtonElement {
  if (!trigger || !trigger.isConnected || !trigger.ownerDocument.contains(trigger) || trigger.disabled) {
    return false;
  }

  const window = trigger.ownerDocument.defaultView;
  const styles = window?.getComputedStyle(trigger);

  if (
    !styles ||
    styles.display === "none" ||
    styles.visibility === "hidden" ||
    styles.visibility === "collapse"
  ) {
    return false;
  }

  return trigger.getClientRects().length > 0;
}

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
  brand,
  menuLabel = "Menú",
  footer,
  id = "mobile-menu",
  triggerRef,
}: MobileMenuProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    isClosingRef.current = false;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const menuTrigger = triggerRef.current;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    const computedBodyPaddingRight = Number.parseFloat(
      window.getComputedStyle(body).paddingRight,
    );

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${computedBodyPaddingRight + scrollbarWidth}px`;
    }
    closeButtonRef.current?.focus();

    return () => {
      isClosingRef.current = true;
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
      if (canRestoreFocus(menuTrigger)) {
        menuTrigger.focus();
      }
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;

    const getFocusableElements = (): HTMLElement[] =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        e.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    const containFocus = (event: FocusEvent) => {
      if (isClosingRef.current) return;
      if (menuRef.current?.contains(event.target as Node)) return;
      closeButtonRef.current?.focus();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", containFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", containFocus);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
    >
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/20"
      />
      <div
        ref={menuRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={menuLabel}
        className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-paper"
      >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-line px-6 sm:px-10">
        <span className={brand ? "t-display text-lg font-semibold tracking-tight text-ink" : "t-overline text-ink-mute"}>
          {brand ?? menuLabel}
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

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-8 sm:px-10">
        <ul className="divide-y divide-ink-line">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href as never}
                  onClick={onClose}
                  className={`t-mono flex min-h-[44px] items-center py-3 text-base sm:text-lg transition-colors hover:text-ink ${
                    active ? "text-ink" : "text-ink-mute"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto space-y-5 border-t border-ink-line pt-6">
          {footer ? (
            footer
          ) : whatsappHref || contactPhone || contactEmail ? (
              <>
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
              <span className="t-overline text-ink-mute">
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
              <span className="t-overline text-ink-mute">
                Email
              </span>
              <span className="mt-1 block">{contactEmail}</span>
            </a>
                ) : null}
              </>
          ) : null}
        </div>
      </nav>
      </div>
    </div>
  );
}
