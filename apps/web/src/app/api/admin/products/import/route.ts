import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/admin/session';
import {
  getStrapiAdminToken,
  createImportScope,
  type ImportRow,
  type RowResult,
} from '@/lib/admin/strapi-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(
  /\/+$/,
  ''
);

/**
 * POST /api/admin/products/import
 *
 * Bulk upsert catalog rows into Strapi. Idempotent on `externalId`:
 * re-running the same Excel returns `created: 0, updated: N`. New
 * categories and subcategories are auto-created in the same request.
 *
 * S2b adds audit-trail:
 *   1. Before any row is processed, the route creates a single
 *      `ImportBatch` record carrying `fileName`, `uploadedByEmail`,
 *      and `totalRows`.
 *   2. Every per-row product write includes
 *      `{ importSource: 'imported', importBatch: { connect: [batchDocumentId] } }`
 *      so each product is linked back to the batch.
 *   3. After the row loop, the route PUTs the same batch with the
 *      actual counters and the list of numeric product IDs touched.
 *
 *   request body:    { rows: ImportRow[] } (1 ≤ rows.length ≤ 200)
 *   request header:  x-import-file-name (optional; falls back to "unknown.xlsx")
 *   response 200:    { created, updated, failed, batch: { documentId } }
 *
 * Errors:
 *   400 — rows missing/empty/over 200 or row shape invalid
 *   401 — no admin session cookie
 *   403 — admin session is not owner
 *   503 — ImportBatch creation failed (audit-trail mandatory)
 *
 * Row-level failures (one bad row out of 200) never abort the batch;
 * each row is processed inside its own try/catch and surfaces in
 * `failed[]` with the upstream Strapi error message.
 */

const MAX_ITEMS = 200;

const ItemSchema = z
  .object({
    values: z
      .object({
        externalId: z.string().max(32).optional(),
        name: z.string().max(120).optional(),
        slug: z.string().max(200).optional(),
        description: z.string().optional(),
        shortDescription: z.string().max(280).optional(),
        price: z.number().nonnegative().optional(),
        productType: z.string().max(60).optional(),
        subcategory: z.string().max(80).optional(),
        usageEnvironment: z.string().max(200).optional(),
        observableColor: z.string().max(120).optional(),
        observableMaterial: z.string().max(200).optional(),
        catalogPage: z.number().int().positive().optional(),
        confidence: z
          .enum([
            'alta',
            'media-variante-visual',
            'media-nombre-generico-pdf',
            'revision-manual',
          ])
          .optional(),
        source: z.string().max(200).optional(),
        observation: z.string().max(1000).optional(),
      })
      .passthrough(),
    warnings: z.array(z.string()).optional(),
    categoryName: z.string().max(60).optional(),
  })
  .passthrough();

const ImportBody = z.object({
  rows: z.array(ItemSchema).min(1).max(MAX_ITEMS),
});

/** Strip undefined values so Strapi doesn't get `null` for optional
 *  fields the admin didn't send. S2b appends `importSource` and the
 *  `importBatch.connect` relation write so every product carries
 *  its provenance and points back to the audit-trail batch. */
function buildPayload(
  values: ImportRow['values'],
  categoryDocumentId: string | undefined,
  batchDocumentId: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    importSource: 'imported',
    importBatch: { connect: [batchDocumentId] },
  };
  const keys: Array<keyof ImportRow['values']> = [
    'externalId',
    'name',
    'slug',
    'description',
    'shortDescription',
    'price',
    'productType',
    'subcategory',
    'usageEnvironment',
    'observableColor',
    'observableMaterial',
    'catalogPage',
    'confidence',
    'source',
    'observation',
  ];
  for (const k of keys) {
    const v = values[k];
    if (v !== undefined && v !== '') payload[k] = v;
  }
  if (categoryDocumentId) payload.category = categoryDocumentId;
  return payload;
}

/** Pre-fetch every existing product whose externalId appears in the
 *  batch and build an `externalId -> documentId` map. One roundtrip
 *  for the whole batch instead of N per-row GETs. */
async function bulkFindProductsByExternalId(
  externalIds: string[]
): Promise<Map<string, string>> {
  if (externalIds.length === 0) return new Map();
  const csv = externalIds.map(encodeURIComponent).join(',');
  const url = `${STRAPI}/api/products?filters[externalId][$in]=${csv}&pagination[pageSize]=200`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as {
    data?: Array<{ externalId?: string; documentId?: string }>;
  } | null;
  const map = new Map<string, string>();
  for (const row of json?.data ?? []) {
    if (row.externalId && row.documentId) map.set(row.externalId, row.documentId);
  }
  return map;
}

/** Extract the numeric `id` from a Strapi product response so the
 *  counters update can cache it in `importedProductIds`. */
function readNumericId(json: unknown): number | null {
  if (!json || typeof json !== 'object') return null;
  const data = (json as { data?: { id?: number } }).data;
  return typeof data?.id === 'number' ? data.id : null;
}

/** Pull the source file name from the `x-import-file-name` header,
 *  falling back to `'unknown.xlsx'` per the S2b spec. */
