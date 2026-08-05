import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/catalog/export
 *   Download every active product as a JSON file (all pages, no
 *   pagination truncation). Used by the "Descargar catálogo JSON"
 *   link on the public catalog page. `no-store` keeps intermediaries
 *   from caching the snapshot; the upstream Strapi read still honors
 *   the shared 60s revalidate window.
 */
export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json(products, {
      headers: {
        "Content-Disposition": 'attachment; filename="catalogo-ene-muebles.json"',
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.warn("[catalog/export] failed to generate catalog:", err);
    return NextResponse.json(
      { error: "No se pudo generar el catálogo." },
      { status: 502 },
    );
  }
}
