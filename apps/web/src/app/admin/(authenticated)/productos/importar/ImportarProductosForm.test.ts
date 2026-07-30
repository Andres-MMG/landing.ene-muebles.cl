import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import {
  EXCEL_HEADERS,
  IMPORT_CHUNK_SIZE,
  PREVIEW_LIMIT,
  chunkRows,
  getWarningEntries,
  importRowsInChunks,
  parseProductWorkbook,
} from './ImportarProductosForm';
import type { ImportResponse } from '@/lib/admin/strapi-admin';

const base = [
  'CAT-001', 'Silla escolar', 'Silla', 'Escolar', 'Sillas', 'Resistente',
  'Sala de clases', 'Azul', 'Polipropileno', 2, 'alta', 'Catálogo 2025', 'Revisada',
];

function workbook(rows: unknown[][]): ArrayBuffer {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([[...EXCEL_HEADERS], ...rows]), 'Productos');
  return XLSX.write(book, { type: 'array', bookType: 'xlsx' });
}

function buildPreviewRows(count: number): ReturnType<typeof parseProductWorkbook> extends Promise<infer T> ? T : never {
  return Array.from({ length: count }, (_, index) => ({
    rowIndex: index + 2,
    values: { externalId: `CAT-${index + 1}`, name: `Producto ${index + 1}`, subcategory: 'Sillas' },
    warnings: index === 0 ? ['certeza faltante o desconocida'] : [],
    categoryName: 'Escolar',
    errors: [],
  })) as never;
}

describe('parseProductWorkbook', () => {
  it('maps three Spanish-header rows without warnings', async () => {
    const rows = await parseProductWorkbook(workbook([
      base,
      ['CAT-002', 'Mesa escolar', 'Mesa', 'Escolar', 'Mesas', 'Amplia', 'Sala', 'Gris', 'Melamina', 3, 'alta', 'Catálogo', ''],
      ['CAT-003', 'Banca patio', 'Banca', 'Escolar', 'Bancas', 'Exterior', 'Patio', 'Verde', 'Acero', 4, 'alta', 'Catálogo', ''],
    ]));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ categoryName: 'Escolar', values: { name: 'Silla escolar', productType: 'Silla', externalId: 'CAT-001' }, warnings: [] });
  });

  it('surfaces unknown confidence while preserving the row', async () => {
    const row = [...base]; row[10] = 'incierta';
    const [parsed] = await parseProductWorkbook(workbook([row]));
    expect(parsed.values.confidence).toBe('revision-manual');
    expect(parsed.warnings).toContain('certeza faltante o desconocida');
  });

  it('keeps optional empty cells undefined', async () => {
    const row = [...base]; row[6] = ''; row[7] = ''; row[8] = ''; row[11] = ''; row[12] = '';
    const [parsed] = await parseProductWorkbook(workbook([row]));
    expect(parsed.values).not.toHaveProperty('usageEnvironment');
    expect(parsed.values).not.toHaveProperty('source');
  });

  it('returns no rows for a header-only sheet', async () => {
    expect(await parseProductWorkbook(workbook([]))).toEqual([]);
  });

  it('is deterministic across reparses', async () => {
    const data = workbook([base]);
    expect(await parseProductWorkbook(data)).toEqual(await parseProductWorkbook(data));
  });
});

describe('chunkRows', () => {
  it('splits a 60-row batch into 3 chunks of 20', () => {
    const rows = Array.from({ length: 60 }, (_, index) => index);
    const chunks = chunkRows(rows);
    expect(chunks).toHaveLength(3);
    expect(chunks.map((chunk) => chunk.length)).toEqual([20, 20, 20]);
    expect(chunks[2][chunks[2].length - 1]).toBe(59);
    expect(IMPORT_CHUNK_SIZE).toBe(20);
  });
});

describe('importRowsInChunks', () => {
  it('POSTs each chunk sequentially and aggregates the response', async () => {
    const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
    const responses: ImportResponse[] = [
      {
        created: [{ index: 2 }, { index: 3 }, { index: 4 }],
        updated: [{ index: 5 }],
        failed: [],
      },
      {
        created: [{ index: 22 }],
        updated: [{ index: 23 }],
        failed: [{ index: 24, error: 'Strapi 500', warnings: ['precio faltante'] }],
      },
      {
        created: [{ index: 42 }, { index: 43 }],
        updated: [],
        failed: [],
      },
    ];
    responses.forEach((payload) => {
      fetcher.mockResolvedValueOnce(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const rows = buildPreviewRows(60);
    const onProgress = vi.fn();
    const aggregate = await importRowsInChunks(rows, {
      signal: new AbortController().signal,
      fetcher: fetcher as unknown as typeof fetch,
      onProgress,
    });

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBeDefined();
    const firstPayload = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string);
    expect(firstPayload.rows).toHaveLength(20);
    expect(firstPayload.rows[0]).toMatchObject({ sourceIndex: 2 });

    expect(aggregate.created.map((row) => row.index)).toEqual([2, 3, 4, 22, 42, 43]);
    expect(aggregate.updated.map((row) => row.index)).toEqual([5, 23]);
    expect(aggregate.failed.map((row) => row.index)).toEqual([24]);
    expect(getWarningEntries(aggregate)).toEqual([
      { index: 24, message: 'precio faltante' },
    ]);
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress.mock.calls[2]?.[0]).toEqual({ processed: 60, total: 60 });
  });

  it('aborts the remaining chunks when the signal fires mid-batch', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockImplementationOnce(async () => {
        controller.abort();
        throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      })
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ created: [], updated: [], failed: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const rows = buildPreviewRows(45);
    await expect(
      importRowsInChunks(rows, {
        signal: controller.signal,
        fetcher: fetcher as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('surfaces a chunk-level HTTP error and stops the batch', async () => {
    const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Strapi caído' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ created: [], updated: [], failed: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const rows = buildPreviewRows(40);
    await expect(
      importRowsInChunks(rows, {
        signal: new AbortController().signal,
        fetcher: fetcher as unknown as typeof fetch,
      })
    ).rejects.toThrow('Strapi caído');

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('preview limit', () => {
  it('exports PREVIEW_LIMIT as 10', () => {
    expect(PREVIEW_LIMIT).toBe(10);
  });
});