import { NextResponse } from "next/server";
import { getCatalogSnapshot } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/catalog/export
 *   Download the bounded active/published catalog snapshot as JSON. The route
 *   remains a technical compatibility surface; public visibility is handled
 *   separately by the catalog UI work unit.
 *
 *   Consumer audit (2026-08-21): repository search found no non-UI consumer.
 *   Deployment inventory is not available from source, so owner approval is
 *   still required before deleting this breaking API surface.
 */
export async function GET() {
  try {
    const snapshot = await getCatalogSnapshot();
    return NextResponse.json(snapshot.products, {
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
