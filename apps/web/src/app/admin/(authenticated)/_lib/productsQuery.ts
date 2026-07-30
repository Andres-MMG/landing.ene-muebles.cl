/**
 * Catalog-import (E follow-up) — pure helper that produces the
 * `filters[importBatch][documentId][$eq]=…` pair for the admin
 * product list when the dashboard is loaded with
 * `?importBatch=<documentId>` (linked from `/admin/importaciones`).
 * Returns `null` when no filter is requested so the caller can keep
 * the legacy unfiltered path with zero string-build overhead.
 */
export function buildImportBatchFilter(
  importBatch?: string | string[] | null
): { key: string; value: string } | null {
  const raw = Array.isArray(importBatch) ? importBatch[0] : importBatch;
  if (!raw) return null;
  return {
    key: 'filters[importBatch][documentId][$eq]',
    value: raw,
  };
}
