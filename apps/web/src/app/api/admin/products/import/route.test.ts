import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'mock-session-token' }),
  }),
}));

vi.mock('@/lib/admin/session', () => ({
  getServerSession: vi.fn().mockResolvedValue({ sub: 'admin-1', role: 'owner' }),
}));

vi.mock('@/lib/admin/strapi-admin', async () => {
  const actual = await vi.importActual<typeof import('@/lib/admin/strapi-admin')>(
    '@/lib/admin/strapi-admin'
  );
  return {
    ...actual,
    getStrapiAdminToken: vi.fn().mockReturnValue('mock-strapi-token'),
  };
});

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  process.env.STRAPI_INTERNAL_URL = 'http://localhost:1337';
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

type FetchCall = { url: string; init?: RequestInit };

const mockFetchOnce = (status: number, body: unknown) => {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
};

/** S2b — every successful test request triggers three bookkeeping
 *  fetches in addition to whatever the row pipeline does:
 *    1. GET /api/admin-users/:documentId  (resolve uploadedByEmail)
 *    2. POST /api/import-batches          (create audit-trail record)
 *    3. PUT /api/import-batches/:docId    (write counters at the end)
 *  Call this once at the top of each test, then optionally append
 *  the PUT at the bottom (mockBatchCountersPut). Returns the mocked
 *  batch documentId so tests can correlate. */
const mockBatchSetup = (documentId = 'doc-batch') => {
  mockFetchOnce(200, { data: { email: 'admin@ene-muebles.cl' } });
  mockFetchOnce(200, { data: { documentId } });
  return documentId;
};

const mockBatchCountersPut = (documentId = 'doc-batch') => {
  mockFetchOnce(200, { data: { documentId } });
};

const fetchCalls = (): FetchCall[] => {
  const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock
    .calls as Array<[string, RequestInit?]>;
  return calls.map(([url, init]) => ({ url, init }));
};

const readJson = async (res: Response) => (await res.json()) as unknown;

