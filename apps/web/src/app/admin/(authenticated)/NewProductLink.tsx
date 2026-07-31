"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DEFAULT_HREF = "/admin/productos/nuevo";

function createProductHref(from: string): string {
  return `${DEFAULT_HREF}?from=${encodeURIComponent(from)}`;
}

export function NewProductLink({ initialFrom }: { initialFrom: string }) {
  const [href, setHref] = useState(() => createProductHref(initialFrom));

  useEffect(() => {
    const syncHref = () => {
      const from = `${window.location.pathname}${window.location.search}`;
      setHref(createProductHref(from));
    };
    syncHref();
    window.addEventListener("admin-product-list-state", syncHref);
    return () => window.removeEventListener("admin-product-list-state", syncHref);
  }, []);

  return (
    <Link
      href={href as never}
      className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep"
    >
      + Nuevo producto
      <span aria-hidden>→</span>
    </Link>
  );
}
