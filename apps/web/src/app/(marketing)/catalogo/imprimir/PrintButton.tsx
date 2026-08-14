"use client";

/**
 * PrintButton — the only interactive piece of /catalogo/imprimir.
 * Triggers the browser print dialog so the visitor can save the page
 * as a PDF ("Guardar como PDF" in the print dialog). The catalog
 * content itself is rendered entirely on the server, so printing works
 * even when JavaScript is disabled (the button is simply hidden).
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-3 bg-ink px-6 py-3 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep"
    >
      Imprimir / Guardar PDF
      <span aria-hidden>→</span>
    </button>
  );
}