function readFileName(req: NextRequest): string {
  const fromHeader = req.headers.get('x-import-file-name');
  if (fromHeader && fromHeader.trim().length > 0) return fromHeader.trim();
  return 'unknown.xlsx';
}

/** Resolve the admin user's email from their session documentId. Inline
 *  fetch (instead of `findAdminUserByDocumentId` from strapi-admin.ts)
 *  because that helper captures `TOKEN` at module load and would bypass
 *  the test's runtime token override — matches `bulkFindProductsByExternalId`. */
async function fetchAdminUserEmail(
  documentId: string
): Promise<string | undefined> {
  try {
    const res = await fetch(`${STRAPI}/api/admin-users/${documentId}`, {
      headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
      cache: 'no-store',
    });
    if (!res.ok) return undefined;
    const json = (await res.json().catch(() => null)) as {
      data?: { email?: string };
    } | null;
    return json?.data?.email ?? undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { rows: ImportRow[] };
  try {
    const parsed = ImportBody.parse(await req.json());
    body = { rows: parsed.rows as ImportRow[] };
  } catch (err) {
    const issues =
      err instanceof z.ZodError
        ? err.issues.map((i) => ({ path: i.path, message: i.message }))
        : [{ path: [], message: String(err) }];
    return NextResponse.json(
      { error: 'Datos inválidos', details: { issues } },
      { status: 400 }
    );
  }

  // S2b: resolve the admin user's email + source file name for the audit-trail batch.
  const uploadedByEmail = await fetchAdminUserEmail(session.sub);
  const fileName = readFileName(req);
  const totalRows = body.rows.length;

  const scope = createImportScope(getStrapiAdminToken);
  // The batch MUST be created before any product write so the
  // `importBatch.connect` relation resolves to an existing document.
  // If creation fails, abort with 503 — no useful partial state.
  let batchDocumentId: string;
  try {
    batchDocumentId = await scope.createImportBatch({
      fileName,
      ...(uploadedByEmail ? { uploadedByEmail } : {}),
      totalRows,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'No se pudo crear el registro de auditoría del import.',
        details: { message: err instanceof Error ? err.message : String(err) },
      },
      { status: 503 }
    );
  }

  const externalIds = body.rows
    .map((item) => item.values?.externalId)
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
  const existingByExternalId = await bulkFindProductsByExternalId(externalIds);

  const created: RowResult[] = [];
  const updated: RowResult[] = [];
  const failed: RowResult[] = [];
  const importedProductIds: number[] = [];

  for (let i = 0; i < body.rows.length; i++) {
    const item = body.rows[i];
    const resultIndex = item.sourceIndex ?? i;
    const warnings = item.warnings?.length ? item.warnings : undefined;
    try {
      const categoryName = item.categoryName;
      let categoryDocumentId: string | undefined;
      if (categoryName) {
        const cat = await scope.resolveOrCreateCategory(categoryName);
        categoryDocumentId = cat.documentId || undefined;
      }
      // Auto-create the subcategory too so the future Subcategory
      // migration can link rows by documentId instead of by name.
      if (item.values?.subcategory) {
        await scope.resolveOrCreateSubcategory({
          name: item.values.subcategory,
          categoryName: categoryName ?? '',
        });
      }
      const payload = buildPayload(item.values, categoryDocumentId, batchDocumentId);
      const ext = item.values?.externalId;
      const existingDocId = ext ? existingByExternalId.get(ext) : undefined;
      const url = existingDocId
        ? `${STRAPI}/api/products/${existingDocId}`
        : `${STRAPI}/api/products`;
      const method = existingDocId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${getStrapiAdminToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: payload }),
        cache: 'no-store',
      });
      const json = (await res.json().catch(() => null)) as
        | {
            data?: { documentId?: string; id?: number };
            error?: { message?: string; details?: { errors?: unknown[] } };
          }
        | null;
      if (res.ok) {
        const docId = json?.data?.documentId ?? existingDocId;
        const numericId = readNumericId(json);
        if (typeof numericId === 'number') importedProductIds.push(numericId);
        const row: RowResult = {
          index: resultIndex,
          importSource: 'imported',
          ...(warnings ? { warnings } : {}),
        };
        if (docId) row.documentId = docId;
        if (existingDocId) updated.push(row);
        else created.push(row);
      } else {
        const message =
          json?.error?.message ?? `Strapi returned ${res.status}`;
        failed.push({
          index: resultIndex,
          error: message,
          ...(warnings ? { warnings } : {}),
        });
      }
    } catch (err) {
      failed.push({
        index: resultIndex,
        error: err instanceof Error ? err.message : String(err),
        ...(warnings ? { warnings } : {}),
      });
    }
  }

  // S2b: write the actual counters back to the audit-trail record.
  // Best-effort — a failure here doesn't undo the import (products are
  // already linked through the relation), so log and continue. The
  // response still carries `batch.documentId` for caller lookup.
  try {
    await scope.recordBatchCounters(batchDocumentId, {
      totalRows,
      createdCount: created.length,
      updatedCount: updated.length,
      failedCount: failed.length,
      importedProductIds,
    });
  } catch (err) {
    console.error('[import] recordBatchCounters failed', err);
  }

  return NextResponse.json({
    created,
    updated,
    failed,
    batch: { documentId: batchDocumentId },
  });
}