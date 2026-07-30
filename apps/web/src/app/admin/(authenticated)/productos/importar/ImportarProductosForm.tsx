'use client';

import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  mapExcelRowToProduct,
  type MapExcelRowResult,
} from '@/app/api/admin/products/_lib/parseExcelRow';
import type { ImportResponse } from '@/lib/admin/strapi-admin';

export const EXCEL_HEADERS = [
  'ID',
  'Producto',
  'Qué es',
  'Categoría',
  'Subcategoría',
  'Descripción',
  'Uso / ambiente',
  'Color observable',
  'Material / acabado observable',
  'Página PDF',
  'Certeza',
  'Fuente',
  'Observación',
] as const;

const REQUIRED_HEADERS = ['ID', 'Producto', 'Categoría', 'Subcategoría', 'Certeza'];
export const IMPORT_CHUNK_SIZE = 20;
export const PREVIEW_LIMIT = 10;

export type PreviewRow = MapExcelRowResult & {
  rowIndex: number;
  categoryName?: string;
  errors: string[];
};

type ImportProgress = {
  processed: number;
  total: number;
};

type ImportFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

type ImportRowsOptions = {
  signal: AbortSignal;
  fetcher?: ImportFetcher;
  onProgress?: (progress: ImportProgress) => void;
};

export async function parseProductWorkbook(data: ArrayBuffer): Promise<PreviewRow[]> {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('El archivo no contiene hojas.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: undefined,
  });
  const headers = (matrix[0] ?? []).map((value) => String(value ?? '').trim());
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) throw new Error(`Falta la columna '${required}'.`);
  }
  return matrix.slice(1).map((cells, index) => {
    const raw = Object.fromEntries(headers.map((header, column) => [header, cells[column]]));
    const mapped = mapExcelRowToProduct(raw);
    const errors: string[] = [];
    if (!mapped.values.externalId) errors.push('Falta ID');
    if (!mapped.values.name) errors.push('Falta Producto');
    const categoryName = text(raw['Categoría']);
    if (!categoryName) errors.push('Falta Categoría');
    if (!mapped.values.subcategory) errors.push('Falta Subcategoría');
    return { ...mapped, rowIndex: index + 2, categoryName, errors };
  });
}

function text(value: unknown): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  return normalized || undefined;
}

export function chunkRows<T>(rows: T[], chunkSize = IMPORT_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }
  return chunks;
}

function createAbortError(): Error {
  const error = new Error('Importación cancelada.');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw createAbortError();
}

function isImportResponse(value: unknown): value is ImportResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  return ['created', 'updated', 'failed'].every((key) => Array.isArray(response[key]));
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === 'string' && message) return message;
  }
  return `No se pudo procesar el bloque (HTTP ${status}).`;
}

export async function importRowsInChunks(
  rows: PreviewRow[],
  { signal, fetcher = fetch, onProgress }: ImportRowsOptions
): Promise<ImportResponse> {
  const aggregate: ImportResponse = { created: [], updated: [], failed: [] };
  const chunks = chunkRows(rows);

  for (const [chunkIndex, chunk] of chunks.entries()) {
    throwIfAborted(signal);
    const response = await fetcher('/api/admin/products/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: chunk.map(({ values, warnings, categoryName, rowIndex }) => ({
          values,
          warnings,
          categoryName,
          sourceIndex: rowIndex,
        })),
      }),
      signal,
    });
    const payload = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) throw new Error(errorMessage(payload, response.status));
    if (!isImportResponse(payload)) throw new Error('Respuesta inválida del servidor.');

    aggregate.created.push(...payload.created);
    aggregate.updated.push(...payload.updated);
    aggregate.failed.push(...payload.failed);
    onProgress?.({
      processed: Math.min((chunkIndex + 1) * IMPORT_CHUNK_SIZE, rows.length),
      total: rows.length,
    });
  }

  return aggregate;
}

export type WarningEntry = {
  index: number;
  message: string;
};

export function getWarningEntries(response: ImportResponse): WarningEntry[] {
  return [...response.created, ...response.updated, ...response.failed].flatMap((row) =>
    (row.warnings ?? []).map((message) => ({ index: row.index, message }))
  );
}

function isAbortError(caught: unknown): boolean {
  return caught instanceof Error && caught.name === 'AbortError';
}

function excelRowLabel(index: number, rows: PreviewRow[]): number {
  return rows.find((row) => row.rowIndex === index)?.rowIndex ?? index + 2;
}