const callPost = async (rows: unknown[], extraHeaders: Record<string, string> = {}) => {
  const { POST } = await import('./route');
  const req = new Request('http://localhost/api/admin/products/import', {
    method: 'POST',
    body: JSON.stringify({ rows }),
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
  return POST(req as unknown as Parameters<typeof POST>[0]);
};

const row = (
  values: Record<string, unknown>,
  categoryName?: string
): unknown => ({
  values,
  warnings: [],
  ...(categoryName ? { categoryName } : {}),
});

// ---------------------------------------------------------------------------
// Auth + validation
// ---------------------------------------------------------------------------

describe('POST /api/admin/products/import — auth', () => {
  it('returns 401 when the admin session is missing', async () => {
    const session = await import('@/lib/admin/session');
    (session.getServerSession as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null);
    const res = await callPost([
      row({ externalId: 'CAT-1', name: 'Silla' }, 'Escolar'),
    ]);
    expect(res.status).toBe(401);
    expect(await readJson(res)).toEqual({ error: 'Unauthorized' });
  });
});

describe('POST /api/admin/products/import — role guard', () => {
  it('returns 403 when the admin role is client', async () => {
    const session = await import('@/lib/admin/session');
    (session.getServerSession as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ sub: 'admin-1', role: 'client' });
    const res = await callPost([
      row({ externalId: 'CAT-1', name: 'Silla' }, 'Escolar'),
    ]);
    expect(res.status).toBe(403);
    expect(await readJson(res)).toEqual({ error: 'Forbidden' });
  });

  it('returns 200 when the admin role is owner', async () => {
    // Default mock session is role: 'owner' — body parse + minimal happy path.
    mockBatchSetup();
    mockFetchOnce(200, { data: [] }); // bulk dedup GET — no matches
    mockFetchOnce(200, { data: [] }); // cat GET (Escolar, miss)
    mockFetchOnce(200, { data: { documentId: 'doc-cat' } }); // cat POST
    mockFetchOnce(200, { data: { documentId: 'doc-prod' } }); // product POST
    mockBatchCountersPut();

    const res = await callPost([
      row({ externalId: 'CAT-1', name: 'Silla', description: 's' }, 'Escolar'),
    ]);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/admin/products/import — validation', () => {
  it('returns 400 for empty items', async () => {
    const res = await callPost([]);
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as { error?: string };
    expect(body.error).toBe('Datos inválidos');
  });

  it('returns 400 for a batch over 200 items', async () => {
    const items = Array.from({ length: 201 }, (_, i) =>
      row({ externalId: `CAT-${i}`, name: `Prod ${i}` }, 'Escolar')
    );
    const res = await callPost(items);
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as {
      details?: { issues?: Array<{ message?: string }> };
    };
    expect((body.details?.issues ?? []).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// End-to-end happy path: 3 new + 1 update + 1 row-level failure
// ---------------------------------------------------------------------------

describe('POST /api/admin/products/import — end-to-end (5 rows)', () => {
  it('processes 3 new + 1 update + 1 failure in order, with cached lookups', async () => {
    // S2b — admin-user GET + import-batches POST before the row pipeline.
    mockBatchSetup();
    // 1. bulk dedup GET for /api/products?filters[externalId][$in]=...
    mockFetchOnce(200, {
      data: [
        { externalId: 'CAT-2025-002', documentId: 'doc-existing' },
      ],
    });
    // 2. Category lookup for row 0 "Escolar" (first occurrence): GET by name
    mockFetchOnce(200, { data: [] }); // not found
    // 3. Category create row 0 "Escolar"
    mockFetchOnce(200, { data: { documentId: 'doc-escolar' } });
    // 4. Subcategory lookup row 0 "Sillas y asientos"
    mockFetchOnce(200, { data: [] });
    // 5. Subcategory create row 0 — needs parent (category "Escolar" is cached)
    mockFetchOnce(200, { data: { documentId: 'doc-sub-1' } });
    // 6. Product create row 0 (externalId CAT-2025-001, new)
    mockFetchOnce(200, { data: { documentId: 'doc-prod-1', id: 101 } });

    // 7. Category lookup row 1 "Escolar" — already cached, no fetch
    // 8. Subcategory lookup row 1 — already cached, no fetch
    // 9. Product update row 1 (externalId CAT-2025-002 exists)
    mockFetchOnce(200, { data: { documentId: 'doc-existing', id: 102 } });

    // 10. Product create row 2 (new externalId CAT-2025-003)
    mockFetchOnce(200, { data: { documentId: 'doc-prod-3', id: 103 } });

    // 11. Category lookup row 3 "Oficina" (first occurrence): GET by name
    mockFetchOnce(200, { data: [] });
    // 12. Category create row 3 "Oficina"
    mockFetchOnce(200, { data: { documentId: 'doc-oficina' } });
    // 13. Subcategory lookup row 3 — new sub under Oficina
    mockFetchOnce(200, { data: [] });
    // 14. Subcategory create row 3
    mockFetchOnce(200, { data: { documentId: 'doc-sub-2' } });
    // 15. Product create row 3 (new externalId CAT-2025-004)
    mockFetchOnce(200, { data: { documentId: 'doc-prod-4', id: 104 } });

    // 16. Category lookup row 4 "Escolar" — already cached
    // 17. Subcategory lookup row 4 — cached
    // 18. Product create row 4 — empty name, Strapi rejects with 422
    mockFetchOnce(422, {
      error: {
        status: 422,
        name: 'ValidationError',
        message: 'name must be at least 1 character',
        details: {
          errors: [
            { path: ['name'], message: 'name must be at least 1 character' },
          ],
        },
      },
    });
    // S2b — final PUT that writes the actual counters to the batch.
    mockBatchCountersPut();

    const items = [
      row(
        {
          externalId: 'CAT-2025-001',
          name: 'Silla escolar',
          description: 'Silla sala cuna',
          price: 89000,
          productType: 'Silla',
          subcategory: 'Sillas y asientos',
          confidence: 'alta',
        },
        'Escolar'
      ),
      row(
        {
          externalId: 'CAT-2025-002',
          name: 'Mesa escolar',
          description: 'Mesa institucional',
          price: 150000,
          productType: 'Mesa',
          subcategory: 'Sillas y asientos',
          confidence: 'alta',
        },
        'Escolar'
      ),
      row(
        {
          externalId: 'CAT-2025-003',
          name: 'Escritorio',
          description: 'Escritorio de oficina',
          price: 220000,
          productType: 'Escritorio',
          subcategory: 'Sillas y asientos',
          confidence: 'alta',
        },
        'Escolar'
      ),
      row(
        {
          externalId: 'CAT-2025-004',
          name: 'Silla de oficina',
          description: 'Silla gerencial',
          price: 320000,
          productType: 'Silla',
          subcategory: 'Sillas y oficinas',
          confidence: 'alta',
        },
        'Oficina'
      ),
      row(
        {
          externalId: 'CAT-2025-005',
          name: '',
          description: 'Fila vacía',
          price: 100,
        },
        'Escolar'
      ),
    ];

    const res = await callPost(items);
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as {
      created: Array<{ index: number; documentId?: string }>;
      updated: Array<{ index: number; documentId?: string }>;
      failed: Array<{ index: number; error?: string }>;
    };
    expect(body.created.map((r) => r.index)).toEqual([0, 2, 3]);
    expect(body.updated.map((r) => r.index)).toEqual([1]);
    expect(body.failed).toHaveLength(1);
    expect(body.failed[0].index).toBe(4);
    expect(body.failed[0].error).toMatch(/name must be at least/);

    const calls = fetchCalls();
    // 14 mocked responses above + 3 S2b bookkeeping fetches (admin-user
    // GET + import-batches POST + import-batches PUT) = 17 calls.
    expect(calls).toHaveLength(17);
    // PUT was sent for the existing externalId plus the batch PUT at the end.
    const puts = calls.filter((c) => (c.init?.method ?? 'GET') === 'PUT');
    const posts = calls.filter((c) => c.init?.method === 'POST');
    expect(puts).toHaveLength(2);
    expect(puts[0].url).toMatch(/\/api\/products\/doc-existing$/);
    // 2 cat POSTs (Escolar + Oficina), 2 sub POSTs, 4 product POSTs,
    // 1 import-batches POST at the start = 9.
    expect(posts).toHaveLength(9);
    const categoryPosts = posts.filter((c) => c.url.endsWith('/api/categories'));
    expect(categoryPosts).toHaveLength(2); // Escolar + Oficina (each created exactly once)
  });
});

// ---------------------------------------------------------------------------
// Mixed batch — PUT vs POST paths
// ---------------------------------------------------------------------------

describe('POST /api/admin/products/import — mixed batch', () => {
  it('PUTs existing products and POSTs new ones in the same batch', async () => {
    mockBatchSetup();
    mockFetchOnce(200, {
      data: [
        { externalId: 'CAT-A', documentId: 'doc-A' },
        { externalId: 'CAT-B', documentId: 'doc-B' },
      ],
    });
    mockFetchOnce(200, { data: [{ documentId: 'doc-escolar' }] });
    mockFetchOnce(200, { data: { documentId: 'doc-A' } });
    mockFetchOnce(200, { data: { documentId: 'doc-B' } });
    mockFetchOnce(200, { data: { documentId: 'doc-C' } });
    mockFetchOnce(200, { data: { documentId: 'doc-D' } });
    mockBatchCountersPut();

    const items = [
      row({ externalId: 'CAT-A', name: 'A', description: 'a' }, 'Escolar'),
      row({ externalId: 'CAT-B', name: 'B', description: 'b' }, 'Escolar'),
      row({ externalId: 'CAT-C', name: 'C', description: 'c' }, 'Escolar'),
      row({ externalId: 'CAT-D', name: 'D', description: 'd' }, 'Escolar'),
    ];
    const res = await callPost(items);
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as {
      created: Array<{ index: number }>;
      updated: Array<{ index: number }>;
      failed: unknown[];
    };
    expect(body.updated.map((r) => r.index)).toEqual([0, 1]);
    expect(body.created.map((r) => r.index)).toEqual([2, 3]);
    expect(body.failed).toEqual([]);

    const calls = fetchCalls();
    // 2 product PUTs + 1 import-batches PUT (S2b).
    expect(calls.filter((c) => c.init?.method === 'PUT')).toHaveLength(3);
    // 2 product POSTs + 1 import-batches POST (S2b).
    expect(calls.filter((c) => c.init?.method === 'POST')).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// All-new batch — spec scenario (2 categories + 1 subcategory auto-created)
// ---------------------------------------------------------------------------

describe('POST /api/admin/products/import — all-new batch', () => {
  it('auto-creates 2 categories + 1 subcategory and returns 3 created rows', async () => {
    mockBatchSetup();
    mockFetchOnce(200, { data: [] }); // bulk dedup GET — no matches
    // Row 0: Escolar category GET (miss) + POST
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: { documentId: 'doc-escolar' } });
    // Row 0: subcategory "Sillas y asientos" GET (miss) + POST
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: { documentId: 'doc-sub' } });
    // Row 0: product POST
    mockFetchOnce(200, { data: { documentId: 'doc-p-0' } });
    // Row 1: Escolar cached, subcategory cached, product POST
    mockFetchOnce(200, { data: { documentId: 'doc-p-1' } });
    // Row 2: Oficina category GET (miss) + POST
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: { documentId: 'doc-oficina' } });
    // Row 2 subcategory: different cache key (Sillas|Oficina), GET (miss) + POST
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: { documentId: 'doc-sub-ofi' } });
    // Row 2: product POST
    mockFetchOnce(200, { data: { documentId: 'doc-p-2' } });
    // S2b — final PUT that writes the actual counters to the batch.
    mockBatchCountersPut();

    const items = [
      row(
        { externalId: 'CAT-1', name: 'Silla', description: 's', subcategory: 'Sillas' },
        'Escolar'
      ),
      row(
        { externalId: 'CAT-2', name: 'Mesa', description: 'm', subcategory: 'Sillas' },
        'Escolar'
      ),
      row(
        { externalId: 'CAT-3', name: 'Escritorio', description: 'e', subcategory: 'Sillas' },
        'Oficina'
      ),
    ];
    const res = await callPost(items);
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as {
      created: Array<{ index: number }>;
      updated: unknown[];
      failed: unknown[];
    };
    expect(body.created.map((r) => r.index)).toEqual([0, 1, 2]);
    expect(body.updated).toEqual([]);
    expect(body.failed).toEqual([]);

    const calls = fetchCalls();
    // 2 categories auto-created (Escolar + Oficina), each exactly once.
    expect(
      calls.filter(
        (c) => c.url.endsWith('/api/categories') && c.init?.method === 'POST'
      )
    ).toHaveLength(2);
    // Subcategory cache key is `Sillas|<parent>` so the same name under
    // two different parents produces two creations.
    expect(
      calls.filter(
        (c) => c.url.endsWith('/api/subcategories') && c.init?.method === 'POST'
      )
    ).toHaveLength(2);
    // 3 product POSTs (all-new batch).
    expect(
      calls.filter(
        (c) =>
          c.url.endsWith('/api/products') &&
          c.init?.method === 'POST'
      )
    ).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Row-level failure isolation
// ---------------------------------------------------------------------------

describe('POST /api/admin/products/import — warnings pass-through', () => {
  it('copies per-row warnings and the original source index into the response', async () => {
    mockBatchSetup();
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: { documentId: 'doc-cat' } });
    mockFetchOnce(200, { data: { documentId: 'doc-p-0' } });
    mockFetchOnce(422, {
      error: {
        status: 422,
        name: 'ValidationError',
        message: 'name must not be empty',
        details: { errors: [{ path: ['name'], message: 'must not be empty' }] },
      },
    });
    mockBatchCountersPut();

    const res = await callPost([
      {
        values: { externalId: 'CAT-1', name: 'Silla', description: 's', price: 0 },
        warnings: ['precio faltante'],
        categoryName: 'Escolar',
        sourceIndex: 7,
      },
      {
        values: { externalId: 'CAT-2', name: '', description: 'bad row' },
        warnings: ['precio faltante'],
        categoryName: 'Escolar',
        sourceIndex: 9,
      },
    ]);
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as {
      created: Array<{ index: number; warnings?: string[] }>;
      failed: Array<{ index: number; warnings?: string[] }>;
    };
    expect(body.created[0]).toMatchObject({
      index: 7,
      warnings: ['precio faltante'],
    });
    expect(body.failed[0]).toMatchObject({
      index: 9,
      warnings: ['precio faltante'],
    });
  });
});

describe('POST /api/admin/products/import — row-level failure', () => {
  it('surfaces an upstream 422 in failed[] but lets other rows continue', async () => {
    mockBatchSetup();
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: [] }); // cat GET
    mockFetchOnce(200, { data: { documentId: 'doc-cat' } }); // cat POST
    mockFetchOnce(200, { data: { documentId: 'doc-p-0' } }); // product 0 POST
    mockFetchOnce(422, {
      error: {
        status: 422,
        name: 'ValidationError',
        message: 'name must not be empty',
        details: { errors: [{ path: ['name'], message: 'must not be empty' }] },
      },
    }); // product 1 (empty name) — Strapi rejects
    mockFetchOnce(200, { data: { documentId: 'doc-p-2' } }); // product 2 POST
    mockBatchCountersPut();

    const items = [
      row({ externalId: 'CAT-1', name: 'Silla', description: 's' }, 'Escolar'),
      row({ externalId: 'CAT-2', name: '', description: 'bad row' }, 'Escolar'),
      row({ externalId: 'CAT-3', name: 'Mesa', description: 'm' }, 'Escolar'),
    ];
    const res = await callPost(items);
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as {
      created: Array<{ index: number }>;
      failed: Array<{ index: number; error?: string }>;
    };
    expect(body.created.map((r) => r.index)).toEqual([0, 2]);
    expect(body.failed).toHaveLength(1);
    expect(body.failed[0].index).toBe(1);
    expect(body.failed[0].error).toMatch(/name must not be empty/);
  });
});

// ---------------------------------------------------------------------------
// Category dedupe — same category used by multiple rows
// ---------------------------------------------------------------------------

describe('POST /api/admin/products/import — category cache', () => {
  it('only POSTs a category once when two rows reference the same new name', async () => {
    mockBatchSetup();
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: { documentId: 'doc-escolar' } });
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: { documentId: 'doc-sub' } });
    mockFetchOnce(200, { data: { documentId: 'doc-prod-1' } });
    // Row 1: Escolar cached, no category fetch
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: { documentId: 'doc-sub' } });
    mockFetchOnce(200, { data: { documentId: 'doc-prod-2' } });
    mockBatchCountersPut();

    const items = [
      row(
        { externalId: 'CAT-1', name: 'Silla', description: 's', subcategory: 'Sillas' },
        'Escolar'
      ),
      row(
        { externalId: 'CAT-2', name: 'Mesa', description: 'm', subcategory: 'Mesas' },
        'Escolar'
      ),
    ];
    const res = await callPost(items);
    expect(res.status).toBe(200);

    const calls = fetchCalls();
    const categoryPosts = calls.filter(
      (c) => c.url.endsWith('/api/categories') && c.init?.method === 'POST'
    );
    expect(categoryPosts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// S2b — import traceability (ImportBatch audit-trail record)
// ---------------------------------------------------------------------------

describe('POST /api/admin/products/import — ImportBatch audit-trail (S2b)', () => {
  it('creates exactly one ImportBatch record before processing any row', async () => {
    mockBatchSetup('doc-batch-1');
    mockFetchOnce(200, { data: [] }); // bulk dedup GET
    mockFetchOnce(200, { data: [] }); // cat GET
    mockFetchOnce(200, { data: { documentId: 'doc-cat' } }); // cat POST
    mockFetchOnce(200, { data: { documentId: 'doc-p-0', id: 100 } }); // product POST
    mockBatchCountersPut('doc-batch-1');

    const res = await callPost(
      [row({ externalId: 'CAT-1', name: 'Silla', description: 's' }, 'Escolar')],
      { 'x-import-file-name': 'catalogo_productos_202.xlsx' }
    );
    expect(res.status).toBe(200);

    const calls = fetchCalls();
    const importBatchPosts = calls.filter(
      (c) => c.url.endsWith('/api/import-batches') && c.init?.method === 'POST'
    );
    expect(importBatchPosts).toHaveLength(1);
    const batchBody = JSON.parse(String(importBatchPosts[0]?.init?.body)) as {
      data: { uploadedAt?: unknown };
    };
    expect(batchBody.data.uploadedAt).toEqual(expect.any(String));
    expect(batchBody.data.uploadedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
    // Order matters: the batch POST must happen BEFORE the bulk dedup
    // GET (which is the first row-pipeline fetch).
    const batchPostIdx = calls.findIndex(
      (c) => c.url.endsWith('/api/import-batches') && c.init?.method === 'POST'
    );
    const bulkDedupIdx = calls.findIndex(
      (c) => c.url.includes('/api/products?filters[externalId][$in]')
    );
    expect(batchPostIdx).toBeGreaterThanOrEqual(0);
    expect(bulkDedupIdx).toBeGreaterThanOrEqual(0);
    expect(batchPostIdx).toBeLessThan(bulkDedupIdx);

    // Counters PUT must happen at the end (after all product writes).
    const lastCall = calls[calls.length - 1];
    expect(lastCall.url).toMatch(/\/api\/import-batches\/doc-batch-1$/);
    expect(lastCall.init?.method).toBe('PUT');
  });

  it('sets importSource: imported on every created product via POST /api/products body', async () => {
    mockBatchSetup();
    mockFetchOnce(200, { data: [] }); // bulk dedup GET
    mockFetchOnce(200, { data: [{ documentId: 'doc-escolar' }] }); // cat GET (cache hit)
    mockFetchOnce(200, { data: { documentId: 'doc-p-0', id: 200 } }); // product 0 POST
    mockFetchOnce(200, { data: { documentId: 'doc-p-1', id: 201 } }); // product 1 POST
    mockBatchCountersPut();

    await callPost([
      row({ externalId: 'CAT-1', name: 'Silla', description: 's' }, 'Escolar'),
      row({ externalId: 'CAT-2', name: 'Mesa', description: 'm' }, 'Escolar'),
    ]);

    const productPosts = fetchCalls().filter(
      (c) => c.url.endsWith('/api/products') && c.init?.method === 'POST'
    );
    expect(productPosts).toHaveLength(2);
    for (const c of productPosts) {
      const body = JSON.parse(String(c.init?.body)) as { data: Record<string, unknown> };
      expect(body.data.importSource).toBe('imported');
    }
  });

  it('links every created product to the batch via importBatch.connect', async () => {
    mockBatchSetup('doc-batch-link');
    mockFetchOnce(200, { data: [] }); // bulk dedup GET
    mockFetchOnce(200, { data: [{ documentId: 'doc-escolar' }] });
    mockFetchOnce(200, { data: { documentId: 'doc-p-0', id: 300 } }); // product POST
    mockFetchOnce(200, { data: { documentId: 'doc-p-1', id: 301 } }); // product PUT (existing)
    mockBatchCountersPut('doc-batch-link');

    // Use a known externalId so row 1 hits PUT (updates an existing product).
    mockFetchOnce(200, {
      data: [{ externalId: 'CAT-2', documentId: 'doc-existing-2' }],
    });

    const res = await callPost([
      row({ externalId: 'CAT-1', name: 'Silla', description: 's' }, 'Escolar'),
      row({ externalId: 'CAT-2', name: 'Mesa', description: 'm' }, 'Escolar'),
    ]);
    expect(res.status).toBe(200);

    const productWrites = fetchCalls().filter(
      (c) =>
        (c.url.endsWith('/api/products') && c.init?.method === 'POST') ||
        /\/api\/products\/doc-existing-2$/.test(c.url)
    );
    expect(productWrites).toHaveLength(2);
    for (const c of productWrites) {
      const body = JSON.parse(String(c.init?.body)) as {
        data: { importBatch?: { connect?: string[] } };
      };
      expect(body.data.importBatch).toEqual({
        connect: ['doc-batch-link'],
      });
    }
  });

  it('records the correct counters (totalRows, createdCount, updatedCount, failedCount) on the batch PUT', async () => {
    mockBatchSetup('doc-batch-counters');
    mockFetchOnce(200, {
      data: [{ externalId: 'CAT-2', documentId: 'doc-existing' }],
    });
    mockFetchOnce(200, { data: [] }); // cat GET
    mockFetchOnce(200, { data: { documentId: 'doc-cat' } }); // cat POST
    mockFetchOnce(200, { data: { documentId: 'doc-p-1', id: 401 } }); // product 1 POST
    mockFetchOnce(200, { data: { documentId: 'doc-existing', id: 402 } }); // product 2 PUT (CAT-2 exists)
    mockFetchOnce(422, {
      error: {
        status: 422,
        name: 'ValidationError',
        message: 'name must be at least 1 character',
        details: { errors: [{ path: ['name'], message: 'name must be at least 1 character' }] },
      },
    }); // product 3 (empty name) — Strapi rejects
    mockBatchCountersPut('doc-batch-counters');

    const res = await callPost([
      row({ externalId: 'CAT-1', name: 'Silla', description: 's' }, 'Escolar'),
      row({ externalId: 'CAT-2', name: 'Mesa', description: 'm' }, 'Escolar'),
      row({ externalId: 'CAT-3', name: '', description: 'bad' }, 'Escolar'),
    ]);
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as {
      created: unknown[];
      updated: unknown[];
      failed: unknown[];
    };
    expect(body.created).toHaveLength(1);
    expect(body.updated).toHaveLength(1);
    expect(body.failed).toHaveLength(1);

    // Inspect the PUT to /api/import-batches/doc-batch-counters.
    const countersPut = fetchCalls().find(
      (c) => /\/api\/import-batches\/doc-batch-counters$/.test(c.url)
    );
    expect(countersPut).toBeDefined();
    expect(countersPut?.init?.method).toBe('PUT');
    const putBody = JSON.parse(String(countersPut?.init?.body)) as {
      data: Record<string, unknown>;
    };
    expect(putBody.data.totalRows).toBe(3);
    expect(putBody.data.createdCount).toBe(1);
    expect(putBody.data.updatedCount).toBe(1);
    expect(putBody.data.failedCount).toBe(1);
    expect(Array.isArray(putBody.data.importedProductIds)).toBe(true);
    expect((putBody.data.importedProductIds as number[]).length).toBe(2); // 1 created + 1 updated
  });

  it('falls back to fileName "unknown.xlsx" when no x-import-file-name header is provided', async () => {
    mockBatchSetup();
    mockFetchOnce(200, { data: [] }); // bulk dedup GET
    mockFetchOnce(200, { data: [{ documentId: 'doc-escolar' }] });
    mockFetchOnce(200, { data: { documentId: 'doc-p', id: 500 } });
    mockBatchCountersPut();

    const res = await callPost([
      row({ externalId: 'CAT-1', name: 'Silla', description: 's' }, 'Escolar'),
    ]);
    expect(res.status).toBe(200);

    const batchPost = fetchCalls().find(
      (c) => c.url.endsWith('/api/import-batches') && c.init?.method === 'POST'
    );
    expect(batchPost).toBeDefined();
    const body = JSON.parse(String(batchPost?.init?.body)) as {
      data: { fileName: string };
    };
    expect(body.data.fileName).toBe('unknown.xlsx');
  });

  it('uses the x-import-file-name header value when present', async () => {
    mockBatchSetup();
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: [{ documentId: 'doc-escolar' }] });
    mockFetchOnce(200, { data: { documentId: 'doc-p', id: 600 } });
    mockBatchCountersPut();

    const res = await callPost(
      [row({ externalId: 'CAT-1', name: 'Silla', description: 's' }, 'Escolar')],
      { 'x-import-file-name': 'catalogo_productos_202.xlsx' }
    );
    expect(res.status).toBe(200);

    const batchPost = fetchCalls().find(
      (c) => c.url.endsWith('/api/import-batches') && c.init?.method === 'POST'
    );
    expect(batchPost).toBeDefined();
    const body = JSON.parse(String(batchPost?.init?.body)) as {
      data: { fileName: string };
    };
    expect(body.data.fileName).toBe('catalogo_productos_202.xlsx');
  });

  it('returns response.batch.documentId carrying the created batch id', async () => {
    mockBatchSetup('doc-batch-response');
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: [{ documentId: 'doc-escolar' }] });
    mockFetchOnce(200, { data: { documentId: 'doc-p', id: 700 } });
    mockBatchCountersPut('doc-batch-response');

    const res = await callPost([
      row({ externalId: 'CAT-1', name: 'Silla', description: 's' }, 'Escolar'),
    ]);
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as {
      batch?: { documentId?: string };
    };
    expect(body.batch?.documentId).toBe('doc-batch-response');
  });

  it('every row in created/updated carries importSource: imported', async () => {
    mockBatchSetup();
    mockFetchOnce(200, { data: [] });
    mockFetchOnce(200, { data: [{ documentId: 'doc-escolar' }] });
    mockFetchOnce(200, { data: { documentId: 'doc-p-0', id: 800 } });
    mockFetchOnce(200, { data: { documentId: 'doc-p-1', id: 801 } });
    mockBatchCountersPut();

    const res = await callPost([
      row({ externalId: 'CAT-1', name: 'Silla', description: 's' }, 'Escolar'),
      row({ externalId: 'CAT-2', name: 'Mesa', description: 'm' }, 'Escolar'),
    ]);
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as {
      created: Array<{ importSource?: string }>;
      updated: Array<{ importSource?: string }>;
      failed: Array<{ importSource?: string }>;
    };
    expect(body.created).toHaveLength(2);
    expect(body.updated).toHaveLength(0);
    expect(body.failed).toHaveLength(0);
    for (const r of body.created) {
      expect(r.importSource).toBe('imported');
    }
  });
});