export function ImportarProductosForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ImportResponse>();
  const [progress, setProgress] = useState<ImportProgress>();
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  async function loadFile(file?: File) {
    if (!file) return;
    setError(undefined);
    setResult(undefined);
    setProgress(undefined);
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo supera el límite de 5 MB.');
      return;
    }
    try {
      setRows(await parseProductWorkbook(await file.arrayBuffer()));
    } catch (caught) {
      setRows([]);
      setError(caught instanceof Error ? caught.message : 'No se pudo leer el archivo.');
    }
  }

  async function importRows() {
    const validRows = rows.filter((row) => row.errors.length === 0);
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(true);
    setProgress({ processed: 0, total: validRows.length });
    setResult(undefined);
    setError(undefined);
    try {
      setResult(
        await importRowsInChunks(validRows, {
          signal: controller.signal,
          onProgress: setProgress,
        })
      );
    } catch (caught) {
      setError(isAbortError(caught) ? 'Importación cancelada.' : caught instanceof Error ? caught.message : 'No se pudo importar el catálogo.');
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setPending(false);
    }
  }

  function cancelImport() {
    controllerRef.current?.abort();
  }

  function clear() {
    setRows([]);
    setResult(undefined);
    setProgress(undefined);
    setError(undefined);
    if (inputRef.current) inputRef.current.value = '';
  }

  const validCount = rows.filter((row) => row.errors.length === 0).length;
  const warningEntries = result ? getWarningEntries(result) : [];
  const progressPercent = progress ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <section className="space-y-8">
      <label
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void loadFile(event.dataTransfer.files[0]);
        }}
        className={`block cursor-pointer border p-10 text-center ${
          dragging ? 'border-ink bg-cream-soft' : 'border-ink-line bg-paper-pure'
        }`}
      >
        <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-taupe-deep">
          Archivo de catálogo
        </span>
        <strong className="mt-3 block text-lg">Arrastrá el Excel o seleccioná un archivo</strong>
        <span className="mt-2 block text-sm text-ink-mute">.xlsx, .xls o .csv · máximo 5 MB</span>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          disabled={pending}
          className="sr-only"
          onChange={(event) => void loadFile(event.target.files?.[0])}
        />
      </label>

      {error ? <p role="alert" className="border border-red-800 bg-red-50 p-4 text-sm text-red-900">{error}</p> : null}

      {rows.length ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ink-mute">{rows.length} filas detectadas · {validCount} listas para importar</p>
            <button type="button" onClick={clear} disabled={pending} className="t-label underline underline-offset-4 disabled:opacity-50">Reemplazar archivo</button>
          </div>
          <div className="overflow-x-auto border border-ink-line">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-ink text-paper">
                <tr>{['Fila', 'Producto', 'Categoría', 'Subcategoría', 'Tipo', 'ID', 'Validación', ''].map((heading) => <th key={heading} className="t-mono px-3 py-3 text-[10px] uppercase tracking-[0.16em]">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_LIMIT).map((row) => {
                  const issues = [...row.errors, ...row.warnings];
                  return (
                    <tr key={row.rowIndex} className={`border-t border-ink-line align-top ${row.errors.length ? 'bg-red-50 text-red-950' : ''}`}>
                      <td className="px-3 py-3 font-mono">{row.rowIndex}</td>
                      <td className="px-3 py-3 font-medium">{row.values.name ?? '—'}</td>
                      <td className="px-3 py-3">{row.categoryName ?? '—'}</td>
                      <td className="px-3 py-3">{row.values.subcategory ?? '—'}</td>
                      <td className="px-3 py-3">{row.values.productType ?? '—'}</td>
                      <td className="px-3 py-3 font-mono">{row.values.externalId ?? '—'}</td>
                      <td className="px-3 py-3">{issues.length ? <ul className="space-y-1">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : 'Correcta'}</td>
                      <td className="px-3 py-3"><button type="button" aria-label={`Quitar fila ${row.rowIndex}`} disabled={pending} onClick={() => setRows((current) => current.filter((item) => item.rowIndex !== row.rowIndex))} className="underline underline-offset-4 disabled:opacity-50">Quitar</button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-ink-line bg-paper-soft">
                  <td colSpan={8} className="px-3 py-3 text-sm text-ink-mute">
                    Mostrando {Math.min(PREVIEW_LIMIT, rows.length)} de {rows.length} filas
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {pending && progress ? (
            <div className="space-y-2" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span>Procesando {progress.processed} / {progress.total} ({progressPercent}%)</span>
                <button type="button" onClick={cancelImport} className="t-label underline underline-offset-4">Cancelar</button>
              </div>
              <div className="h-2 bg-ink-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                <div className="h-full bg-ink transition-[width]" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          ) : null}
          {!pending ? <button type="button" disabled={!validCount} onClick={() => void importRows()} className="bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper disabled:opacity-50">Importar {validCount} filas</button> : null}
        </div>
      ) : null}

      {result ? (
        <div role="status" className="border border-ink-line bg-paper-pure p-6">
          <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-taupe-deep">Resultado</p>
          <p className="mt-3 text-xl">{result.created.length} creados · {result.updated.length} actualizados · {result.failed.length} fallidos</p>
          {result.failed.length ? <ul className="mt-4 text-sm text-red-900">{result.failed.map((failure) => <li key={failure.index}>Fila {excelRowLabel(failure.index, rows)}: {failure.error ?? 'Error desconocido'}</li>)}</ul> : null}
          {warningEntries.length ? (
            <details className="mt-4 text-sm text-amber-900">
              <summary className="cursor-pointer font-medium">{warningEntries.length} advertencias</summary>
              <ul className="mt-2 space-y-1 pl-5">{warningEntries.map((warning, index) => <li key={`${warning.index}-${warning.message}-${index}`}>Fila {excelRowLabel(warning.index, rows)}: {warning.message}</li>)}</ul>
            </details>
          ) : null}
          <button type="button" onClick={clear} className="mt-5 t-label underline underline-offset-4">Limpiar</button>
        </div>
      ) : null}
    </section>
  );
}
